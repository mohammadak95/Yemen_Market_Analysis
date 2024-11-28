// src/components/analysis/spatial-analysis/utils/networkAnalysis.js

import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

/**
 * Calculate eigenvector centrality for network nodes
 */
export const calculateEigenvectorCentrality = (nodes, links) => {
  try {
    // Initialize centrality values
    const centrality = {};
    nodes.forEach(node => {
      centrality[node.id] = 1;
    });

    // Power iteration method
    const iterations = 100;
    const tolerance = 0.0001;
    let prevCentrality = { ...centrality };

    for (let i = 0; i < iterations; i++) {
      let maxDiff = 0;
      const newCentrality = {};
      
      // Reset values
      nodes.forEach(node => {
        newCentrality[node.id] = 0;
      });

      // Update centrality values
      links.forEach(link => {
        newCentrality[link.target] += centrality[link.source] * link.value;
        newCentrality[link.source] += centrality[link.target] * link.value;
      });

      // Normalize
      const norm = Math.sqrt(Object.values(newCentrality).reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        nodes.forEach(node => {
          newCentrality[node.id] /= norm;
          maxDiff = Math.max(maxDiff, Math.abs(newCentrality[node.id] - prevCentrality[node.id]));
        });
      }

      // Update values
      prevCentrality = { ...centrality };
      Object.assign(centrality, newCentrality);

      if (maxDiff < tolerance) break;
    }

    const maxCentrality = Math.max(...Object.values(centrality));

    return {
      centrality,
      metrics: {
        maxCentrality,
        normalizedCentrality: Object.fromEntries(
          Object.entries(centrality).map(([id, value]) => [id, value / maxCentrality])
        )
      }
    };
  } catch (error) {
    console.error('Error calculating centrality:', error);
    return {
      centrality: {},
      metrics: { maxCentrality: 0, normalizedCentrality: {} }
    };
  }
};

/**
 * Calculate market integration score
 */
export const calculateMarketIntegrationScore = (marketId, marketIntegration) => {
  try {
    if (!marketId || !marketIntegration) {
      return { integrationScore: 0, connections: 0 };
    }

    const marketData = marketIntegration[marketId] || {};
    const connections = Object.keys(marketData).length;
    const integrationScore = connections > 0 
      ? Object.values(marketData).reduce((sum, val) => sum + val, 0) / connections 
      : 0;

    return {
      integrationScore,
      connections
    };
  } catch (error) {
    console.error('Error calculating market integration:', error);
    return { integrationScore: 0, connections: 0 };
  }
};

/**
 * Calculate market influence metrics
 */
export const calculateMarketInfluence = (marketId, links, marketIntegration) => {
  try {
    if (!marketId || !links) {
      return { volumeShare: 0, connections: 0 };
    }

    const marketLinks = links.filter(
      link => link.source === marketId || link.target === marketId
    );

    const totalVolume = marketLinks.reduce((sum, link) => sum + link.value, 0);
    const totalNetworkVolume = links.reduce((sum, link) => sum + link.value, 0);
    
    return {
      volumeShare: totalNetworkVolume > 0 ? totalVolume / totalNetworkVolume : 0,
      connections: marketLinks.length
    };
  } catch (error) {
    console.error('Error calculating market influence:', error);
    return { volumeShare: 0, connections: 0 };
  }
};

/**
 * Identify key markets in the network
 */
export const identifyKeyMarkets = (links, marketIntegration) => {
  try {
    if (!links?.length) {
      return [];
    }

    // Create a map of total flows for each market
    const marketFlows = new Map();
    links.forEach(link => {
      const sourceFlow = marketFlows.get(link.source) || 0;
      const targetFlow = marketFlows.get(link.target) || 0;
      marketFlows.set(link.source, sourceFlow + link.value);
      marketFlows.set(link.target, targetFlow + link.value);
    });

    // Calculate connection counts
    const connectionCounts = new Map();
    links.forEach(link => {
      const sourceCount = connectionCounts.get(link.source) || 0;
      const targetCount = connectionCounts.get(link.target) || 0;
      connectionCounts.set(link.source, sourceCount + 1);
      connectionCounts.set(link.target, targetCount + 1);
    });

    // Identify key markets
    const markets = Array.from(marketFlows.keys());
    const keyMarkets = markets.map(market => {
      const totalFlow = marketFlows.get(market) || 0;
      const connections = connectionCounts.get(market) || 0;
      const avgFlow = connections > 0 ? totalFlow / connections : 0;

      return {
        market,
        totalFlow,
        connections,
        avgFlow,
        role: connections >= 5 ? 'hub' : 'secondary'
      };
    });

    // Sort by total flow
    return keyMarkets.sort((a, b) => b.totalFlow - a.totalFlow);

  } catch (error) {
    console.error('Error identifying key markets:', error);
    backgroundMonitor.logError('key-markets-identification', error);
    return [];
  }
};

/**
 * Analyze market network structure
 */
export const analyzeMarketNetwork = (links, marketIntegration) => {
  try {
    if (!links?.length) {
      return { markets: {}, metrics: {} };
    }

    // Analyze individual markets
    const marketAnalysis = {};
    const uniqueMarkets = new Set();
    
    links.forEach(link => {
      uniqueMarkets.add(link.source);
      uniqueMarkets.add(link.target);

      // Source market analysis
      if (!marketAnalysis[link.source]) {
        marketAnalysis[link.source] = {
          flows: { totalVolume: 0, connections: 0 },
          integration: calculateMarketIntegrationScore(link.source, marketIntegration)
        };
      }
      marketAnalysis[link.source].flows.totalVolume += link.value;
      marketAnalysis[link.source].flows.connections++;

      // Target market analysis
      if (!marketAnalysis[link.target]) {
        marketAnalysis[link.target] = {
          flows: { totalVolume: 0, connections: 0 },
          integration: calculateMarketIntegrationScore(link.target, marketIntegration)
        };
      }
      marketAnalysis[link.target].flows.totalVolume += link.value;
      marketAnalysis[link.target].flows.connections++;
    });

    // Calculate network-level metrics
    const metrics = {
      marketCount: uniqueMarkets.size,
      totalVolume: links.reduce((sum, link) => sum + link.value, 0),
      averageConnections: links.length / uniqueMarkets.size,
      density: (2 * links.length) / (uniqueMarkets.size * (uniqueMarkets.size - 1))
    };

    return {
      markets: marketAnalysis,
      metrics
    };

  } catch (error) {
    console.error('Error analyzing market network:', error);
    return { markets: {}, metrics: {} };
  }
};
