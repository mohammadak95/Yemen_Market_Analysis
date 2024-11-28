import { useMemo } from 'react';

/**
 * Custom hook for analyzing market clusters and calculating efficiency metrics
 * @param {Array} clusters - Raw cluster data
 * @param {Array} flowMaps - Market flow data
 * @param {Object} geometryData - Geographic data for markets
 * @returns {Object} Processed clusters and metrics
 */
const useClusterAnalysis = (clusters, flowMaps, geometryData) => {
  return useMemo(() => {
    // Debug input parameters
    console.log('useClusterAnalysis detailed input:', {
      hasClusters: Boolean(clusters?.length),
      clustersCount: clusters?.length,
      hasFlowMaps: Boolean(flowMaps?.length),
      flowMapsCount: flowMaps?.length,
      hasGeometryData: Boolean(geometryData),
      hasPoints: Boolean(geometryData?.points?.length),
      pointsCount: geometryData?.points?.length,
      rawClusters: clusters
    });

    // Enhanced initial validation
    if (!clusters?.length || !flowMaps?.length) {
      console.warn('Missing clusters or flowMaps data:', {
        clusters: clusters?.length,
        flowMaps: flowMaps?.length
      });
      return {
        clusters: [],
        metrics: {
          averageEfficiency: 0,
          totalCoverage: 0,
          networkDensity: 0
        },
        error: 'Missing required cluster or flow data',
        isValid: false
      };
    }

    if (!geometryData?.points?.length) {
      console.warn('Invalid or missing geometryData points:', {
        hasGeometryData: Boolean(geometryData),
        hasPoints: Boolean(geometryData?.points),
        pointsCount: geometryData?.points?.length
      });
      return {
        clusters: [],
        metrics: {
          averageEfficiency: 0,
          totalCoverage: 0,
          networkDensity: 0
        },
        error: 'Missing or invalid geometry data',
        isValid: false
      };
    }

    try {
      const points = geometryData.points;
      
      // Process clusters and calculate metrics
      const processedClusters = clusters.map((cluster) => {
        // Debug cluster processing
        console.log('Processing cluster:', {
          clusterId: cluster.cluster_id,
          marketCount: cluster.market_count,
          hasConnectedMarkets: Boolean(cluster.connected_markets?.length),
          connectedMarketsCount: cluster.connected_markets?.length,
          mainMarket: cluster.main_market,
          rawCluster: cluster
        });

        // Get markets from connected_markets array
        const markets = cluster.connected_markets || [];
        if (!markets.length) {
          console.warn('No markets found in cluster:', cluster);
          return null;
        }

        // Calculate cluster center coordinates
        const marketCoords = markets.map(marketId => {
          // Find market in points data
          const point = points.find(p => {
            const normalizedMarketId = marketId?.toLowerCase();
            const normalizedName = p.properties?.normalizedName?.toLowerCase();
            const match = normalizedMarketId === normalizedName;
            if (match) {
              console.log('Found market point:', {
                marketId,
                normalizedName,
                coordinates: p.coordinates
              });
            }
            return match;
          });
          
          if (!point) {
            console.warn(`Market not found in points data: ${marketId}`);
            return null;
          }

          const coords = point.coordinates;
          if (!coords || coords.length !== 2 || !isFinite(coords[0]) || !isFinite(coords[1])) {
            console.warn(`Invalid coordinates for market point: ${marketId}`, coords);
            return null;
          }

          // Return coordinates directly from point data
          return {
            lat: coords[1],
            lon: coords[0]
          };
        }).filter(Boolean);

        // Debug market coordinates
        console.log('Market coordinates found:', {
          totalMarkets: markets.length,
          foundCoordinates: marketCoords.length,
          marketIds: markets,
          coordinates: marketCoords
        });

        if (marketCoords.length === 0) {
          console.warn('No valid coordinates found for cluster:', cluster.cluster_id);
          return null;
        }

        // Calculate average coordinates for cluster center
        const center = marketCoords.reduce(
          (acc, coord) => ({
            lat: acc.lat + coord.lat / marketCoords.length,
            lon: acc.lon + coord.lon / marketCoords.length
          }),
          { lat: 0, lon: 0 }
        );

        // Calculate cluster metrics
        const clusterFlows = flowMaps.filter(flow =>
          markets.includes(flow.source) || markets.includes(flow.target)
        );

        const efficiency = calculateClusterEfficiency(clusterFlows, markets);
        const coverage = markets.length / points.length;

        const processedCluster = {
          cluster_id: cluster.cluster_id,
          market_count: markets.length,
          markets,
          center_lat: center.lat,
          center_lon: center.lon,
          main_market: cluster.main_market,
          metrics: {
            efficiency,
            coverage
          }
        };

        console.log('Processed cluster:', processedCluster);
        return processedCluster;
      }).filter(Boolean); // Remove any null clusters

      // Calculate overall metrics
      const totalMarkets = new Set(clusters.flatMap(c => c.connected_markets || [])).size;

      const averageEfficiency = processedClusters.length > 0 ? 
        processedClusters.reduce(
          (acc, cluster) => acc + cluster.metrics.efficiency,
          0
        ) / processedClusters.length : 
        0;

      const totalCoverage = totalMarkets / points.length;
      const networkDensity = calculateNetworkDensity(flowMaps, clusters);

      // Debug final results
      console.log('Cluster analysis results:', {
        processedClustersCount: processedClusters.length,
        totalMarkets,
        averageEfficiency,
        totalCoverage,
        networkDensity,
        clusterCenters: processedClusters.map(c => ({
          id: c.cluster_id,
          lat: c.center_lat,
          lon: c.center_lon
        }))
      });

      return {
        clusters: processedClusters,
        metrics: {
          averageEfficiency,
          totalCoverage,
          networkDensity
        },
        error: null,
        isValid: true
      };
    } catch (error) {
      console.error('Error in cluster analysis:', error, {
        errorStack: error.stack,
        clusters: clusters?.length,
        flowMaps: flowMaps?.length,
        hasPoints: Boolean(geometryData?.points),
        pointsCount: geometryData?.points?.length
      });
      return {
        clusters: [],
        metrics: {
          averageEfficiency: 0,
          totalCoverage: 0,
          networkDensity: 0
        },
        error: 'Error processing cluster data: ' + error.message,
        isValid: false
      };
    }
  }, [clusters, flowMaps, geometryData]);
};

