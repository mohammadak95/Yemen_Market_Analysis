// src/utils/clusterAnalysis.js

import _ from 'lodash';

/**
 * Calculate aggregated efficiency metrics for market clusters.
 * @param {Array} clusters - Array of market clusters with efficiency metrics.
 * @returns {Object} Aggregated efficiency metrics.
 */
export const calculateEfficiencyMetrics = (clusters) => {
  if (!clusters?.length) {
    console.warn("calculateEfficiencyMetrics: No clusters provided.");
    return null;
  }

  const metrics = clusters.reduce((acc, cluster) => {
    const efficiency = cluster.efficiency_metrics?.efficiency_score || 0;
    const connectivity = cluster.efficiency_metrics?.internal_connectivity || 0;
    const coverage = cluster.efficiency_metrics?.market_coverage || 0;

    acc.totalMarkets += cluster.market_count || 0;
    acc.avgEfficiency += efficiency;
    acc.avgConnectivity += connectivity;
    acc.avgCoverage += coverage;

    acc.maxEfficiency = Math.max(acc.maxEfficiency, efficiency);
    acc.maxConnectivity = Math.max(acc.maxConnectivity, connectivity);

    return acc;
  }, {
    totalMarkets: 0,
    avgEfficiency: 0,
    avgConnectivity: 0,
    avgCoverage: 0,
    maxEfficiency: 0,
    maxConnectivity: 0,
  });

  const count = clusters.length;
  const aggregatedMetrics = {
    ...metrics,
    avgEfficiency: metrics.avgEfficiency / count,
    avgConnectivity: metrics.avgConnectivity / count,
    avgCoverage: metrics.avgCoverage / count,
  };

  console.log("Aggregated Efficiency Metrics:", aggregatedMetrics);

  return aggregatedMetrics;
};

/**
 * Generate a connectivity matrix for visualization purposes.
 * @param {Array} clusters - Array of market clusters.
 * @returns {Object} Connectivity matrix containing markets and their connectivity scores.
 */
export const generateConnectivityMatrix = (clusters) => {
  if (!clusters?.length) {
    console.warn("generateConnectivityMatrix: No clusters provided.");
    return { markets: [], matrix: [] };
  }

  const markets = new Set();
  clusters.forEach(cluster => {
    markets.add(cluster.main_market);
    cluster.connected_markets.forEach(market => markets.add(market));
  });

  const marketArray = Array.from(markets);
  const matrix = Array(marketArray.length).fill(0)
    .map(() => Array(marketArray.length).fill(0));

  clusters.forEach(cluster => {
    const mainIndex = marketArray.indexOf(cluster.main_market);
    if (mainIndex === -1) {
      console.warn(`generateConnectivityMatrix: Main market '${cluster.main_market}' not found in marketArray.`);
      return;
    }
    cluster.connected_markets.forEach(market => {
      const marketIndex = marketArray.indexOf(market);
      if (marketIndex === -1) {
        console.warn(`generateConnectivityMatrix: Connected market '${market}' not found in marketArray.`);
        return;
      }
      const connectivity = cluster.efficiency_metrics?.internal_connectivity || 0;
      matrix[mainIndex][marketIndex] = connectivity;
      matrix[marketIndex][mainIndex] = connectivity;
    });
  });

  console.log("Connectivity Matrix:", { markets: marketArray, matrix });

  return {
    markets: marketArray,
    matrix
  };
};

/**
 * Calculate the health score of a cluster based on various metrics.
 * @param {Object} cluster - Market cluster with efficiency metrics.
 * @returns {number} Health score.
 */
export const calculateClusterHealth = (cluster) => {
  if (!cluster) {
    console.warn("calculateClusterHealth: No cluster provided.");
    return 0;
  }

  const metrics = cluster.efficiency_metrics || {};

  // Weights for different components
  const weights = {
    efficiency: 0.3,
    connectivity: 0.2,
    coverage: 0.2,
    stability: 0.3
  };

  const healthScore = (
    weights.efficiency * (metrics.efficiency_score || 0) +
    weights.connectivity * (metrics.internal_connectivity || 0) +
    weights.coverage * (metrics.market_coverage || 0) +
    weights.stability * (metrics.stability || 0)
  );

  console.log(`Cluster ID ${cluster.cluster_id} Health Score:`, healthScore);

  return healthScore;
};

/**
 * Analyze the stability of a cluster over time.
 * @param {Object} cluster - Market cluster with efficiency metrics.
 * @param {Array} timeSeriesData - Array of time series data objects.
 * @returns {Object} Stability metrics.
 */
export const analyzeClusterStability = (cluster, timeSeriesData) => {
  if (!cluster) {
    console.warn("analyzeClusterStability: No cluster provided.");
    return null;
  }
  if (!timeSeriesData?.length) {
    console.warn("analyzeClusterStability: No timeSeriesData provided.");
    return null;
  }

  // Filter time series data for connected markets
  const clusterShocks = timeSeriesData.filter(d => 
    cluster.connected_markets.includes(d.region)
  );

  if (!clusterShocks.length) {
    console.warn("analyzeClusterStability: No shocks found for the cluster.");
    return null;
  }

  const priceVolatility = calculatePriceVolatility(clusterShocks);
  const membershipStability = calculateMembershipStability(cluster);
  const connectivityTrend = analyzeConnectivityTrend(cluster);

  const stabilityMetrics = {
    priceVolatility,
    membershipStability,
    connectivityTrend,
    overallStability: (
      priceVolatility * 0.4 +
      membershipStability * 0.3 +
      connectivityTrend * 0.3
    )
  };

  console.log(`Cluster ID ${cluster.cluster_id} Stability Metrics:`, stabilityMetrics);

  return stabilityMetrics;
};

/**
 * Calculate price volatility based on shock data.
 * @param {Array} shocks - Array of shock events related to the cluster.
 * @returns {number} Price volatility metric.
 */
const calculatePriceVolatility = (shocks) => {
  if (!shocks?.length) {
    console.warn("calculatePriceVolatility: No shocks provided.");
    return 1;
  }
  const meanPrice = _.meanBy(shocks, 'previous_price');
  const variance = shocks.reduce((sum, p) => 
    sum + Math.pow(p.previous_price - meanPrice, 2), 0) / shocks.length;
  const volatility = Math.sqrt(variance) / meanPrice;
  console.log("Price Volatility:", volatility);
  return volatility;
};

/**
 * Calculate membership stability based on cluster metrics.
 * @param {Object} cluster - Market cluster with efficiency metrics.
 * @returns {number} Membership stability metric.
 */
const calculateMembershipStability = (cluster) => {
  // Implement actual logic based on historical membership data
  // Placeholder implementation:
  const stability = cluster.efficiency_metrics?.stability || 0;
  console.log("Membership Stability:", stability);
  return stability;
};

/**
 * Analyze connectivity trend based on cluster metrics.
 * @param {Object} cluster - Market cluster with efficiency metrics.
 * @returns {number} Connectivity trend metric.
 */
const analyzeConnectivityTrend = (cluster) => {
  // Implement actual logic based on historical connectivity data
  // Placeholder implementation:
  const connectivityTrend = cluster.efficiency_metrics?.internal_connectivity || 0;
  console.log("Connectivity Trend:", connectivityTrend);
  return connectivityTrend;
};
