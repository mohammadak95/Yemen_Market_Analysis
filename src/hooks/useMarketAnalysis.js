// src/hooks/useMarketAnalysis.js

import { useMemo } from 'react';
import _ from 'lodash';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { validateNumber } from '../utils/numberValidation';
import { transformRegionName } from '../utils/spatialUtils';

export const useMarketAnalysis = (data) => {
  return useMemo(() => {
    if (!data) return null;

    const metric = backgroundMonitor.startMetric('market-analysis');
    
    try {
      const result = {
        marketMetrics: calculateMarketMetrics(data),
        timeSeriesAnalysis: analyzeTimeSeries(data.timeSeriesData),
        spatialAnalysis: analyzeSpatialPatterns(data),
        summaryMetrics: calculateSummaryMetrics(data)
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return null;
    }
  }, [data]);
};

const calculateMarketMetrics = (data) => {
  const { marketClusters, flowAnalysis } = data;

  // Calculate market-level metrics
  const metrics = {
    marketCoverage: calculateMarketCoverage(marketClusters),
    marketConnectivity: calculateMarketConnectivity(flowAnalysis),
    marketEfficiency: calculateMarketEfficiency(marketClusters),
    timeSeriesStats: calculateTimeSeriesStats(data.timeSeriesData)
  };

  return {
    ...metrics,
    overall: calculateOverallScore(metrics)
  };
};

const analyzeTimeSeries = (timeSeriesData) => {
  if (!Array.isArray(timeSeriesData)) return null;

  // Group by region
  const byRegion = _.groupBy(timeSeriesData, 'region');

  return Object.entries(byRegion).reduce((acc, [region, data]) => {
    acc[region] = {
      priceStats: calculatePriceStatistics(data),
      volatility: calculateVolatility(data),
      trend: calculateTrend(data),
      seasonality: detectSeasonality(data)
    };
    return acc;
  }, {});
};

const analyzeSpatialPatterns = (data) => {
  const { marketClusters, spatialAutocorrelation, flowAnalysis } = data;

  return {
    clusters: analyzeClusterPatterns(marketClusters),
    spatialDependence: processSpatialAutocorrelation(spatialAutocorrelation),
    flowPatterns: analyzeFlowPatterns(flowAnalysis)
  };
};

const calculateMarketCoverage = (clusters) => {
  if (!Array.isArray(clusters)) return 0;

  const uniqueMarkets = new Set();
  clusters.forEach(cluster => {
    uniqueMarkets.add(cluster.main_market);
    cluster.connected_markets.forEach(market => uniqueMarkets.add(market));
  });

  return {
    totalMarkets: uniqueMarkets.size,
    clustersCoverage: clusters.length,
    averageClusterSize: clusters.reduce((sum, cluster) => 
      sum + (cluster.connected_markets.length + 1), 0) / clusters.length,
    integrationRate: clusters.length > 0 ? 
      uniqueMarkets.size / (clusters.length * 2) : 0
  };
};

const calculateMarketConnectivity = (flows) => {
  if (!Array.isArray(flows)) return 0;

  const marketConnections = new Map();
  
  flows.forEach(flow => {
    if (!marketConnections.has(flow.source)) {
      marketConnections.set(flow.source, new Set());
    }
    if (!marketConnections.has(flow.target)) {
      marketConnections.set(flow.target, new Set());
    }
    
    marketConnections.get(flow.source).add(flow.target);
    marketConnections.get(flow.target).add(flow.source);
  });

  const totalMarkets = marketConnections.size;
  const avgConnections = Array.from(marketConnections.values())
    .reduce((sum, connections) => sum + connections.size, 0) / totalMarkets;

  return {
    totalConnections: flows.length,
    averageConnections: avgConnections,
    density: totalMarkets > 1 ? 
      flows.length / (totalMarkets * (totalMarkets - 1)) : 0,
    isolatedMarkets: Array.from(marketConnections.values())
      .filter(connections => connections.size === 0).length
  };
};

const calculateMarketEfficiency = (clusters) => {
  if (!Array.isArray(clusters)) return {};

  const efficiencyScores = clusters.map(cluster => ({
    score: validateNumber(cluster.metrics?.efficiency, 0),
    coverage: validateNumber(cluster.metrics?.coverage, 0),
    connectivity: validateNumber(cluster.metrics?.connectivity, 0)
  }));

  return {
    averageEfficiency: _.meanBy(efficiencyScores, 'score'),
    averageCoverage: _.meanBy(efficiencyScores, 'coverage'),
    averageConnectivity: _.meanBy(efficiencyScores, 'connectivity'),
    distribution: {
      high: efficiencyScores.filter(score => score.score > 0.7).length,
      medium: efficiencyScores.filter(score => score.score > 0.4 && score.score <= 0.7).length,
      low: efficiencyScores.filter(score => score.score <= 0.4).length
    }
  };
};

const calculateTimeSeriesStats = (timeSeriesData) => {
  if (!Array.isArray(timeSeriesData)) return {};

  const priceValues = timeSeriesData.map(d => d.price).filter(Boolean);
  const usdValues = timeSeriesData.map(d => d.usdprice).filter(Boolean);
  const conflictValues = timeSeriesData.map(d => d.conflict_intensity).filter(Boolean);

  return {
    prices: calculateStatistics(priceValues),
    usdPrices: calculateStatistics(usdValues),
    conflictIntensity: calculateStatistics(conflictValues),
    sampleSize: timeSeriesData.length,
    timeRange: calculateTimeRange(timeSeriesData)
  };
};

const calculateStatistics = (values) => {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mean = _.mean(values);
  const median = sorted[Math.floor(sorted.length / 2)];
  const standardDeviation = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    standardDeviation,
    coefficientOfVariation: standardDeviation / mean
  };
};

