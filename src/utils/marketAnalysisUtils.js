// src/utils/marketAnalysisUtils.js


export function calculateVolatility(timeSeriesData) {
  if (!timeSeriesData?.length) return 0;
  const prices = timeSeriesData.map((d) => d.usdprice).filter((p) => p != null);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  return Math.sqrt(variance) / mean;
}

export function calculateIntegration(spatialAutocorrelation) {
  if (!spatialAutocorrelation?.I) return 0;
  return spatialAutocorrelation.I;
}

export function calculateShockFrequency(shocks) {
  if (!shocks?.length) return 0;
  const timeRange = new Set(shocks.map((s) => s.date.substring(0, 7))).size;
  return shocks.length / timeRange;
}

export function calculateClusterEfficiency(clusters) {
  if (!clusters?.length) return 0;
  return (
    clusters.reduce((acc, cluster) => acc + cluster.market_count / cluster.connected_markets.length, 0) /
    clusters.length
  );
}

export function calculatePriceTrend(timeSeriesData) {
  // Implement trend calculation logic using linear regression
  const prices = timeSeriesData.map((d) => d.usdprice).filter((p) => p != null);
  const dates = timeSeriesData.map((d) => new Date(d.date).getTime());
  if (prices.length !== dates.length || prices.length === 0) return null;

  const n = prices.length;
  const sumX = dates.reduce((a, b) => a + b, 0);
  const sumY = prices.reduce((a, b) => a + b, 0);
  const sumXY = dates.reduce((sum, x, i) => sum + x * prices[i], 0);
  const sumXX = dates.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = prices.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssRes = prices.reduce((sum, y, i) => sum + Math.pow(y - (slope * dates[i] + intercept), 2), 0);
  const rSquared = 1 - ssRes / ssTotal;

  return {
    slope,
    intercept,
    rSquared,
  };
}

export function detectSeasonality(timeSeriesData) {
  // Placeholder implementation
  return {
    seasonal: false,
    period: null,
    strength: 0,
  };
}

export function detectOutliers(timeSeriesData) {
  if (!timeSeriesData?.length) return [];

  const prices = timeSeriesData.map((d) => d.usdprice).filter((p) => p != null);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);

  return timeSeriesData.filter((d) => Math.abs(d.usdprice - mean) > 2 * stdDev);
}

export function summarizeClusters(clusters) {
  if (!clusters?.length) return null;

  return {
    count: clusters.length,
    averageSize: clusters.reduce((acc, c) => acc + c.market_count, 0) / clusters.length,
    largest: Math.max(...clusters.map((c) => c.market_count)),
    smallest: Math.min(...clusters.map((c) => c.market_count)),
  };
}

export function calculateMarketMetrics(data) {
  return {
    overallVolatility: calculateVolatility(data.timeSeriesData),
    overallIntegration: calculateIntegration(data.spatialAutocorrelation),
    overallShockFrequency: calculateShockFrequency(data.detectedShocks),
    overallClusterEfficiency: calculateClusterEfficiency(data.marketClusters),
  };
}