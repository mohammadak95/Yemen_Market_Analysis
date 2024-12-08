// src/components/spatialAnalysis/features/clusters/utils/clusterCalculations.js

import { transformRegionName } from '../../../utils/spatialUtils';

export const calculateClusterMetrics = (clusters, timeSeriesData, flows) => {
  if (!clusters?.length || !timeSeriesData?.length || !flows?.length) {
    console.warn('Missing required data for cluster metrics calculation:', {
      hasClusters: Boolean(clusters?.length),
      hasTimeSeries: Boolean(timeSeriesData?.length),
      hasFlows: Boolean(flows?.length)
    });
    return { clusters: [], metrics: null };
  }

  // Debug input data
  console.debug('Calculating cluster metrics with:', {
    clustersCount: clusters.length,
    timeSeriesCount: timeSeriesData.length,
    flowsCount: flows.length,
    sampleCluster: clusters[0],
    sampleTimeSeries: timeSeriesData[0],
    sampleFlow: flows[0]
  });

  // Create time series lookup map for performance
  const timeSeriesMap = new Map();
  timeSeriesData.forEach(d => {
    const key = transformRegionName(d.region);
    if (!timeSeriesMap.has(key)) {
      timeSeriesMap.set(key, []);
    }
    timeSeriesMap.get(key).push(d);
  });

  // Create flows lookup map for performance
  const flowsMap = new Map();
  flows.forEach(flow => {
    const source = transformRegionName(flow.source);
    const target = transformRegionName(flow.target);
    const key1 = `${source}-${target}`;
    const key2 = `${target}-${source}`;
    flowsMap.set(key1, flow);
    flowsMap.set(key2, flow); // Store both directions
  });

  // Debug maps
  console.debug('Data maps created:', {
    timeSeriesKeys: Array.from(timeSeriesMap.keys()),
    flowKeys: Array.from(flowsMap.keys()).slice(0, 5) // Show first 5 flow keys
  });

  // Calculate enhanced cluster metrics
  const enhancedClusters = clusters.map(cluster => {
    const connectedMarkets = cluster.connected_markets.map(m => transformRegionName(m));
    
    console.debug(`Processing cluster ${cluster.main_market}:`, {
      marketCount: connectedMarkets.length,
      markets: connectedMarkets
    });

    // Market Connectivity (40%)
    const potentialConnections = (connectedMarkets.length * (connectedMarkets.length - 1)) / 2;
    let actualConnections = 0;
    const connections = [];

    for (let i = 0; i < connectedMarkets.length; i++) {
      for (let j = i + 1; j < connectedMarkets.length; j++) {
        const key = `${connectedMarkets[i]}-${connectedMarkets[j]}`;
        const reverseKey = `${connectedMarkets[j]}-${connectedMarkets[i]}`;
        if (flowsMap.has(key) || flowsMap.has(reverseKey)) {
          actualConnections++;
          connections.push([connectedMarkets[i], connectedMarkets[j]]);
        }
      }
    }

    const connectivityScore = potentialConnections > 0 ? 
      actualConnections / potentialConnections : 0;

    console.debug('Connectivity calculation:', {
      potentialConnections,
      actualConnections,
      connectivityScore,
      sampleConnections: connections.slice(0, 3)
    });

    // Price Integration (30%)
    const marketPrices = {};
    connectedMarkets.forEach(market => {
      const marketData = timeSeriesMap.get(market) || [];
      const prices = marketData
        .filter(d => d.usdPrice != null && !isNaN(d.usdPrice))
        .map(d => d.usdPrice);
      if (prices.length > 0) {
        marketPrices[market] = prices;
      }
    });

    let totalCorrelation = 0;
    let correlationPairs = 0;
    const correlations = [];

    Object.entries(marketPrices).forEach(([m1, prices1]) => {
      Object.entries(marketPrices).forEach(([m2, prices2]) => {
        if (m1 < m2 && prices1.length > 1 && prices2.length > 1) {
          const minLength = Math.min(prices1.length, prices2.length);
          const p1 = prices1.slice(0, minLength);
          const p2 = prices2.slice(0, minLength);
          
          const correlation = calculateCorrelation(p1, p2);
          if (!isNaN(correlation)) {
            const normalizedCorr = (correlation + 1) / 2; // Normalize to 0-1
            totalCorrelation += normalizedCorr;
            correlationPairs++;
            correlations.push({ markets: [m1, m2], correlation: normalizedCorr });
          }
        }
      });
    });

    const priceIntegrationScore = correlationPairs > 0 ? 
      totalCorrelation / correlationPairs : 0;

    console.debug('Price Integration calculation:', {
      marketsWithPrices: Object.keys(marketPrices).length,
      correlationPairs,
      priceIntegrationScore,
      sampleCorrelations: correlations.slice(0, 3)
    });

    // Price Stability (20%)
    const volatilities = Object.entries(marketPrices)
      .filter(([_, prices]) => prices.length > 1)
      .map(([market, prices]) => {
        const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
        const volatility = Math.sqrt(variance) / avg;
        return { market, volatility };
      });

    const avgVolatility = volatilities.length > 0 ?
      volatilities.reduce((sum, v) => sum + v.volatility, 0) / volatilities.length : 1;
    
    const stabilityScore = Math.max(0, 1 - Math.min(avgVolatility, 1));

    console.debug('Price Stability calculation:', {
      marketsWithVolatility: volatilities.length,
      avgVolatility,
      stabilityScore,
      sampleVolatilities: volatilities.slice(0, 3)
    });

    // Conflict Resilience (10%)
    const marketConflicts = new Map();
    let totalConflict = 0;
    let conflictCount = 0;

    connectedMarkets.forEach(market => {
      const marketData = timeSeriesMap.get(market) || [];
      const conflicts = marketData
        .filter(d => d.conflictIntensity != null && !isNaN(d.conflictIntensity))
        .map(d => d.conflictIntensity);
      
      if (conflicts.length > 0) {
        const avgMarketConflict = conflicts.reduce((sum, c) => sum + c, 0) / conflicts.length;
        marketConflicts.set(market, avgMarketConflict);
        totalConflict += avgMarketConflict;
        conflictCount++;
      }
    });

    const avgConflict = conflictCount > 0 ? totalConflict / conflictCount : 10;
    const conflictResilienceScore = Math.max(0, 1 - (avgConflict / 10));

    console.debug('Conflict Resilience calculation:', {
      marketsWithConflictData: marketConflicts.size,
      avgConflict,
      conflictResilienceScore,
      sampleConflicts: Array.from(marketConflicts.entries()).slice(0, 3)
    });

    // Calculate overall efficiency with weights
    const efficiency = 
      (connectivityScore * 0.4) +
      (priceIntegrationScore * 0.3) +
      (stabilityScore * 0.2) +
      (conflictResilienceScore * 0.1);

    // Calculate cluster-wide averages
    const avgPrice = Object.values(marketPrices)
      .flat()
      .reduce((sum, price) => sum + price, 0) / 
      Object.values(marketPrices)
        .flat()
        .length || 0;

    const metrics = {
      efficiency,
      efficiencyComponents: {
        connectivity: connectivityScore,
        priceIntegration: priceIntegrationScore,
        stability: stabilityScore,
        conflictResilience: conflictResilienceScore
      },
      avgPrice,
      avgConflict,
      marketCount: connectedMarkets.length
    };

    console.debug(`Final metrics for cluster ${cluster.main_market}:`, metrics);

    return {
      ...cluster,
      metrics
    };
  });

  // Calculate system-wide metrics
  const overallMetrics = {
    totalMarkets: enhancedClusters.reduce((sum, c) => sum + c.metrics.marketCount, 0),
    avgPrice: enhancedClusters.reduce((sum, c) => sum + c.metrics.avgPrice, 0) / enhancedClusters.length,
    avgConflict: enhancedClusters.reduce((sum, c) => sum + c.metrics.avgConflict, 0) / enhancedClusters.length,
    avgEfficiency: enhancedClusters.reduce((sum, c) => sum + c.metrics.efficiency, 0) / enhancedClusters.length
  };

  console.debug('Overall system metrics:', overallMetrics);

  return { clusters: enhancedClusters, metrics: overallMetrics };
};

// Helper function for correlation calculation
function calculateCorrelation(prices1, prices2) {
  if (prices1.length !== prices2.length || prices1.length < 2) return 0;

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
  return denominator === 0 ? 0 : numerator / denominator;
}

export default {
  calculateClusterMetrics,
  calculateCorrelation
};