const calculateTimeRange = (data) => {
  if (!data.length) return null;

  const dates = data.map(d => new Date(d.date));
  return {
    start: new Date(Math.min(...dates)),
    end: new Date(Math.max(...dates)),
    duration: Math.max(...dates) - Math.min(...dates)
  };
};

const calculatePriceStatistics = (data) => {
  const prices = data.map(d => d.price).filter(Boolean);
  const usdPrices = data.map(d => d.usdprice).filter(Boolean);

  return {
    local: calculateStatistics(prices),
    usd: calculateStatistics(usdPrices),
    correlation: calculateCorrelation(prices, usdPrices)
  };
};

const calculateVolatility = (data) => {
  const prices = data.map(d => d.price).filter(Boolean);
  if (prices.length < 2) return null;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] > 0) {
      returns.push(Math.log(prices[i] / prices[i-1]));
    }
  }

  return {
    volatility: Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length),
    maxDrawdown: calculateMaxDrawdown(prices),
    jumpFrequency: calculateJumpFrequency(prices)
  };
};

const calculateTrend = (data) => {
  const prices = data.map(d => d.price).filter(Boolean);
  if (prices.length < 2) return null;

  const xValues = Array.from({ length: prices.length }, (_, i) => i);
  const { slope, intercept, rSquared } = calculateLinearRegression(xValues, prices);

  return {
    slope,
    intercept,
    rSquared,
    direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
    strength: Math.abs(slope) * rSquared
  };
};

const detectSeasonality = (data) => {
  const prices = data.map(d => d.price).filter(Boolean);
  if (prices.length < 12) return null;

  // Group by month
  const months = data.reduce((acc, d) => {
    const month = new Date(d.date).getMonth();
    if (!acc[month]) acc[month] = [];
    if (d.price) acc[month].push(d.price);
    return acc;
  }, {});

  const monthlyStats = Object.entries(months).map(([month, prices]) => ({
    month: Number(month),
    stats: calculateStatistics(prices)
  }));

  return {
    monthlyStats,
    seasonalStrength: calculateSeasonalStrength(monthlyStats),
    peakMonth: findPeakMonth(monthlyStats),
    troughMonth: findTroughMonth(monthlyStats)
  };
};

const calculateOverallScore = (metrics) => {
  const weights = {
    coverage: 0.3,
    connectivity: 0.3,
    efficiency: 0.4
  };

  return (
    metrics.marketCoverage.integrationRate * weights.coverage +
    metrics.marketConnectivity.density * weights.connectivity +
    metrics.marketEfficiency.averageEfficiency * weights.efficiency
  );
};

const calculateLinearRegression = (x, y) => {
  const n = x.length;
  const sumX = _.sum(x);
  const sumY = _.sum(y);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const totalSS = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const residualSS = y.reduce((sum, yi, i) => {
    const prediction = slope * x[i] + intercept;
    return sum + Math.pow(yi - prediction, 2);
  }, 0);

  return {
    slope,
    intercept,
    rSquared: 1 - (residualSS / totalSS)
  };
};

const calculateCorrelation = (array1, array2) => {
  if (array1.length !== array2.length || !array1.length) return null;

  const mean1 = _.mean(array1);
  const mean2 = _.mean(array2);
  const deviation1 = array1.map(x => x - mean1);
  const deviation2 = array2.map(x => x - mean2);

  const sum12 = _.sum(deviation1.map((d1, i) => d1 * deviation2[i]));
  const sum1 = Math.sqrt(_.sum(deviation1.map(d => d * d)));
  const sum2 = Math.sqrt(_.sum(deviation2.map(d => d * d)));

  return sum12 / (sum1 * sum2);
};

const calculateMaxDrawdown = (prices) => {
  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    const drawdown = (peak - price) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown;
};

const calculateJumpFrequency = (prices) => {
  const threshold = 0.1; // 10% change
  let jumps = 0;

  for (let i = 1; i < prices.length; i++) {
    const change = Math.abs(prices[i] - prices[i-1]) / prices[i-1];
    if (change > threshold) jumps++;
  }

  return jumps / (prices.length - 1);
};