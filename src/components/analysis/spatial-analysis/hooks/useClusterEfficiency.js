//src/components/analysis/spatial-analysis/hooks/useClusterEfficiency.js

import { useMemo } from 'react';
import _ from 'lodash';
import { 
  calculateClusterCohesion, 
  calculateInterClusterFlows,
  calculateMarketIsolation
} from '../utils/spatialUtils';


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

export const useClusterEfficiency = (clusters, flowMaps) => {
  return useMemo(() => {
    try {
      if (!clusters?.length) {
        return {
          clusters: [],
          metrics: getDefaultMetrics()
        };
      }

      // Process each cluster with efficiency metrics
      const processedClusters = clusters.map(cluster => {
        const markets = cluster.markets || cluster.connected_markets || [];
        
        // Calculate internal efficiency metrics
        const cohesionMetrics = calculateClusterCohesion(
          cluster,
          flowMaps,
          YEMEN_COORDINATES
        );

        // Calculate market isolation scores
        const marketIsolationScores = markets.map(market => 
          calculateMarketIsolation(market, flowMaps, YEMEN_COORDINATES)
        );

        // Calculate intercluster relationships
        const interClusterMetrics = clusters
          .filter(c => c.cluster_id !== cluster.cluster_id)
          .map(otherCluster => 
            calculateInterClusterFlows(cluster, otherCluster, flowMaps)
          );

        // Calculate efficiency metrics
        const metrics = {
          efficiency: calculateEfficiencyScore(
            cohesionMetrics,
            marketIsolationScores,
            interClusterMetrics
          ),
          internal_efficiency: calculateInternalEfficiency(cohesionMetrics),
          external_efficiency: calculateExternalEfficiency(interClusterMetrics),
          market_integration: calculateMarketIntegration(
            marketIsolationScores,
            flowMaps
          ),
          price_stability: calculatePriceStability(cluster, flowMaps),
          flow_consistency: calculateFlowConsistency(cluster, flowMaps)
        };

        return {
          ...cluster,
          metrics,
          cohesion: cohesionMetrics,
          marketIsolation: marketIsolationScores,
          interClusterRelations: interClusterMetrics
        };
      });

      // Calculate overall metrics
      const overallMetrics = {
        averageEfficiency: _.meanBy(processedClusters, 'metrics.efficiency'),
        totalCoverage: calculateTotalCoverage(processedClusters),
        integrationScore: calculateOverallIntegration(processedClusters),
        stabilityScore: calculateOverallStability(processedClusters),
        flowConsistency: calculateOverallFlowConsistency(processedClusters)
      };

      return {
        clusters: processedClusters,
        metrics: overallMetrics
      };

    } catch (error) {
      console.error('Error in cluster efficiency analysis:', error);
      return {
        clusters: [],
        metrics: getDefaultMetrics()
      };
    }
  }, [clusters, flowMaps]);
};

// Helper functions
const calculateEfficiencyScore = (
  cohesion,
  isolationScores,
  interClusterMetrics
) => {
  const weights = {
    cohesion: 0.4,
    isolation: 0.3,
    interCluster: 0.3
  };

  const cohesionScore = cohesion?.cohesionScore || 0;
  const isolationScore = 1 - (_.meanBy(isolationScores, 'isolationScore') || 0);
  const interClusterScore = calculateInterClusterScore(interClusterMetrics);

  return (
    cohesionScore * weights.cohesion +
    isolationScore * weights.isolation +
    interClusterScore * weights.interCluster
  );
};

const calculateInternalEfficiency = (cohesion) => {
  if (!cohesion) return 0;

  const densityScore = (cohesion.density || 0) * 0.4;
  const flowScore = (cohesion.avgFlowStrength || 0) * 0.3;
  const dispersionScore = (1 - (cohesion.dispersion || 0)) * 0.3;

  return densityScore + flowScore + dispersionScore;
};

