/**
 * Market Cluster Analysis Calculations
 */

import { transformRegionName } from '../../../utils/spatialUtils';
import { SIGNIFICANCE_LEVELS, EFFICIENCY_THRESHOLDS, COMPONENT_WEIGHTS } from '../types';

/**
 * Helper function for t-distribution probability
 */
function tDistribution(t, df) {
  // Approximation of t-distribution CDF
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df/2, 0.5, x);
}

/**
 * Helper function for incomplete beta function
 */
function incompleteBeta(a, b, x) {
  // Basic approximation for incomplete beta function
  if (x === 0) return 0;
  if (x === 1) return 1;
  return x ** a * (1 - x) ** b;
}

/**
 * Calculate correlation between price series with statistical validation
 */
function calculateCorrelation(prices1, prices2) {
  if (prices1.length !== prices2.length || prices1.length < 3) {
    return { correlation: 0, significant: false };
  }

  const avg1 = prices1.reduce((a, b) => a + b, 0) / prices1.length;
  const avg2 = prices2.reduce((a, b) => a + b, 0) / prices2.length;

  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;

  for (let i = 0; i < prices1.length; i++) {
    const diff1 = prices1[i] - avg1;
    const diff2 = prices2[i] - avg2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(denom1 * denom2);
  const correlation = denominator === 0 ? 0 : numerator / denominator;
  
  // Calculate statistical significance
  const t = correlation * Math.sqrt((prices1.length - 2) / (1 - correlation * correlation));
  const pValue = 2 * (1 - tDistribution(Math.abs(t), prices1.length - 2));

  return {
    correlation: (correlation + 1) / 2, // Normalize to 0-1
    significant: pValue <= SIGNIFICANCE_LEVELS.MEDIUM,
    details: {
      rawCorrelation: correlation,
      tStatistic: t,
      pValue,
      sampleSize: prices1.length
    }
  };
}

/**
 * Create optimized lookup map for time series data
 */
function createTimeSeriesMap(timeSeriesData) {
  const map = new Map();
  timeSeriesData.forEach(d => {
    const key = transformRegionName(d.region);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(d);
  });
  return map;
}

/**
 * Create optimized lookup map for flow data
 */
function createFlowsMap(flows) {
  const map = new Map();
  flows.forEach(flow => {
    const source = transformRegionName(flow.source);
    const target = transformRegionName(flow.target);
    const key1 = `${source}-${target}`;
    const key2 = `${target}-${source}`;
    map.set(key1, flow);
    map.set(key2, flow); // Store both directions
  });
  return map;
}

/**
 * Calculate market connectivity metrics
 */
function calculateConnectivity(markets, flowsMap) {
  const potentialConnections = (markets.length * (markets.length - 1)) / 2;
  let actualConnections = 0;
  const connections = [];
  let totalFlow = 0;

  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const key = `${markets[i]}-${markets[j]}`;
      const reverseKey = `${markets[j]}-${markets[i]}`;
      
      const flow = flowsMap.get(key) || flowsMap.get(reverseKey);
      if (flow) {
        actualConnections++;
        connections.push({
          source: markets[i],
          target: markets[j],
          flow: flow.total_flow,
          avgFlow: flow.avg_flow
        });
        totalFlow += flow.total_flow;
      }
    }
  }

  const score = potentialConnections > 0 ? actualConnections / potentialConnections : 0;
  const coverage = actualConnections / markets.length;

  return {
    score,
    details: {
      connections,
      coverage,
      density: score,
      summary: {
        actualConnections,
        potentialConnections,
        totalFlow,
        averageFlow: actualConnections > 0 ? totalFlow / actualConnections : 0
      }
    }
  };
}

/**
 * Calculate market correlations
 */
function calculateMarketCorrelations(marketPrices) {
  const result = {
    pairs: [],
    average: 0,
    significant: 0,
    total: 0
  };

  let totalCorrelation = 0;
  let correlationPairs = 0;

  Object.entries(marketPrices).forEach(([m1, prices1]) => {
    Object.entries(marketPrices).forEach(([m2, prices2]) => {
      if (m1 < m2 && prices1.length > 1 && prices2.length > 1) {
        const minLength = Math.min(prices1.length, prices2.length);
        const p1 = prices1.slice(0, minLength);
        const p2 = prices2.slice(0, minLength);
        
        const { correlation, significant } = calculateCorrelation(p1, p2);
        
        if (!isNaN(correlation)) {
          result.pairs.push({
            markets: [m1, m2],
            correlation,
            significant
          });

          totalCorrelation += correlation;
          correlationPairs++;
          if (significant) result.significant++;
        }
      }
    });
  });

  result.average = correlationPairs > 0 ? totalCorrelation / correlationPairs : 0;
  result.total = correlationPairs;

  return result;
}

