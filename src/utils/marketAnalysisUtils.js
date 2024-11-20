// src/utils/marketAnalysisUtils.js

import { 
  selectTimeSeriesData,
  selectMarketClusters,
  selectSpatialAutocorrelation,
  selectMarketIntegration
} from '../slices/spatialSlice';

export function calculateVolatility(timeSeriesData) {
  if (!timeSeriesData?.length) return {
    garch: 0,
    traditional: 0,
    stability: 0
  };

  const latestEntry = timeSeriesData[timeSeriesData.length - 1];
  
  // Use precomputed metrics when available
  const garchVolatility = latestEntry.garch_volatility ?? 0;
  const priceStability = latestEntry.price_stability ?? 0;

  // Calculate traditional volatility as backup
  const prices = timeSeriesData.map(d => d.avgUsdPrice).filter(p => p != null);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const traditional = Math.sqrt(
    prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length
  ) / mean;

  return {
    garch: garchVolatility,
    traditional: traditional,
    stability: priceStability
  };
}

export function calculateMarketIntegration(data) {
  if (!data?.market_integration) return null;

  const {
    price_correlation,
    flow_density,
    integration_score,
    accessibility
  } = data.market_integration;

  const spatialMetrics = data.spatial_autocorrelation?.global ?? {};

  return {
    correlationMatrix: price_correlation ?? {},
    flowDensity: flow_density ?? 0,
    integrationScore: integration_score ?? 0,
    spatialDependence: spatialMetrics.moran_i ?? 0,
    accessibility: accessibility ?? {},
    significance: spatialMetrics.significance ?? false
  };
}

export function calculateIntegration(spatialAutocorrelation) {
  if (!spatialAutocorrelation?.I) return 0;
  return spatialAutocorrelation.I;
}

export function calculateShockFrequency(shocks, timeRange) {
  if (!Array.isArray(shocks) || !shocks.length) return {
    frequency: 0,
    patterns: [],
    average_magnitude: 0
  };

  const uniqueMonths = new Set(shocks.map(s => s.date.substring(0, 7)));
  const frequency = shocks.length / uniqueMonths.size;

  const patterns = {
    price_surge: shocks.filter(s => s.shock_type === 'price_surge').length,
    price_drop: shocks.filter(s => s.shock_type === 'price_drop').length,
    average_magnitude: shocks.reduce((acc, s) => acc + s.magnitude, 0) / shocks.length
  };

  return {
    frequency,
    patterns,
    average_magnitude: patterns.average_magnitude
  };
}

export function calculateClusterEfficiency(clusters) {
  if (!Array.isArray(clusters) || !clusters.length) return {
    efficiency: 0,
    coverage: 0,
    stability: 0
  };

  const metrics = clusters.reduce((acc, cluster) => ({
    efficiency: acc.efficiency + (cluster.efficiency_score ?? 0),
    coverage: acc.coverage + (cluster.market_coverage ?? 0),
    stability: acc.stability + (cluster.stability ?? 0)
  }), { efficiency: 0, coverage: 0, stability: 0 });

  const count = clusters.length;
  return {
    efficiency: metrics.efficiency / count,
    coverage: metrics.coverage / count,
    stability: metrics.stability / count
  };
}

export function calculateCompositeMetrics(data) {
  const volatility = calculateVolatility(data.time_series_data);
  const integration = calculateMarketIntegration(data);
  const shocks = calculateShockFrequency(data.market_shocks);
  const efficiency = calculateClusterEfficiency(data.cluster_efficiency);

  return {
    market_stability: {
      price_stability: volatility.stability,
      garch_volatility: volatility.garch,
      shock_resistance: 1 - (shocks.frequency / 12) // Normalize to yearly basis
    },
    market_integration: {
      spatial_correlation: integration.spatialDependence,
      flow_density: integration.flowDensity,
      cluster_efficiency: efficiency.efficiency
    },
    conflict_impact: {
      price_effect: data.time_series_data?.slice(-1)[0]?.conflict_intensity ?? 0,
      market_disruption: 1 - efficiency.stability
    }
  };
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
    marketCoverage: calculateCoverage(data.marketClusters),
    flowDensity: calculateFlowDensity(data.flowMaps),
    priceCorrelation: calculatePriceCorrelation(data.timeSeriesData),
    overallVolatility: calculateVolatility(data.timeSeriesData),
    overallIntegration: calculateIntegration(data.spatialAutocorrelation),
    overallShockFrequency: calculateShockFrequency(data.detectedShocks),
    overallClusterEfficiency: calculateClusterEfficiency(data.marketClusters),
  };
}

