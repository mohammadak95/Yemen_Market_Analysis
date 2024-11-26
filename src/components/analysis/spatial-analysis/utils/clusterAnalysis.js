// src/components/analysis/spatial-analysis/utils/clusterAnalysis.js

import _ from 'lodash';

/**
 * Helper functions for statistical calculations with safety checks.
 */
const Math = {
  mean: (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const validNumbers = arr.filter(val => typeof val === 'number' && !isNaN(val));
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((sum, val) => sum + val, 0) / validNumbers.length;
  },
  std: (arr) => {
    if (!Array.isArray(arr) || arr.length <= 1) return 0;
    const validNumbers = arr.filter(val => typeof val === 'number' && !isNaN(val));
    if (validNumbers.length <= 1) return 0;
    const mean = Math.mean(validNumbers);
    const squareDiffs = validNumbers.map(val => (val - mean) ** 2);
    const avgSquareDiff = Math.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  },
};

/**
 * Calculate efficiency metrics for each market cluster.
 * @param {Array} clusters - Array of market clusters.
 * @param {Array} flowData - Array of flow data between markets.
 * @param {Array} timeSeriesData - Array of time series data for markets.
 * @returns {Array} Clusters with calculated efficiency metrics.
 */
export const calculateEfficiencyMetrics = (clusters, flowData, timeSeriesData) => {
  // Validate input parameters
  if (!Array.isArray(clusters) || clusters.length === 0) {
    console.warn("No valid clusters provided");
    return [];
  }

  if (!Array.isArray(flowData)) {
    console.warn("Invalid flow data provided");
    flowData = [];
  }

  if (!Array.isArray(timeSeriesData)) {
    console.warn("Invalid time series data provided");
    timeSeriesData = [];
  }

  return clusters.map(cluster => {
    try {
      // Validate cluster structure
      if (!cluster || !Array.isArray(cluster.connected_markets)) {
        console.warn(`Invalid cluster structure: ${JSON.stringify(cluster)}`);
        return {
          ...cluster,
          efficiency_metrics: {
            internal_connectivity: 0,
            market_coverage: 0,
            price_convergence: 0,
            stability: 0,
            efficiency_score: 0,
          },
        };
      }

      const markets = cluster.connected_markets;

      // Calculate internal connectivity based on flow data
      const internalFlows = flowData.filter(flow =>
        flow?.source && flow?.target &&
        markets.includes(flow.source) && markets.includes(flow.target)
      );

      const possibleConnections = markets.length * (markets.length - 1);
      const actualConnections = internalFlows.length;
      const internalConnectivity = possibleConnections > 0
        ? actualConnections / possibleConnections
        : 0;

      // Calculate market coverage
      const uniqueMarkets = timeSeriesData && timeSeriesData.length > 0
        ? _.uniq(timeSeriesData.filter(d => d?.region).map(d => d.region))
        : [];
      const totalMarkets = uniqueMarkets.length || markets.length;
      const marketCoverage = totalMarkets > 0 ? markets.length / totalMarkets : 0;

      // Calculate price convergence
      const clusterPrices = timeSeriesData.filter(d =>
        d?.region && markets.includes(d.region)
      );
      const prices = clusterPrices
        .map(d => d?.avgUsdPrice)
        .filter(price => typeof price === 'number' && !isNaN(price));
      
      const priceConvergence = prices.length > 1
        ? Math.max(0, Math.min(1, 1 - (Math.std(prices) / Math.mean(prices))))
        : 0;

      // Calculate stability
      const volatilities = clusterPrices
        .map(d => d?.volatility)
        .filter(vol => typeof vol === 'number' && !isNaN(vol));
      
      const stability = volatilities.length > 0
        ? Math.max(0, Math.min(1, 1 - (Math.mean(volatilities) / 100)))
        : 0;

      // Composite efficiency score
      const metrics = [internalConnectivity, marketCoverage, priceConvergence, stability];
      const validMetrics = metrics.filter(m => typeof m === 'number' && !isNaN(m));
      const efficiencyScore = validMetrics.length > 0
        ? validMetrics.reduce((sum, val) => sum + val, 0) / validMetrics.length
        : 0;

      return {
        ...cluster,
        efficiency_metrics: {
          internal_connectivity: internalConnectivity,
          market_coverage: marketCoverage,
          price_convergence: priceConvergence,
          stability,
          efficiency_score: efficiencyScore,
        },
      };
    } catch (error) {
      console.error(`Error calculating metrics for cluster: ${error.message}`);
      return {
        ...cluster,
        efficiency_metrics: {
          internal_connectivity: 0,
          market_coverage: 0,
          price_convergence: 0,
          stability: 0,
          efficiency_score: 0,
        },
      };
    }
  });
};