/**
 * Calculate market volatilities
 */
function calculateMarketVolatilities(markets, timeSeriesMap) {
  const volatilities = {
    markets: [],
    average: 0,
    coverage: 0
  };

  let totalVolatility = 0;
  let marketsWithData = 0;

  markets.forEach(market => {
    const marketData = timeSeriesMap.get(market) || [];
    const prices = marketData
      .filter(d => d.usdPrice != null && !isNaN(d.usdPrice))
      .map(d => d.usdPrice);

    if (prices.length >= 2) {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
      const volatility = Math.sqrt(variance) / avg;

      volatilities.markets.push({ market, volatility });
      totalVolatility += volatility;
      marketsWithData++;
    }
  });

  volatilities.average = marketsWithData > 0 ? totalVolatility / marketsWithData : 1;
  volatilities.coverage = marketsWithData / markets.length;

  return volatilities;
}

/**
 * Calculate conflict impact across markets
 */
function calculateConflictResilience(markets, timeSeriesMap) {
  const result = {
    markets: [],
    average: 0,
    coverage: 0
  };

  let totalConflict = 0;
  let marketsWithData = 0;

  markets.forEach(market => {
    const marketData = timeSeriesMap.get(market) || [];
    const conflicts = marketData
      .filter(d => d.conflictIntensity != null && !isNaN(d.conflictIntensity))
      .map(d => d.conflictIntensity);
    
    if (conflicts.length > 0) {
      const avgMarketConflict = conflicts.reduce((sum, c) => sum + c, 0) / conflicts.length;
      result.markets.push({ market, conflict: avgMarketConflict });
      totalConflict += avgMarketConflict;
      marketsWithData++;
    }
  });

  result.average = marketsWithData > 0 ? totalConflict / marketsWithData : 0;
  result.coverage = marketsWithData / markets.length;
  result.score = Math.max(0, 1 - (result.average / 10));

  return result;
}

/**
 * Calculate price integration metrics
 */
function calculatePriceIntegration(markets, timeSeriesMap) {
  const marketPrices = {};
  let totalDataPoints = 0;

  markets.forEach(market => {
    const marketData = timeSeriesMap.get(market) || [];
    const prices = marketData
      .filter(d => d.usdPrice != null && !isNaN(d.usdPrice))
      .map(d => d.usdPrice);
    
    if (prices.length >= 3) {
      marketPrices[market] = prices;
      totalDataPoints += prices.length;
    }
  });

  const correlations = calculateMarketCorrelations(marketPrices);
  const avgPrice = Object.values(marketPrices)
    .flat()
    .reduce((sum, price) => sum + price, 0) / 
    Object.values(marketPrices)
      .flat()
      .length || 0;

  return {
    score: correlations.average,
    avgPrice,
    dataPoints: totalDataPoints,
    significance: correlations.significant / correlations.total,
    details: correlations
  };
}

/**
 * Calculate price stability metrics
 */
function calculateStability(markets, timeSeriesMap) {
  const volatilities = calculateMarketVolatilities(markets, timeSeriesMap);
  const score = Math.max(0, 1 - Math.min(volatilities.average, 1));

  return {
    score,
    details: volatilities
  };
}

/**
 * Calculate weighted efficiency score
 */
function calculateEfficiencyScore(scores) {
  return (
    scores.connectivity * COMPONENT_WEIGHTS.CONNECTIVITY +
    scores.priceIntegration * COMPONENT_WEIGHTS.PRICE_INTEGRATION +
    scores.stability * COMPONENT_WEIGHTS.STABILITY +
    scores.resilience * COMPONENT_WEIGHTS.RESILIENCE
  );
}

/**
 * Calculate reliability score
 */
function calculateReliabilityScore({ dataPoints, coverage, significance }) {
  const dataScore = Math.min(dataPoints / 100, 1);
  const coverageScore = coverage;
  const significanceScore = significance;

  return (dataScore + coverageScore + significanceScore) / 3;
}

/**
 * Create default metrics object
 */
function createDefaultMetrics() {
  return {
    efficiency: 0,
    efficiencyComponents: {
      connectivity: 0,
      priceIntegration: 0,
      stability: 0,
      conflictResilience: 0
    },
    avgPrice: 0,
    avgConflict: 0,
    marketCount: 0,
    reliability: 0,
    warning: 'Default metrics due to insufficient data'
  };
}

