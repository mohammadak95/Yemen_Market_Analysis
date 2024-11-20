// src/utils/marketAnalysisUtils.js

import { ANALYSIS_THRESHOLDS } from '../constants/index';


export function calculateVolatility(timeSeriesData) {
  if (!timeSeriesData.length) return {
    garch: 0,
    traditional: 0,
    stability: 0
  };

  const latestEntry = timeSeriesData[timeSeriesData.length - 1];
  
  // Use precomputed metrics when available
  const garchVolatility = latestEntry.garch_volatility ?? 0;
  const priceStability = latestEntry.price_stability ?? 0;

  // Calculate traditional volatility as backup
  const prices = timeSeriesData.reduce((acc, d) => {
    if (d.avgUsdPrice != null) acc.push(d.avgUsdPrice);
    return acc;
  }, []);
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
  if (!data.market_integration) return null;

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
  if (!Array.isArray(shocks) || shocks.length === 0) return {
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
  if (!clusters.length) return null;

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

export const calculateVisualizationMetrics = {
  prices: {
    calculateTrends: (timeSeriesData) => {
      if (!timeSeriesData?.length) return null;
      
      const prices = timeSeriesData.map(d => ({
        date: new Date(d.month),
        price: d.avgUsdPrice
      }));

      // Sort by date
      prices.sort((a, b) => a.date - b.date);

      // Calculate moving averages
      const shortTermMA = calculateMovingAverage(prices, 3);
      const longTermMA = calculateMovingAverage(prices, 12);

      // Calculate trends
      return {
        shortTerm: calculateTrendSlope(shortTermMA),
        longTerm: calculateTrendSlope(longTermMA),
        volatility: calculateVolatilityMetrics(prices),
        seasonality: detectSeasonalPattern(prices)
      };
    },

    processTimeSeries: (data, timeRange = null) => {
      let processedData = data.map(d => ({
        date: new Date(d.month),
        value: d.avgUsdPrice,
        volatility: d.volatility,
        conflictIntensity: d.conflict_intensity
      }));

      if (timeRange) {
        const [start, end] = timeRange;
        processedData = processedData.filter(d => 
          d.date >= start && d.date <= end
        );
      }

      return processedData;
    }
  },

  integration: {
    calculateMetrics: (data) => {
      const {
        marketIntegration,
        flowAnalysis,
        spatialAutocorrelation
      } = data;

      // Process correlation matrix
      const correlationMatrix = processCorrelationMatrix(
        marketIntegration.price_correlation
      );

      // Calculate flow-based metrics
      const flowMetrics = calculateFlowMetrics(flowAnalysis);

      // Calculate spatial metrics
      const spatialMetrics = calculateSpatialMetrics(
        spatialAutocorrelation
      );

      return {
        correlationMatrix,
        flowMetrics,
        spatialMetrics,
        integrationScore: calculateOverallIntegration({
          correlationMatrix,
          flowMetrics,
          spatialMetrics
        })
      };
    },

    calculateMarketConnectivity: (flowAnalysis) => {
      return _.mapValues(_.groupBy(flowAnalysis, 'source'), flows => ({
          totalFlow: _.sumBy(flows, 'total_flow'),
          averageFlow: _.meanBy(flows, 'avg_flow'),
          uniqueConnections: _.uniqBy(flows, 'target').length
        }));
    }
  },

  clusters: {
    analyzeEfficiency: (clusters, flows) => {
      return clusters.map(cluster => ({
        ...cluster,
        metrics: {
          internalConnectivity: calculateInternalConnectivity(
            cluster,
            flows
          ),
          marketCoverage: calculateClusterCoverage(cluster),
          priceConvergence: calculatePriceConvergence(
            cluster,
            flows
          ),
          stability: calculateClusterStability(cluster)
        },
        spatialMetrics: analyzeSpatialDistribution(
          cluster,
          flows
        )
      }));
    },

    calculateClusterDynamics: (clusters, timeSeriesData) => {
      return clusters.map(cluster => ({
        ...cluster,
        dynamics: {
          stability: assessClusterStability(
            cluster,
            timeSeriesData
          ),
          evolution: trackClusterEvolution(
            cluster,
            timeSeriesData
          ),
          resilience: measureClusterResilience(
            cluster,
            timeSeriesData
          )
        }
      }));
    }
  },

  shocks: {
    analyzePatterns: (shocks, timeSeriesData) => {
      // Group shocks by region
      const shocksByRegion = _.groupBy(shocks, 'region');

      return _.mapValues(shocksByRegion, (regionShocks) => ({
        frequency: calculateShockFrequency(regionShocks),
        magnitude: calculateAverageMagnitude(regionShocks),
        recovery: analyzeRecoveryPatterns(
          regionShocks,
          timeSeriesData
        ),
        propagation: analyzeShockPropagation(
          regionShocks,
          timeSeriesData
        )
      }));
    },

    calculateSystemwideImpact: (shocks, timeSeriesData) => {
      return {
        overallVolatility: calculateSystemVolatility(
          shocks,
          timeSeriesData
        ),
        marketVulnerability: assessMarketVulnerability(
          shocks,
          timeSeriesData
        ),
        recoveryMetrics: analyzeSystemRecovery(
          shocks,
          timeSeriesData
        )
      };
    }
  }
};

// Helper functions for price analysis
function calculateMovingAverage(data, window) {
  return data.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const values = data.slice(start, index + 1);
    return {
      date: data[index].date,
      value: _.meanBy(values, 'price')
    };
  });
}

