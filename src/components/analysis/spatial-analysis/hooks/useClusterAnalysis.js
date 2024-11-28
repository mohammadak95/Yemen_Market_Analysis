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

const useClusterAnalysis = (clusters, flowMaps, geometryData) => {
  return useMemo(() => {
    // Debug input parameters
    console.log('useClusterAnalysis input:', {
      hasClusters: Boolean(clusters?.length),
      clustersCount: clusters?.length,
      hasFlowMaps: Boolean(flowMaps?.length),
      flowMapsCount: flowMaps?.length
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
        if (!cluster?.connected_markets?.length || !cluster.main_market) {
          console.warn('Invalid cluster structure:', cluster);
          return null;
        }

        // Normalize market names and filter invalid ones
        const markets = cluster.connected_markets
          .map(market => market.toLowerCase().trim())
          .filter(market => YEMEN_COORDINATES[market]);

        if (markets.length === 0) {
          console.warn('No valid markets found in cluster:', cluster.cluster_id);
          return null;
        }

        // Get market coordinates
        const marketCoords = markets
          .map(market => ({
            id: market,
            coords: YEMEN_COORDINATES[market]
          }))
          .filter(Boolean);

        if (marketCoords.length === 0) {
          console.warn('No coordinates found for cluster markets:', cluster.cluster_id);
          return null;
        }

        // Calculate cluster center
        const center = marketCoords.reduce(
          (acc, { coords }) => ({
            lat: acc.lat + coords[1] / marketCoords.length,
            lon: acc.lon + coords[0] / marketCoords.length
          }),
          { lat: 0, lon: 0 }
        );

        // Get cluster flows
        const clusterFlows = flowMaps.filter(flow => {
          const source = flow.source?.toLowerCase();
          const target = flow.target?.toLowerCase();
          return markets.includes(source) && markets.includes(target);
        });

        // Calculate metrics
        const flowMetrics = calculateFlowMetrics(clusterFlows, markets);
        const coverage = markets.length / Object.keys(YEMEN_COORDINATES).length;
        const efficiency = calculateClusterEfficiency(clusterFlows, markets);

        // Create processed cluster object
        const processedCluster = {
          cluster_id: cluster.cluster_id,
          main_market: cluster.main_market.toLowerCase(),
          market_count: markets.length,
          markets,
          center_coordinates: [center.lon, center.lat],
          center_lat: center.lat,
          center_lon: center.lon,
          bounds: calculateClusterBounds(marketCoords),
          metrics: {
            efficiency,
            coverage,
            flow_density: flowMetrics.density,
            avg_flow: flowMetrics.averageFlow,
            total_flow: flowMetrics.totalFlow,
            internal_connectivity: flowMetrics.connectivity
          }
        };

        // Add geographical region references if available
        if (geometryData?.features) {
          processedCluster.region_refs = geometryData.features
            .filter(f => markets.includes(f.properties.region_id?.toLowerCase()))
            .map(f => f.properties.region_id);
        }

        return processedCluster;
      }).filter(Boolean);

      // Calculate overall metrics
      const totalMarkets = new Set(
        clusters.flatMap(c => c.connected_markets || []).map(m => m.toLowerCase())
      ).size;

      const metrics = {
        totalClusters: processedClusters.length,
        averageEfficiency: calculateAverageMetric(processedClusters, 'efficiency'),
        averageCoverage: calculateAverageMetric(processedClusters, 'coverage'),
        totalCoverage: totalMarkets / Object.keys(YEMEN_COORDINATES).length,
        networkDensity: calculateNetworkDensity(flowMaps, clusters),
        clusterStats: {
          minSize: Math.min(...processedClusters.map(c => c.market_count)),
          maxSize: Math.max(...processedClusters.map(c => c.market_count)),
          avgSize: processedClusters.reduce((acc, c) => acc + c.market_count, 0) / processedClusters.length
        }
      };

      return {
        clusters: processedClusters,
        metrics,
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
        error: error.message,
        isValid: false
      };
    }
  }, [clusters, flowMaps, geometryData]);
};

const calculateFlowMetrics = (flows, markets) => {
  if (!flows.length || !markets.length) {
    return {
      density: 0,
      averageFlow: 0,
      totalFlow: 0,
      connectivity: 0
    };
  }

  const totalFlow = flows.reduce((sum, flow) => sum + (flow.total_flow || 0), 0);
  const maxPossibleConnections = (markets.length * (markets.length - 1)) / 2;
  const actualConnections = flows.length;

  return {
    density: maxPossibleConnections > 0 ? actualConnections / maxPossibleConnections : 0,
    averageFlow: flows.length > 0 ? totalFlow / flows.length : 0,
    totalFlow,
    connectivity: actualConnections / Math.max(1, maxPossibleConnections)
  };
};

const calculateClusterEfficiency = (flows, markets) => {
  if (!flows.length || !markets.length) return 0;

  const flowMetrics = calculateFlowMetrics(flows, markets);
  const marketCoverage = markets.length / Object.keys(YEMEN_COORDINATES).length;

  return Math.min(1, (flowMetrics.connectivity * 0.4 + 
                     flowMetrics.density * 0.3 + 
                     marketCoverage * 0.3));
};

const calculateNetworkDensity = (flows, clusters) => {
  if (!flows.length || !clusters.length) return 0;

  const uniqueMarkets = new Set(
    flows.flatMap(f => [f.source, f.target].map(m => m.toLowerCase()))
  );

  const totalMarkets = uniqueMarkets.size;
  const maxPossibleConnections = (totalMarkets * (totalMarkets - 1)) / 2;
  const actualConnections = flows.length;

  return Math.min(1, actualConnections / Math.max(1, maxPossibleConnections));
};

const calculateClusterBounds = (marketCoords) => {
  if (!marketCoords.length) return null;

  return marketCoords.reduce((bounds, { coords }) => ({
    north: Math.max(bounds.north, coords[1]),
    south: Math.min(bounds.south, coords[1]),
    east: Math.max(bounds.east, coords[0]),
    west: Math.min(bounds.west, coords[0])
  }), {
    north: -90,
    south: 90,
    east: -180,
    west: 180
  });
};

const calculateAverageMetric = (clusters, metricName) => {
  if (!clusters.length) return 0;
  return clusters.reduce((sum, cluster) => sum + (cluster.metrics[metricName] || 0), 0) / clusters.length;
};

export default useClusterAnalysis;