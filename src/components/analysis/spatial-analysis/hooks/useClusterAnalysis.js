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
    console.log('useClusterAnalysis input:', {
      hasClusters: Boolean(clusters?.length),
      clustersCount: clusters?.length,
      hasFlowMaps: Boolean(flowMaps?.length),
      flowMapsCount: flowMaps?.length,
      hasGeometryData: Boolean(geometryData),
      hasUnified: Boolean(geometryData?.unified),
      features: geometryData?.unified?.features ? 'present' : 'missing'
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

    if (!geometryData?.unified?.features) {
      console.warn('Invalid or missing geometryData:', {
        hasGeometryData: Boolean(geometryData),
        hasUnified: Boolean(geometryData?.unified),
        features: geometryData?.unified?.features ? 'present' : 'missing'
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
      const features = geometryData.unified.features;
      
      // Process clusters and calculate metrics
      const processedClusters = clusters.map((cluster, index) => {
        // Debug cluster processing
        console.log('Processing cluster:', {
          clusterId: cluster.id || index,
          marketCount: cluster.markets?.length,
          hasMarkets: Boolean(cluster.markets),
          rawCluster: cluster
        });

        // Ensure markets array exists
        const markets = Array.isArray(cluster.markets) ? cluster.markets :
                       Array.isArray(cluster.nodes) ? cluster.nodes :
                       [];

        // Calculate cluster center coordinates
        const marketCoords = markets.map(marketId => {
          const market = features.find(f => 
            f.properties.market_id === marketId || 
            f.properties.id === marketId ||
            f.properties.normalizedName === marketId
          );
          
          if (!market) {
            console.warn(`Market not found in geometry data: ${marketId}`);
            return null;
          }
          
          return market.geometry.coordinates ? 
            [market.geometry.coordinates[1], market.geometry.coordinates[0]] : 
            null;
        }).filter(Boolean);

        // Debug market coordinates
        console.log('Market coordinates found:', {
          totalMarkets: markets.length,
          foundCoordinates: marketCoords.length,
          marketIds: markets
        });

        // Calculate average coordinates for cluster center
        const center = marketCoords.reduce(
          (acc, coord) => ({
            lat: acc.lat + coord[0] / marketCoords.length,
            lon: acc.lon + coord[1] / marketCoords.length
          }),
          { lat: 0, lon: 0 }
        );

        // Calculate cluster metrics
        const clusterFlows = flowMaps.filter(flow =>
          markets.includes(flow.source) || markets.includes(flow.target)
        );

        const efficiency = calculateClusterEfficiency(clusterFlows, markets);
        const coverage = markets.length / features.length;

        return {
          cluster_id: cluster.id || `cluster_${index}`,
          market_count: markets.length,
          markets,
          center_lat: center.lat,
          center_lon: center.lon,
          main_market: findMainMarket(markets, clusterFlows),
          metrics: {
            efficiency,
            coverage
          }
        };
      });

      // Calculate overall metrics
      const totalMarkets = new Set(clusters.flatMap(c => 
        Array.isArray(c.markets) ? c.markets : 
        Array.isArray(c.nodes) ? c.nodes : 
        []
      )).size;

      const averageEfficiency = processedClusters.reduce(
        (acc, cluster) => acc + cluster.metrics.efficiency,
        0
      ) / processedClusters.length;

      const totalCoverage = totalMarkets / features.length;
      const networkDensity = calculateNetworkDensity(flowMaps, clusters);

      // Debug final results
      console.log('Cluster analysis results:', {
        processedClustersCount: processedClusters.length,
        totalMarkets,
        averageEfficiency,
        totalCoverage,
        networkDensity
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
        hasUnified: Boolean(geometryData?.unified),
        hasFeatures: Boolean(geometryData?.unified?.features)
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

  const totalMarkets = new Set(clusters.flatMap(c => 
    Array.isArray(c.markets) ? c.markets : 
    Array.isArray(c.nodes) ? c.nodes : 
    []
  )).size;

  const maxPossibleConnections = Math.max(1, (totalMarkets * (totalMarkets - 1)) / 2);
  const actualConnections = flows.length;

  return Math.min(1, actualConnections / maxPossibleConnections);
};

/**
 * Find the main market in a cluster based on flow centrality
 * @param {Array} markets - Markets in the cluster
 * @param {Array} flows - Flow data for the cluster
 * @returns {string} ID of the main market
 */
const findMainMarket = (markets, flows) => {
  if (!markets.length) return null;

  // Calculate market centrality based on flow connections
  const marketScores = markets.reduce((acc, marketId) => {
    const marketFlows = flows.filter(
      flow => flow.source === marketId || flow.target === marketId
    );
    
    acc[marketId] = marketFlows.reduce((sum, flow) => sum + (flow.weight || 1), 0);
    return acc;
  }, {});

  // Return market with highest centrality score
  return Object.entries(marketScores)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || markets[0];
};

export default useClusterAnalysis;