const calculateExternalEfficiency = (interClusterMetrics) => {
  // Return 0 if no valid metrics
  if (!Array.isArray(interClusterMetrics) || interClusterMetrics.length === 0) {
    return 0;
  }

  // Filter out null/undefined metrics and ensure all required properties exist
  const validMetrics = interClusterMetrics.filter(metric => 
    metric && 
    typeof metric.connectionDensity === 'number' && 
    typeof metric.avgFlow === 'number'
  );

  if (validMetrics.length === 0) {
    return 0;
  }

  // Calculate efficiency for valid metrics only
  const efficiencies = validMetrics.map(metric => {
    const densityScore = metric.connectionDensity * 0.5;
    const flowScore = (metric.avgFlow / 100) * 0.5; // Normalize flow score
    return densityScore + flowScore;
  });

  return _.mean(efficiencies);
};


const calculateMarketIntegration = (isolationScores, flows) => {
  if (!isolationScores?.length || !flows?.length) return 0;

  const avgIsolation = _.meanBy(isolationScores, 'isolationScore');
  const avgConnections = _.meanBy(isolationScores, 'connectionCount');
  const maxConnections = _.maxBy(isolationScores, 'connectionCount')?.connectionCount || 1;

  return (
    (1 - avgIsolation) * 0.4 +
    (avgConnections / maxConnections) * 0.6
  );
};

const calculatePriceStability = (cluster, flows) => {
  if (!flows?.length || !cluster.markets?.length) return 0;

  const marketFlows = flows.filter(flow => 
    cluster.markets.includes(flow.source) || 
    cluster.markets.includes(flow.target)
  );

  if (!marketFlows.length) return 0;

  const prices = marketFlows.map(flow => flow.avg_flow || 0);
  const volatility = calculateVolatility(prices);

  return 1 - volatility;
};

const calculateFlowConsistency = (cluster, flows) => {
  if (!flows?.length || !cluster.markets?.length) return 0;

  const marketFlows = flows.filter(flow => 
    cluster.markets.includes(flow.source) && 
    cluster.markets.includes(flow.target)
  );

  if (!marketFlows.length) return 0;

  const flowValues = marketFlows.map(flow => flow.total_flow || 0);
  return 1 - calculateVolatility(flowValues);
};

const calculateVolatility = (values) => {
  const mean = _.mean(values);
  const variance = _.mean(values.map(v => Math.pow(v - mean, 2)));
  return Math.sqrt(variance) / mean;
};

const calculateInterClusterScore = (metrics) => {
  if (!Array.isArray(metrics) || !metrics.length) return 0;

  // Filter out null/undefined metrics and ensure required properties exist
  const validMetrics = metrics.filter(m => 
    m && typeof m.connectionDensity === 'number' && typeof m.avgFlow === 'number'
  );

  if (!validMetrics.length) return 0;

  return _.mean(validMetrics.map(m => 
    (m.connectionDensity || 0) * 0.7 +
    (m.avgFlow || 0) * 0.3
  ));
};

const calculateTotalCoverage = (clusters) => {
  const totalMarkets = new Set();
  clusters.forEach(cluster => 
    cluster.markets?.forEach(market => 
      totalMarkets.add(market)
    )
  );
  // Assuming average of 20 markets per governorate in Yemen
  return totalMarkets.size / (clusters.length * 20); 
};

const calculateOverallIntegration = (clusters) => {
  if (!clusters?.length) return 0;
  
  const integrationScores = clusters.map(cluster => ({
    score: cluster.metrics.market_integration || 0,
    weight: cluster.markets?.length || 0
  }));

  const totalWeight = _.sumBy(integrationScores, 'weight');
  
  return integrationScores.reduce((sum, { score, weight }) => 
    sum + (score * weight / totalWeight), 0
  );
};

const calculateOverallStability = (clusters) => {
  if (!clusters?.length) return 0;

  return _.meanBy(clusters, cluster => 
    (cluster.metrics.price_stability || 0) * 0.6 +
    (cluster.metrics.flow_consistency || 0) * 0.4
  );
};

const calculateOverallFlowConsistency = (clusters) => {
  if (!clusters?.length) return 0;

  const allFlowConsistencies = clusters.map(cluster => ({
    consistency: cluster.metrics.flow_consistency || 0,
    marketCount: cluster.markets?.length || 0
  }));

  const totalMarkets = _.sumBy(allFlowConsistencies, 'marketCount');

  return allFlowConsistencies.reduce((sum, { consistency, marketCount }) => 
    sum + (consistency * marketCount / totalMarkets), 0
  );
};