/**
 * Calculate efficiency score for a cluster based on flow data
 * @param {Array} flows - Flow data for the cluster
 * @param {Array} markets - Markets in the cluster
 * @returns {number} Efficiency score between 0 and 1
 */
const calculateClusterEfficiency = (flows, markets) => {
  if (!flows.length || !markets.length) return 0;

  // Calculate internal flow strength
  const internalFlows = flows.filter(
    flow => markets.includes(flow.source) && markets.includes(flow.target)
  );

  // Calculate efficiency based on flow strength and market connectivity
  const flowStrength = internalFlows.reduce((acc, flow) => acc + (flow.weight || 1), 0);
  const maxPossibleConnections = (markets.length * (markets.length - 1)) / 2;
  const actualConnections = internalFlows.length;

  const connectivityRatio = maxPossibleConnections > 0 
    ? actualConnections / maxPossibleConnections 
    : 0;

  // Normalize flow strength by number of markets
  const normalizedStrength = flowStrength / (markets.length || 1);

  // Combine connectivity and flow strength metrics
  return Math.min(1, (connectivityRatio * 0.6 + normalizedStrength * 0.4));
};

/**
 * Calculate network density across all clusters
 * @param {Array} flows - All flow data
 * @param {Array} clusters - All clusters
 * @returns {number} Network density score between 0 and 1
 */
const calculateNetworkDensity = (flows, clusters) => {
  if (!flows.length || !clusters.length) return 0;

  const totalMarkets = new Set(clusters.flatMap(c => c.connected_markets || [])).size;
  const maxPossibleConnections = Math.max(1, (totalMarkets * (totalMarkets - 1)) / 2);
  const actualConnections = flows.length;

  return Math.min(1, actualConnections / maxPossibleConnections);
};

export default useClusterAnalysis;
