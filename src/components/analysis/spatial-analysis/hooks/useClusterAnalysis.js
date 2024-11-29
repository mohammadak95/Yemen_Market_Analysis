//src/components/analysis/spatial-analysis/hooks/useClusterAnalysis.js

import { useMemo } from 'react';
import { 
  calculateClusterGeometry, 
  calculateClusterCohesion, 
  calculateMarketCentrality,
  YEMEN_COORDINATES,
  getRegionCoordinates,
  transformRegionName
} from '../utils/spatialUtils';
import _ from 'lodash';

export const useClusterAnalysis = (marketClusters, flowMaps, geometry) => {
  return useMemo(() => {
    try {
      if (!Array.isArray(marketClusters) || !marketClusters.length) {
        return {
          clusters: [],
          metrics: getDefaultMetrics(),
          error: null,
          isValid: false
        };
      }

      // Process each cluster
      const processedClusters = marketClusters.map(cluster => {
        const markets = cluster.connected_markets || [];
        
        // Get market coordinates using YEMEN_COORDINATES
        const marketCoordinates = markets.map(market => {
          const normalizedName = transformRegionName(market);
          return {
            name: market,
            coordinates: YEMEN_COORDINATES[normalizedName] || [0, 0],
            isMainMarket: market === cluster.main_market
          };
        });

        // Calculate geometric properties with proper coordinates
        const geometryMetrics = calculateClusterGeometry(
          markets,
          YEMEN_COORDINATES
        );

        // Calculate cohesion metrics with proper coordinate reference
        const cohesionMetrics = calculateClusterCohesion(
          cluster,
          flowMaps,
          YEMEN_COORDINATES
        );

        // Calculate market centrality
        const centralityMetrics = calculateMarketCentrality(
          markets,
          flowMaps
        );

        // Calculate cluster metrics
        const metrics = {
          efficiency: calculateEfficiencyScore(
            cohesionMetrics,
            centralityMetrics,
            geometryMetrics
          ),
          internal_connectivity: cohesionMetrics?.density || 0,
          coverage: marketCoordinates.filter(m => m.coordinates[0] !== 0).length / 
                   (geometry?.features?.length || 1),
          price_convergence: calculatePriceConvergence(cluster, flowMaps),
          stability: cohesionMetrics?.cohesionScore || 0,
          total_flow: cohesionMetrics?.avgFlowStrength || 0,
          price_volatility: calculatePriceVolatility(cluster, flowMaps)
        };

        return {
          ...cluster,
          metrics,
          marketCoordinates,
          geometry: geometryMetrics
        };
      });

      // Calculate overall metrics
      const overallMetrics = {
        averageEfficiency: _.meanBy(processedClusters, 'metrics.efficiency'),
        totalCoverage: processedClusters.reduce((sum, c) => 
          sum + (c.metrics.coverage || 0), 0
        ),
        networkDensity: calculateNetworkDensity(processedClusters, flowMaps),
        clusterCount: processedClusters.length,
        totalMarkets: _.sumBy(processedClusters, c => c.marketCoordinates.length),
        volatility: calculateOverallVolatility(processedClusters)
      };

      return {
        clusters: processedClusters,
        metrics: overallMetrics,
        error: null,
        isValid: true
      };

    } catch (error) {
      console.error('Error in cluster analysis:', error);
      return {
        clusters: [],
        metrics: getDefaultMetrics(),
        error: error.message,
        isValid: false
      };
    }
  }, [marketClusters, flowMaps, geometry]);
};

// Helper functions
const calculateEfficiencyScore = (cohesion, centrality, geometry) => {
  const weights = {
    cohesion: 0.4,
    centrality: 0.3,
    geometry: 0.3
  };

  return (
    (cohesion?.cohesionScore || 0) * weights.cohesion +
    (centrality?.weightedCentrality || 0) * weights.centrality +
    (geometry?.density || 0) * weights.geometry
  );
};

const calculatePriceConvergence = (cluster, flows) => {
  if (!flows?.length || !cluster.markets?.length) return 0;

  const marketFlows = flows.filter(flow => 
    cluster.markets.includes(flow.source) && 
    cluster.markets.includes(flow.target)
  );

  if (!marketFlows.length) return 0;

  const priceDiffs = marketFlows.map(flow => 
    Math.abs(flow.avg_price_differential || 0)
  );

  return 1 - (_.mean(priceDiffs) || 0);
};

const calculatePriceVolatility = (cluster, flows) => {
  if (!flows?.length || !cluster.markets?.length) return 1;

  const marketFlows = flows.filter(flow => 
    cluster.markets.includes(flow.source) || 
    cluster.markets.includes(flow.target)
  );

  if (!marketFlows.length) return 1;

  const prices = marketFlows.map(flow => flow.avg_flow || 0);
  const mean = _.mean(prices);
  const variance = _.mean(prices.map(p => Math.pow(p - mean, 2)));

  return Math.sqrt(variance) / mean;
};

const calculateNetworkDensity = (clusters, flows) => {
  if (!clusters?.length || !flows?.length) return 0;

  const totalPossibleConnections = clusters.reduce((sum, cluster) => 
    sum + (cluster.markets?.length * (cluster.markets?.length - 1) / 2), 0
  );

  const actualConnections = flows.length;

  return actualConnections / (totalPossibleConnections || 1);
};

const calculateOverallVolatility = (clusters) => {
  const efficiencies = clusters.map(c => c.metrics?.efficiency || 0);
  const mean = _.mean(efficiencies);
  return Math.sqrt(_.mean(efficiencies.map(e => Math.pow(e - mean, 2))));
};

const getDefaultMetrics = () => ({
  averageEfficiency: 0,
  totalCoverage: 0,
  networkDensity: 0,
  clusterCount: 0,
  totalMarkets: 0,
  volatility: 0
});

export default useClusterAnalysis;