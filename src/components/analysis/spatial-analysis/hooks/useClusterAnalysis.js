import { useMemo } from 'react';

// Fixed coordinates for Yemen markets (same as used in useNetworkAnalysis)
const YEMEN_COORDINATES = {
  'abyan': [45.83, 13.58],
  'aden': [45.03, 12.77],
  'al bayda': [45.57, 14.17],
  'al dhale\'e': [44.73, 13.70],
  'al hudaydah': [42.95, 14.80],
  'al jawf': [45.50, 16.60],
  'al maharah': [51.83, 16.52],
  'al mahwit': [43.55, 15.47],
  'amanat al asimah': [44.21, 15.35],
  'amran': [43.94, 15.66],
  'dhamar': [44.24, 14.54],
  'hadramaut': [48.78, 15.93],
  'hajjah': [43.60, 15.63],
  'ibb': [44.18, 13.97],
  'lahj': [44.88, 13.03],
  'marib': [45.32, 15.47],
  'raymah': [43.71, 14.68],
  'sana\'a': [44.21, 15.35],
  'shabwah': [47.01, 14.53],
  'taizz': [44.02, 13.58],
  'socotra': [53.87, 12.47]
};

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

    try {
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

        // Get coordinates for each market
        const marketCoords = markets.map(marketId => {
          const coords = YEMEN_COORDINATES[marketId.toLowerCase()];
          if (!coords) {
            console.warn(`No coordinates found for market: ${marketId}`);
            return null;
          }
          return {
            lon: coords[0], // longitude
            lat: coords[1]  // latitude
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
        const coverage = markets.length / Object.keys(YEMEN_COORDINATES).length;

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

      const totalCoverage = totalMarkets / Object.keys(YEMEN_COORDINATES).length;
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
        flowMaps: flowMaps?.length
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