const getDefaultMetrics = () => ({
  averageEfficiency: 0,
  totalCoverage: 0,
  integrationScore: 0,
  stabilityScore: 0,
  flowConsistency: 0
});

// Custom hooks for specific analysis aspects
export const useClusterIntegration = (cluster, flowMaps) => {
  return useMemo(() => {
    if (!cluster?.markets?.length || !flowMaps?.length) {
      return {
        integrationScore: 0,
        marketScores: {},
        flowMetrics: null
      };
    }

    const marketScores = cluster.markets.reduce((acc, market) => {
      const isolation = calculateMarketIsolation(market, flowMaps, YEMEN_COORDINATES);
      acc[market] = {
        isolationScore: isolation.isolationScore,
        connectionCount: isolation.connectionCount,
        totalFlow: isolation.totalFlow
      };
      return acc;
    }, {});

    const flowMetrics = {
      totalFlows: _.sumBy(Object.values(marketScores), 'totalFlow'),
      averageConnections: _.meanBy(Object.values(marketScores), 'connectionCount'),
      isolationIndex: _.meanBy(Object.values(marketScores), 'isolationScore')
    };

    const integrationScore = 
      (1 - flowMetrics.isolationIndex) * 0.4 +
      (flowMetrics.averageConnections / cluster.markets.length) * 0.6;

    return {
      integrationScore,
      marketScores,
      flowMetrics
    };
  }, [cluster, flowMaps]);
};

export const useClusterStability = (cluster, flowMaps, timeWindow = 6) => {
  return useMemo(() => {
    if (!cluster?.markets?.length || !flowMaps?.length) {
      return {
        stabilityScore: 0,
        priceStability: 0,
        flowStability: 0,
        timeSeriesMetrics: null
      };
    }

    const marketFlows = flowMaps.filter(flow => 
      cluster.markets.includes(flow.source) || 
      cluster.markets.includes(flow.target)
    );

    // Calculate price stability
    const prices = marketFlows.map(flow => flow.avg_flow || 0);
    const priceStability = 1 - calculateVolatility(prices);

    // Calculate flow stability
    const flows = marketFlows.map(flow => flow.total_flow || 0);
    const flowStability = 1 - calculateVolatility(flows);

    // Calculate time series metrics
    const timeSeriesMetrics = {
      trendStrength: calculateTrendStrength(marketFlows),
      volatilityClusters: identifyVolatilityClusters(marketFlows),
      seasonalityScore: calculateSeasonality(marketFlows)
    };

    const stabilityScore = 
      priceStability * 0.4 +
      flowStability * 0.3 +
      timeSeriesMetrics.trendStrength * 0.3;

    return {
      stabilityScore,
      priceStability,
      flowStability,
      timeSeriesMetrics
    };
  }, [cluster, flowMaps, timeWindow]);
};

// Helper functions for time series analysis
const calculateTrendStrength = (flows) => {
  if (!flows?.length) return 0;

  const values = flows.map(flow => flow.total_flow || 0);
  const n = values.length;
  
  if (n < 2) return 0;

  let trend = 0;
  for (let i = 1; i < n; i++) {
    trend += (values[i] - values[i-1]) / values[i-1];
  }

  return Math.abs(trend / (n - 1));
};

const identifyVolatilityClusters = (flows) => {
  if (!flows?.length) return [];

  const volatilities = [];
  const window = 3;

  for (let i = window; i < flows.length; i++) {
    const windowFlows = flows.slice(i - window, i);
    const values = windowFlows.map(flow => flow.total_flow || 0);
    volatilities.push(calculateVolatility(values));
  }

  return volatilities;
};

const calculateSeasonality = (flows) => {
  if (!flows?.length) return 0;

  const monthlyFlows = _.groupBy(flows, flow => 
    new Date(flow.date).getMonth()
  );

  const monthlyAverages = Object.values(monthlyFlows).map(monthFlows =>
    _.meanBy(monthFlows, 'total_flow')
  );

  return calculateVolatility(monthlyAverages);
};

export default useClusterEfficiency;