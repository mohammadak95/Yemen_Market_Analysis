import { useMemo } from 'react';

// Yemen coordinates mapping for fallback
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
 * Custom hook for calculating cluster efficiency metrics
 * @param {Array} clusters - Raw cluster data
 * @param {Array} flowMaps - Market flow data
 * @returns {Object} Efficiency metrics and enhanced clusters
 */
export const useClusterEfficiency = (clusters, flowMaps) => {
  return useMemo(() => {
    // Debug input parameters
    console.log('useClusterEfficiency input:', {
      hasClusters: Boolean(clusters?.length),
      clustersCount: clusters?.length,
      hasFlowMaps: Boolean(flowMaps?.length),
      flowMapsCount: flowMaps?.length,
      sampleCluster: clusters?.[0],
      sampleFlow: flowMaps?.[0]
    });

    if (!clusters?.length || !flowMaps?.length) {
      return {
        clusters: [],
        metrics: {
          averageEfficiency: 0,
          totalCoverage: 0,
          networkDensity: 0
        }
      };
    }

    try {
      // Process clusters and calculate metrics
      const processedClusters = clusters.map(cluster => {
        const markets = cluster.connected_markets || [];
        if (!markets.length) return null;

        // Get coordinates for each market
        const marketCoordinates = markets.map(marketName => {
          const coords = YEMEN_COORDINATES[marketName.toLowerCase()];
          if (!coords) {
            console.warn(`No coordinates found for market: ${marketName}`);
            return null;
          }
          return coords;
        }).filter(Boolean);

        // Calculate cluster metrics
        const clusterFlows = flowMaps.filter(flow =>
          markets.includes(flow.source) || markets.includes(flow.target)
        );

        const metrics = calculateClusterMetrics(clusterFlows, markets);

        return {
          ...cluster,
          metrics,
          market_count: markets.length,
          markets: markets.map(marketName => ({
            name: marketName,
            coordinates: YEMEN_COORDINATES[marketName.toLowerCase()] || [0, 0]
          }))
        };
      }).filter(Boolean);

      // Calculate overall metrics
      const totalMarkets = new Set(clusters.flatMap(c => c.connected_markets || [])).size;
      const averageEfficiency = processedClusters.reduce(
        (acc, cluster) => acc + (cluster.metrics?.efficiency || 0),
        0
      ) / processedClusters.length;

      const totalCoverage = totalMarkets / Object.keys(YEMEN_COORDINATES).length;
      const networkDensity = calculateNetworkDensity(flowMaps, clusters);

      return {
        clusters: processedClusters,
        metrics: {
          averageEfficiency,
          totalCoverage,
          networkDensity
        }
      };
    } catch (error) {
      console.error('Error in cluster efficiency calculation:', error);
      return {
        clusters: [],
        metrics: {
          averageEfficiency: 0,
          totalCoverage: 0,
          networkDensity: 0
        }
      };
    }
  }, [clusters, flowMaps]);
};

/**
 * Calculate comprehensive metrics for a cluster
 * @param {Array} flows - Flow data for the cluster
 * @param {Array} markets - Markets in the cluster
 * @returns {Object} Cluster metrics including efficiency, connectivity, etc.
 */
const calculateClusterMetrics = (flows, markets) => {
  if (!flows.length || !markets.length) {
    return {
      efficiency: 0,
      internal_connectivity: 0,
      price_convergence: 0,
      stability: 0,
      coverage: 0
    };
  }

  // Calculate internal flows
  const internalFlows = flows.filter(
    flow => markets.includes(flow.source) && markets.includes(flow.target)
  );

  // Calculate internal connectivity
  const maxPossibleConnections = (markets.length * (markets.length - 1)) / 2;
  const actualConnections = internalFlows.length;
  const internal_connectivity = maxPossibleConnections > 0 
    ? actualConnections / maxPossibleConnections 
    : 0;

  // Calculate price convergence using average price differentials
  const avgPriceDiff = internalFlows.reduce((acc, flow) => 
    acc + (flow.avg_price_differential || 0), 0) / (internalFlows.length || 1);
  const price_convergence = Math.max(0, 1 - (avgPriceDiff / 2)); // Normalize to 0-1

  // Calculate flow stability using flow counts
  const avgFlowCount = internalFlows.reduce((acc, flow) => 
    acc + (flow.flow_count || 0), 0) / (internalFlows.length || 1);
  const maxFlowCount = Math.max(...internalFlows.map(f => f.flow_count || 0), 1);
  const stability = avgFlowCount / maxFlowCount;

  // Calculate market coverage
  const coverage = markets.length / Object.keys(YEMEN_COORDINATES).length;

  // Calculate overall efficiency
  const efficiency = (
    internal_connectivity * 0.3 + 
    price_convergence * 0.3 + 
    stability * 0.2 +
    coverage * 0.2
  );

  return {
    efficiency,
    internal_connectivity,
    price_convergence,
    stability,
    coverage
  };
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

export default useClusterEfficiency;
