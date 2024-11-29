//src/components/analysis/spatial-analysis/utils/marketAnalysis.js
import _ from 'lodash';

/**
 * Calculate market flow metrics
 */
export const calculateFlowMetrics = (flows, markets) => {
  if (!flows?.length || !markets?.length) return null;

  const marketFlows = {};
  markets.forEach(market => {
    marketFlows[market] = {
      inbound: [],
      outbound: [],
      total: 0,
      connections: new Set()
    };
  });

  flows.forEach(flow => {
    if (marketFlows[flow.source]) {
      marketFlows[flow.source].outbound.push(flow);
      marketFlows[flow.source].total += flow.total_flow || 0;
      marketFlows[flow.source].connections.add(flow.target);
    }
    if (marketFlows[flow.target]) {
      marketFlows[flow.target].inbound.push(flow);
      marketFlows[flow.target].total += flow.total_flow || 0;
      marketFlows[flow.target].connections.add(flow.source);
    }
  });

  return markets.map(market => ({
    market,
    inboundFlow: _.sumBy(marketFlows[market].inbound, 'total_flow'),
    outboundFlow: _.sumBy(marketFlows[market].outbound, 'total_flow'),
    totalFlow: marketFlows[market].total,
    connectionCount: marketFlows[market].connections.size,
    averageFlow: marketFlows[market].total / 
      (marketFlows[market].connections.size || 1),
    flowBalance: calculateFlowBalance(
      marketFlows[market].inbound, 
      marketFlows[market].outbound
    )
  }));
};

/**
 * Calculate market price correlations
 */
export const calculatePriceCorrelations = (timeSeriesData, markets) => {
  if (!timeSeriesData?.length || !markets?.length) return null;

  const marketPrices = {};
  markets.forEach(market => {
    marketPrices[market] = timeSeriesData
      .filter(d => d.region === market)
      .map(d => d.usdPrice)
      .filter(price => typeof price === 'number' && !isNaN(price));
  });

  const correlations = {};
  markets.forEach(market1 => {
    correlations[market1] = {};
    markets.forEach(market2 => {
      if (market1 === market2) {
        correlations[market1][market2] = 1;
      } else if (!correlations[market2]?.[market1]) {
        correlations[market1][market2] = calculatePriceCorrelation(
          marketPrices[market1],
          marketPrices[market2]
        );
      }
    });
  });

  return correlations;
};

/**
 * Calculate market integration scores
 */
export const calculateMarketIntegration = (
  priceCorrelations,
  flowMetrics,
  spatialWeights
) => {
  if (!priceCorrelations || !flowMetrics || !spatialWeights) return null;

  const markets = Object.keys(priceCorrelations);
  const integrationScores = {};

  markets.forEach(market => {
    const correlationScore = calculateCorrelationScore(
      priceCorrelations[market]
    );
    const flowScore = calculateFlowScore(
      flowMetrics.find(m => m.market === market)
    );
    const spatialScore = calculateSpatialScore(
      market,
      spatialWeights
    );

    integrationScores[market] = {
      correlationScore,
      flowScore,
      spatialScore,
      totalScore: (
        correlationScore * 0.4 +
        flowScore * 0.3 +
        spatialScore * 0.3
      )
    };
  });

  return integrationScores;
};

/**
 * Calculate market clustering coefficient
 */
export const calculateClusteringCoefficient = (
  market,
  flows,
  markets
) => {
  if (!flows?.length || !markets?.length) return 0;

  const neighbors = new Set(
    flows
      .filter(f => f.source === market || f.target === market)
      .map(f => f.source === market ? f.target : f.source)
  );

  if (neighbors.size < 2) return 0;

  const possibleConnections = (neighbors.size * (neighbors.size - 1)) / 2;
  const actualConnections = flows.filter(f => 
    neighbors.has(f.source) && 
    neighbors.has(f.target)
  ).length;

  return actualConnections / possibleConnections;
};

// Helper functions
const calculateFlowBalance = (inbound, outbound) => {
  const inFlow = _.sumBy(inbound, 'total_flow') || 0;
  const outFlow = _.sumBy(outbound, 'total_flow') || 0;
  const totalFlow = inFlow + outFlow;

  return totalFlow === 0 ? 0 : (outFlow - inFlow) / totalFlow;
};

const calculatePriceCorrelation = (prices1, prices2) => {
  if (!prices1?.length || !prices2?.length || 
      prices1.length !== prices2.length) return 0;

  const mean1 = _.mean(prices1);
  const mean2 = _.mean(prices2);
  let num = 0;
  let den1 = 0;
  let den2 = 0;

  for (let i = 0; i < prices1.length; i++) {
    const diff1 = prices1[i] - mean1;
    const diff2 = prices2[i] - mean2;
    num += diff1 * diff2;
    den1 += diff1 * diff1;
    den2 += diff2 * diff2;
  }

  return num / (Math.sqrt(den1 * den2) || 1);
};

const calculateCorrelationScore = (correlations) => {
  const values = Object.values(correlations)
    .filter(v => typeof v === 'number' && !isNaN(v));
  
  return _.mean(values) || 0;
};

const calculateFlowScore = (metrics) => {
  if (!metrics) return 0;

  const {
    totalFlow,
    connectionCount,
    averageFlow,
    flowBalance
  } = metrics;

  return (
    (totalFlow ? 1 : 0) * 0.3 +
    (connectionCount / 20) * 0.3 +  // Normalize by expected max connections
    (averageFlow / 100) * 0.2 +     // Normalize by expected max flow
    (1 - Math.abs(flowBalance)) * 0.2
  );
};

const calculateSpatialScore = (market, weights) => {
  const marketWeights = weights[market] || {};
  return _.mean(Object.values(marketWeights)) || 0;
};

export default {
  calculateFlowMetrics,
  calculatePriceCorrelations,
  calculateMarketIntegration,
  calculateClusteringCoefficient
};