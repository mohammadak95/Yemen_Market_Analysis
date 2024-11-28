import { useMemo } from 'react';
import { 
  transformRegionName, 
  getRegionCoordinates, 
  calculateCenter 
} from '../utils/spatialUtils';

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
      sampleCluster: clusters?.[0],
      sampleFlow: flowMaps?.[0]
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
      const processedClusters = clusters.map(cluster => {
        // Get markets from connected_markets array
        const markets = cluster.connected_markets || [];
        if (!markets.length) {
          console.warn('No markets found in cluster:', cluster);
          return null;
        }

        // Get coordinates for each market
        const marketCoordinates = markets.map(marketName => {
          const coords = getRegionCoordinates(marketName);
          if (!coords) {
            console.warn(`No coordinates found for market: ${marketName}`);
            return null;
          }
          return coords;
        }).filter(Boolean);

        // Calculate cluster center
        const center = calculateCenter(marketCoordinates);
        if (!center) {
          console.warn('Could not calculate center for cluster:', cluster.cluster_id);
          return null;
        }

        // Calculate cluster metrics
        const clusterFlows = flowMaps.filter(flow =>
          markets.includes(flow.source) || markets.includes(flow.target)
        );

        const metrics = calculateClusterMetrics(clusterFlows, markets);

        // Debug cluster processing
        console.log('Processing cluster:', {
          clusterId: cluster.cluster_id,
          marketCount: markets.length,
          foundCoordinates: marketCoordinates.length,
          center,
          metrics
        });

        return {
          ...cluster,
          center_lat: center[1],
          center_lon: center[0],
          market_count: markets.length,
          metrics,
          markets: markets.map(marketName => {
            const coords = getRegionCoordinates(marketName);
            return {
              name: marketName,
              normalized_name: transformRegionName(marketName),
              coordinates: coords || [0, 0]
            };
          })
        };
      }).filter(Boolean); // Remove any null clusters

      // Calculate overall metrics
      const totalMarkets = new Set(clusters.flatMap(c => c.connected_markets || [])).size;
      const averageEfficiency = processedClusters.reduce(
        (acc, cluster) => acc + (cluster.metrics?.efficiency || 0),
        0
      ) / processedClusters.length;

      const totalCoverage = totalMarkets / 21; // Total number of Yemen regions
      const networkDensity = calculateNetworkDensity(flowMaps, clusters);

      // Debug final results
      console.log('Cluster analysis results:', {
        processedClustersCount: processedClusters.length,
        totalMarkets,
        averageEfficiency,
        totalCoverage,
        networkDensity,
        sampleProcessedCluster: processedClusters[0]
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
      console.error('Error in cluster analysis:', error);
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
  const coverage = markets.length / 21; // Total number of Yemen regions

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

export default useClusterAnalysis;