function calculateTrendSlope(data) {
  const n = data.length;
  if (n < 2) return 0;

  const xMean = _.meanBy(data, (_, i) => i);
  const yMean = _.meanBy(data, 'value');

  const numerator = _.sum(data.map((point, i) => 
    (i - xMean) * (point.value - yMean)
  ));

  const denominator = _.sum(data.map((_, i) => 
    Math.pow(i - xMean, 2)
  ));

  return numerator / denominator;
}

function detectSeasonalPattern(data) {
  // Group by month
  const monthlyData = _.groupBy(data, d => 
    d.date.getMonth()
  );

  // Calculate monthly averages
  return _.mapValues(monthlyData, monthData => ({
    average: _.meanBy(monthData, 'price'),
    volatility: calculateVolatility(monthData.map(d => d.price)),
    trend: calculateTrendSlope(monthData)
  }));
}

// Helper functions for integration analysis
function processCorrelationMatrix(matrix) {
  const markets = Object.keys(matrix);
  
  // Calculate key metrics
  const metrics = {
    averageCorrelation: calculateAverageCorrelation(matrix),
    strongConnections: countStrongConnections(
      matrix,
      ANALYSIS_THRESHOLDS.MARKET_INTEGRATION.HIGH
    ),
    weakConnections: countWeakConnections(
      matrix,
      ANALYSIS_THRESHOLDS.MARKET_INTEGRATION.LOW
    )
  };

  // Identify market clusters
  const clusters = identifyMarketClusters(
    matrix,
    ANALYSIS_THRESHOLDS.MARKET_INTEGRATION.MODERATE
  );

  return {
    matrix,
    metrics,
    clusters
  };
}

function calculateFlowMetrics(flows) {
  const metrics = {
    totalFlow: _.sumBy(flows, 'total_flow'),
    averageFlow: _.meanBy(flows, 'avg_flow'),
    flowDensity: calculateFlowDensity(flows),
    directionality: analyzeFlowDirectionality(flows)
  };

  const patterns = {
    seasonal: detectFlowSeasonality(flows),
    structural: identifyStructuralPatterns(flows),
    anomalies: detectFlowAnomalies(flows)
  };

  return {
    metrics,
    patterns
  };
}

// Export utility functions
export const marketAnalysisUtils = {
  calculateVisualizationMetrics,
  calculateMovingAverage,
  calculateTrendSlope,
  detectSeasonalPattern,
  processCorrelationMatrix,
  calculateFlowMetrics
};