export function validateCoordinates(coordinates) {
  if (!coordinates || !Array.isArray(coordinates)) return false;
  const [lat, lng] = coordinates;
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

// Add to marketAnalysisUtils.js
export function calculateFlowMetrics(flowData) {
  if (!Array.isArray(flowData)) return null;
  
  return {
    marketCoverage: calculateFlowCoverage(flowData),
    flowDensity: calculateFlowDensity(flowData),
    networkEfficiency: calculateNetworkEfficiency(flowData)
  };
}

export function calculateFlowCoverage(flows) {
  const uniqueMarkets = new Set();
  flows.forEach(flow => {
    uniqueMarkets.add(flow.source);
    uniqueMarkets.add(flow.target);
  });
  return uniqueMarkets.size;
}

export function calculateNetworkEfficiency(flows) {
  const totalFlow = flows.reduce((sum, flow) => sum + flow.flow_weight, 0);
  const avgFlow = totalFlow / flows.length;
  return {
    totalFlow,
    avgFlow,
    flowCount: flows.length
  };
}

// Add to marketAnalysisUtils.js
export function calculateEnhancedIntegrationScore(data) {
  const weights = {
    price_correlation: 0.35,
    flow_density: 0.25,
    accessibility: 0.20,
    stability: 0.20
  };

  // Get the core metrics
  const correlationScore = calculateCorrelationScore(data.price_correlation);
  const flowScore = calculateFlowScore(data.flow_analysis);
  const accessScore = calculateAccessibilityScore(data.accessibility);
  const stabilityScore = calculateStabilityScore(data.market_shocks);

  // Calculate weighted score with error handling
  let totalScore = 0;
  let totalWeight = 0;

  Object.entries({
    price_correlation: correlationScore,
    flow_density: flowScore,
    accessibility: accessScore,
    stability: stabilityScore
  }).forEach(([metric, score]) => {
    if (typeof score === 'number' && !isNaN(score)) {
      totalScore += score * (weights[metric] || 0);
      totalWeight += weights[metric] || 0;
    }
  });

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function calculateCorrelationScore(correlation) {
  if (!correlation) return 0;
  
  const values = Object.values(correlation)
    .flatMap(obj => Object.values(obj))
    .filter(v => typeof v === 'number');
    
  return values.length ? 
    values.reduce((sum, v) => sum + v, 0) / values.length : 
    0;
}

function calculateAccessibilityScore(accessibility) {
  if (!accessibility) return 0;
  
  const values = Object.values(accessibility)
    .filter(v => typeof v === 'number');
    
  return values.length ? 
    values.reduce((sum, v) => sum + v, 0) / values.length : 
    0;
}

export function calculateFlowPriceDifferentials(flows, timeSeriesData) {
  if (!Array.isArray(flows) || !Array.isArray(timeSeriesData)) return flows;

  const latestPrices = timeSeriesData.reduce((acc, entry) => {
    if (entry.region && typeof entry.avgUsdPrice === 'number') {
      acc[entry.region] = entry.avgUsdPrice;
    }
    return acc;
  }, {});

  return flows.map(flow => ({
    ...flow,
    price_differential: Math.abs(
      (latestPrices[flow.source] || 0) - 
      (latestPrices[flow.target] || 0)
    ),
    source_price: latestPrices[flow.source] || 0,
    target_price: latestPrices[flow.target] || 0
  }));
}