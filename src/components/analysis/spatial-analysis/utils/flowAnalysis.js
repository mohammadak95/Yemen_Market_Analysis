// src/components/analysis/spatial-analysis/utils/flowAnalysis.js

import _ from 'lodash';

/**
 * Calculate flow metrics for market connections
 * @param {Array} flows - Array of flow data between markets
 * @param {number} threshold - Minimum flow value to consider
 * @returns {Object} Calculated flow metrics
 */
export const calculateFlowMetrics = (flows, threshold) => {
  const filteredFlows = flows.filter(flow => flow.total_flow >= threshold);
  
  // Sort flows by total_flow to get top flows
  const topFlows = _.orderBy(filteredFlows, ['total_flow'], ['desc']).slice(0, 5);
  
  return {
    totalFlows: _.sumBy(filteredFlows, 'total_flow'),
    averageFlow: _.meanBy(filteredFlows, 'total_flow'),
    maxFlow: _.maxBy(filteredFlows, 'total_flow')?.total_flow || 0,
    flowCount: filteredFlows.length,
    flowDensity: filteredFlows.length / (flows.length || 1),
    uniqueMarkets: _.uniq(filteredFlows.flatMap(f => [f.sourceName, f.targetName])).length,
    topFlows
  };
};

/**
 * Compute network statistics for market flows
 * @param {Array} flows - Array of flow data
 * @param {Object} marketIntegration - Market integration data
 * @returns {Object} Network statistics
 */
export const computeNetworkStatistics = (flows, marketIntegration) => {
  const markets = _.uniq(flows.flatMap(f => [f.sourceName, f.targetName]));
  const connections = flows.map(f => ({ source: f.sourceName, target: f.targetName }));
  const totalVolume = _.sumBy(flows, 'total_flow');
  
  return {
    networkDensity: connections.length / (markets.length * (markets.length - 1)),
    averageConnectivity: connections.length / markets.length,
    marketCount: markets.length,
    activeMarkets: markets.length,
    totalVolume: totalVolume,
    avgFlowSize: totalVolume / connections.length,
    flowDensity: connections.length / (markets.length * (markets.length - 1)),
    integrationScore: calculateIntegrationScore(flows, marketIntegration),
    centralityMetrics: calculateCentralityMetrics(flows, markets)
  };
};

/**
 * Aggregate flow data into time series format
 * @param {Array} flows - Array of flow data
 * @returns {Object} Aggregated time series data by different time periods
 */
export const aggregateTimeSeriesFlows = (flows) => {
  const dailyFlows = _.chain(flows)
    .groupBy('date')
    .map((dayFlows, date) => ({
      date,
      total_flow: _.sumBy(dayFlows, 'total_flow'),
      averageFlow: _.meanBy(dayFlows, 'total_flow'),
      activeConnections: dayFlows.length
    }))
    .orderBy('date')
    .value();

  // Group by week
  const weeklyFlows = _.chain(dailyFlows)
    .groupBy(flow => {
      const date = new Date(flow.date);
      const weekNumber = getWeekNumber(date);
      return `${date.getFullYear()}-W${weekNumber}`;
    })
    .map((weekFlows, week) => ({
      date: week,
      total_flow: _.sumBy(weekFlows, 'total_flow'),
      averageFlow: _.meanBy(weekFlows, 'averageFlow'),
      activeConnections: _.meanBy(weekFlows, 'activeConnections')
    }))
    .orderBy('date')
    .value();

  // Group by month
  const monthlyFlows = _.chain(dailyFlows)
    .groupBy(flow => flow.date.substring(0, 7))
    .map((monthFlows, month) => ({
      date: month,
      total_flow: _.sumBy(monthFlows, 'total_flow'),
      averageFlow: _.meanBy(monthFlows, 'averageFlow'),
      activeConnections: _.meanBy(monthFlows, 'activeConnections')
    }))
    .orderBy('date')
    .value();

  return {
    daily: dailyFlows,
    weekly: weeklyFlows,
    monthly: monthlyFlows
  };
};

/**
 * Calculate market integration score
 * @param {Array} flows - Array of flow data
 * @param {Object} marketIntegration - Market integration data
 * @returns {number} Integration score
 */
const calculateIntegrationScore = (flows, marketIntegration) => {
  if (!marketIntegration) return 0;
  
  const weightedScore = flows.reduce((score, flow) => {
    const integration = marketIntegration[`${flow.sourceName}-${flow.targetName}`] || 0;
    return score + (flow.total_flow * integration);
  }, 0);
  
  return weightedScore / (_.sumBy(flows, 'total_flow') || 1);
};

/**
 * Calculate centrality metrics for markets
 * @param {Array} flows - Array of flow data
 * @param {Array} markets - Array of unique markets
 * @returns {Object} Centrality metrics
 */
const calculateCentralityMetrics = (flows, markets) => {
  const metrics = {};
  
  markets.forEach(market => {
    const outgoing = flows.filter(f => f.sourceName === market);
    const incoming = flows.filter(f => f.targetName === market);
    
    metrics[market] = {
      outDegree: outgoing.length,
      inDegree: incoming.length,
      totalFlow: _.sumBy(outgoing, 'total_flow') + _.sumBy(incoming, 'total_flow'),
      betweenness: calculateBetweenness(market, flows)
    };
  });
  
  return metrics;
};

/**
 * Calculate betweenness centrality for a market
 * @param {string} market - Market identifier
 * @param {Array} flows - Array of flow data
 * @returns {number} Betweenness centrality score
 */
const calculateBetweenness = (market, flows) => {
  const paths = findAllPaths(flows);
  let betweenness = 0;
  
  paths.forEach(path => {
    if (path.includes(market) && path[0] !== market && path[path.length - 1] !== market) {
      betweenness += 1;
    }
  });
  
  return betweenness;
};

/**
 * Find all possible paths in the flow network
 * @param {Array} flows - Array of flow data
 * @returns {Array} Array of paths
 */
const findAllPaths = (flows) => {
  const paths = [];
  const markets = _.uniq(flows.flatMap(f => [f.sourceName, f.targetName]));
  
  markets.forEach(source => {
    markets.forEach(target => {
      if (source !== target) {
        const path = findPath(source, target, flows);
        if (path) paths.push(path);
      }
    });
  });
  
  return paths;
};

/**
 * Find a path between two markets
 * @param {string} source - Source market
 * @param {string} target - Target market
 * @param {Array} flows - Array of flow data
 * @param {Set} visited - Set of visited markets
 * @returns {Array|null} Path if found, null otherwise
 */
const findPath = (source, target, flows, visited = new Set()) => {
  if (visited.has(source)) return null;
  visited.add(source);
  
  const directFlow = flows.find(f => f.sourceName === source && f.targetName === target);
  if (directFlow) return [source, target];
  
  for (const flow of flows) {
    if (flow.sourceName === source) {
      const path = findPath(flow.targetName, target, flows, visited);
      if (path) return [source, ...path];
    }
  }
  
  return null;
};

/**
 * Get week number for a given date
 * @param {Date} date - Date object
 * @returns {number} Week number
 */
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};