/**
 * Calculate overall system metrics
 */
function calculateOverallMetrics(clusters) {
  return {
    totalMarkets: clusters.reduce((sum, c) => sum + c.metrics.marketCount, 0),
    avgPrice: clusters.reduce((sum, c) => sum + c.metrics.avgPrice, 0) / clusters.length,
    avgConflict: clusters.reduce((sum, c) => sum + c.metrics.avgConflict, 0) / clusters.length,
    avgEfficiency: clusters.reduce((sum, c) => sum + c.metrics.efficiency, 0) / clusters.length,
    reliability: clusters.reduce((sum, c) => sum + (c.metrics.reliability || 0), 0) / clusters.length
  };
}

/**
 * Calculate comprehensive metrics for market clusters
 */
export const calculateClusterMetrics = (clusters, timeSeriesData, flows) => {
  // Input validation
  if (!Array.isArray(clusters) || !clusters.length) {
    console.error('Invalid or empty clusters array provided');
    return { clusters: [], metrics: null, error: 'Invalid clusters data' };
  }
  if (!Array.isArray(timeSeriesData) || !timeSeriesData.length) {
    console.error('Invalid or empty time series data provided');
    return { clusters: [], metrics: null, error: 'Invalid time series data' };
  }
  if (!Array.isArray(flows) || !flows.length) {
    console.error('Invalid or empty flows data provided');
    return { clusters: [], metrics: null, error: 'Invalid flows data' };
  }

  try {
    // Create optimized data lookups
    const timeSeriesMap = createTimeSeriesMap(timeSeriesData);
    const flowsMap = createFlowsMap(flows);

    // Calculate enhanced cluster metrics
    const enhancedClusters = clusters.map(cluster => {
      const connectedMarkets = cluster.connected_markets.map(m => transformRegionName(m));
      
      // Skip clusters with insufficient markets
      if (connectedMarkets.length < 2) {
        console.warn(`Cluster ${cluster.main_market} has insufficient markets:`, connectedMarkets.length);
        return {
          ...cluster,
          metrics: createDefaultMetrics(),
          warning: 'Insufficient markets for reliable analysis'
        };
      }

      // Calculate component scores
      const connectivityMetrics = calculateConnectivity(connectedMarkets, flowsMap);
      const priceMetrics = calculatePriceIntegration(connectedMarkets, timeSeriesMap);
      const stabilityMetrics = calculateStability(connectedMarkets, timeSeriesMap);
      const resilienceMetrics = calculateConflictResilience(connectedMarkets, timeSeriesMap);

      // Calculate weighted efficiency score
      const efficiency = calculateEfficiencyScore({
        connectivity: connectivityMetrics.score,
        priceIntegration: priceMetrics.score,
        stability: stabilityMetrics.score,
        resilience: resilienceMetrics.score
      });

      const metrics = {
        efficiency,
        efficiencyComponents: {
          connectivity: connectivityMetrics.score,
          priceIntegration: priceMetrics.score,
          stability: stabilityMetrics.score,
          conflictResilience: resilienceMetrics.score
        },
        details: {
          connectivity: connectivityMetrics.details,
          priceIntegration: priceMetrics.details,
          stability: stabilityMetrics.details,
          resilience: resilienceMetrics.details
        },
        avgPrice: priceMetrics.avgPrice,
        avgConflict: resilienceMetrics.average,
        marketCount: connectedMarkets.length,
        reliability: calculateReliabilityScore({
          dataPoints: priceMetrics.dataPoints,
          coverage: connectivityMetrics.details.coverage,
          significance: priceMetrics.significance
        })
      };

      return { ...cluster, metrics };
    });

    // Calculate system-wide metrics
    const overallMetrics = calculateOverallMetrics(enhancedClusters);

    return { 
      clusters: enhancedClusters, 
      metrics: overallMetrics,
      metadata: {
        timestamp: new Date().toISOString(),
        dataPoints: timeSeriesData.length,
        flowCount: flows.length,
        clusterCount: clusters.length
      }
    };
  } catch (error) {
    console.error('Error calculating cluster metrics:', error);
    return { 
      clusters: [], 
      metrics: null, 
      error: error.message 
    };
  }
};

export default {
  calculateClusterMetrics,
  calculateCorrelation,
  calculateConnectivity,
  calculatePriceIntegration,
  calculateStability,
  calculateConflictResilience,
  createTimeSeriesMap,
  createFlowsMap
};
