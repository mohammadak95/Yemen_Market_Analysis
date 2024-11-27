// src/components/analysis/spatial-analysis/utils/networkAnalysis.js

import _ from 'lodash';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Calculate eigenvector centrality for market network
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @param {Object} options - Calculation options
 * @returns {Object} Centrality metrics and scores
 */
export const calculateEigenvectorCentrality = (nodes, links, options = { maxIterations: 50, tolerance: 1e-6 }) => {
  if (!nodes?.length || !links?.length) {
    if (DEBUG) console.warn('Missing nodes or links for centrality calculation');
    return {
      centrality: {},
      metrics: {
        maxCentrality: 0,
        minCentrality: 0,
        avgCentrality: 0,
        iterations: 0
      }
    };
  }

  try {
    const adjacencyMatrix = createAdjacencyMatrix(nodes, links);
    if (!adjacencyMatrix.length) {
      throw new Error('Failed to create adjacency matrix');
    }

    let centrality = new Array(nodes.length).fill(1);
    let iterations = 0;
    let converged = false;
    let maxDiff = Infinity;

    while (iterations < options.maxIterations && !converged) {
      // Calculate new centrality scores
      const newCentralityResult = multiplyMatrixVector(adjacencyMatrix, centrality);
      
      // Check for valid multiplication result
      if (!newCentralityResult.length) {
        throw new Error('Matrix multiplication failed');
      }

      // Calculate normalization factor
      const norm = Math.sqrt(newCentralityResult.reduce((sum, x) => sum + x * x, 0)) || 1;
      
      // Create normalized centrality vector
      const normalizedCentrality = newCentralityResult.map(x => x / norm);
      
      // Calculate maximum difference for convergence check
      maxDiff = Math.max(...centrality.map((x, i) => Math.abs(x - normalizedCentrality[i])));
      
      // Check convergence
      converged = maxDiff < options.tolerance;
      
      // Update centrality vector
      centrality = normalizedCentrality;
      iterations++;
    }

    // Create centrality mapping with validation
    const centralityMap = {};
    let validScores = true;

    nodes.forEach((node, i) => {
      if (isNaN(centrality[i])) {
        validScores = false;
        centralityMap[node.id] = 0;
      } else {
        centralityMap[node.id] = Math.max(0, Math.min(1, centrality[i])); // Clamp values between 0 and 1
      }
    });

    if (!validScores) {
      backgroundMonitor.logError('eigenvector-centrality-calculation', new Error('Invalid centrality scores detected'));
    }

    const metrics = {
      maxCentrality: Math.max(...Object.values(centralityMap)),
      minCentrality: Math.min(...Object.values(centralityMap)),
      avgCentrality: _.mean(Object.values(centralityMap)),
      iterations,
      converged,
      maxDiff
    };

    return { centrality: centralityMap, metrics };
  } catch (error) {
    backgroundMonitor.logError('eigenvector-centrality-calculation', error);
    return {
      centrality: {},
      metrics: {
        maxCentrality: 0,
        minCentrality: 0,
        avgCentrality: 0,
        iterations: 0,
        converged: false,
        maxDiff: Infinity
      }
    };
  }
};

/**
 * Create weighted adjacency matrix for market network
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @returns {Array} Adjacency matrix
 */
const createAdjacencyMatrix = (nodes, links) => {
  try {
    const n = nodes.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));
    const nodeIndex = new Map(nodes.map((node, i) => [node.id, i]));

    // Normalize link values
    const maxFlow = Math.max(...links.map(l => l.value || 0));
    
    links.forEach(link => {
      const i = nodeIndex.get(link.source);
      const j = nodeIndex.get(link.target);
      
      if (i !== undefined && j !== undefined) {
        const normalizedValue = maxFlow > 0 ? (link.value || 0) / maxFlow : 0;
        matrix[i][j] = normalizedValue;
        matrix[j][i] = normalizedValue; // Undirected network
      }
    });

    return matrix;
  } catch (error) {
    backgroundMonitor.logError('adjacency-matrix-creation', error);
    return [];
  }
};

/**
 * Calculate market power and network influence metrics
 * @param {string} market - Market identifier
 * @param {Array} flows - Flow data
 * @param {Object} marketIntegration - Market integration data
 * @returns {Object} Market influence metrics
 */
export const calculateMarketInfluence = (market, flows, marketIntegration) => {
  if (!market || !flows?.length || !marketIntegration) {
    return {
      flowCentrality: 0,
      priceInfluence: 0,
      volumeShare: 0,
      connections: 0,
      significance: 0
    };
  }

  try {
    const marketFlows = flows.filter(f => f.source === market || f.target === market);
    const correlations = marketIntegration.price_correlation?.[market] || {};
    
    // Calculate normalized metrics
    const totalVolume = _.sumBy(flows, 'totalFlow') || 1;
    const marketVolume = _.sumBy(marketFlows, 'totalFlow');
    const avgCorrelation = _.mean(Object.values(correlations));
    
    // Calculate significance score
    const significance = calculateSignificanceScore(marketFlows, flows, correlations);

    return {
      flowCentrality: flows.length > 0 ? marketFlows.length / flows.length : 0,
      priceInfluence: avgCorrelation || 0,
      volumeShare: totalVolume > 0 ? marketVolume / totalVolume : 0,
      connections: marketFlows.length,
      significance
    };
  } catch (error) {
    backgroundMonitor.logError('market-influence-calculation', error);
    return {
      flowCentrality: 0,
      priceInfluence: 0,
      volumeShare: 0,
      connections: 0,
      significance: 0
    };
  }
};

/**
 * Calculate network cohesion metrics
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @returns {Object} Network cohesion metrics
 */
export const calculateNetworkCohesion = (nodes, links) => {
  if (!nodes?.length || !links?.length) {
    return {
      density: 0,
      components: 0,
      largestComponent: 0,
      isolatedMarkets: 0,
      avgFlowStrength: 0,
      cohesionScore: 0
    };
  }

  try {
    // Calculate basic network metrics
    const density = calculateNetworkDensity(nodes, links);
    const components = findConnectedComponents(nodes, links);
    const avgFlowStrength = _.meanBy(links, 'totalFlow') || 0;

    // Calculate advanced metrics
    const componentSizes = components.map(c => c.length);
    const largestComponent = Math.max(...componentSizes);
    const isolatedMarkets = components.filter(c => c.length === 1).length;

    // Calculate overall cohesion score
    const cohesionScore = calculateCohesionScore({
      density,
      componentRatio: largestComponent / nodes.length,
      isolationRatio: 1 - (isolatedMarkets / nodes.length),
      flowStrengthNorm: normalizeFlowStrength(avgFlowStrength, links)
    });

    return {
      density,
      components: components.length,
      largestComponent,
      isolatedMarkets,
      avgFlowStrength,
      cohesionScore,
      componentDistribution: calculateComponentDistribution(componentSizes, nodes.length)
    };
  } catch (error) {
    backgroundMonitor.logError('network-cohesion-calculation', error);
    return {
      density: 0,
      components: 0,
      largestComponent: 0,
      isolatedMarkets: 0,
      avgFlowStrength: 0,
      cohesionScore: 0,
      componentDistribution: {}
    };
  }
};

/**
 * Identify key market roles based on network position
 * @param {Array} flows - Flow data
 * @param {Object} marketIntegration - Market integration data
 * @returns {Array} Key markets with roles
 */
export const identifyKeyMarkets = (flows, marketIntegration) => {
  if (!flows?.length || !marketIntegration) {
    return [];
  }

  try {
    const markets = new Set(flows.map(f => f.source));
    const keyMarkets = [];

    markets.forEach(market => {
      const influence = calculateMarketInfluence(market, flows, marketIntegration);
      const role = determineMarketRole(influence, flows, marketIntegration);

      if (role.significance > 0.5) {
        keyMarkets.push({
          market,
          role: role.type,
          significance: role.significance,
          metrics: {
            ...influence,
            role_confidence: role.confidence
          }
        });
      }
    });

    return _.orderBy(keyMarkets, ['metrics.significance'], ['desc']);
  } catch (error) {
    backgroundMonitor.logError('key-markets-identification', error);
    return [];
  }
};

/**
 * Calculate market integration score
 * @param {string} market - Market identifier
 * @param {Object} marketIntegration - Market integration data
 * @returns {Object} Integration metrics
 */
export const calculateMarketIntegrationScore = (market, marketIntegration) => {
  if (!market || !marketIntegration) {
    return {
      integrationScore: 0,
      correlations: {},
      accessibility: 0
    };
  }

  try {
    const correlations = marketIntegration.price_correlation?.[market] || {};
    const accessibility = marketIntegration.accessibility?.[market] || 0;
    
    const avgCorrelation = Object.values(correlations).length > 0
      ? _.mean(Object.values(correlations))
      : 0;

    // Calculate weighted integration score
    const integrationScore = avgCorrelation * (accessibility / 5);

    return {
      integrationScore,
      correlations,
      accessibility,
      correlationStats: calculateCorrelationStats(correlations)
    };
  } catch (error) {
    backgroundMonitor.logError('market-integration-score-calculation', error);
    return {
      integrationScore: 0,
      correlations: {},
      accessibility: 0,
      correlationStats: {
        mean: 0,
        std: 0,
        min: 0,
        max: 0
      }
    };
  }
};

/**
 * Calculate price transmission efficiency between markets
 * @param {Array} flows - Flow data
 * @param {Object} marketIntegration - Market integration data
 * @returns {Object} Transmission efficiency metrics
 */
export const calculatePriceTransmission = (flows, marketIntegration) => {
  if (!flows?.length || !marketIntegration) {
    return {};
  }

  try {
    const transmission = {};
    const markets = new Set(flows.map(f => f.source));

    markets.forEach(market => {
      const connections = flows.filter(f => 
        f.source === market || f.target === market
      );

      if (connections.length > 0) {
        const efficiency = connections.reduce((acc, conn) => {
          const otherMarket = conn.source === market ? conn.target : conn.source;
          const correlation = marketIntegration.price_correlation?.[market]?.[otherMarket] || 0;
          return acc + (correlation * conn.totalFlow);
        }, 0) / connections.reduce((sum, conn) => sum + conn.totalFlow, 0);

        transmission[market] = efficiency;
      }
    });

    return transmission;
  } catch (error) {
    backgroundMonitor.logError('price-transmission-calculation', error);
    return {};
  }
};

/**
 * Helper Functions
 */

/**
 * Calculate network density
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @returns {number} Network density
 */
const calculateNetworkDensity = (nodes, links) => {
  const maxPossibleLinks = (nodes.length * (nodes.length - 1)) / 2;
  return maxPossibleLinks > 0 ? links.length / maxPossibleLinks : 0;
};

/**
 * Find connected components using depth-first search
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @returns {Array} Connected components
 */
const findConnectedComponents = (nodes, links) => {
  const visited = new Set();
  const components = [];

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = [];
      const stack = [node.id];

      while (stack.length > 0) {
        const current = stack.pop();
        if (!visited.has(current)) {
          visited.add(current);
          component.push(current);

          links
            .filter(l => l.source === current || l.target === current)
            .forEach(l => {
              const neighbor = l.source === current ? l.target : l.source;
              if (!visited.has(neighbor)) {
                stack.push(neighbor);
              }
            });
        }
      }

      components.push(component);
    }
  });

  return components;
};

/**
 * Calculate significance score for market influence
 * @param {Array} marketFlows - Market-specific flows
 * @param {Array} allFlows - All network flows
 * @param {Object} correlations - Price correlations
 * @returns {number} Significance score
 */
const calculateSignificanceScore = (marketFlows, allFlows, correlations) => {
  const flowShare = allFlows.length > 0 ? marketFlows.length / allFlows.length : 0;
  const avgCorrelation = _.mean(Object.values(correlations)) || 0;
  return (flowShare * 0.6) + (avgCorrelation * 0.4);
};

/**
 * Determine market role based on influence metrics
 * @param {Object} influence - Market influence metrics
 * @param {Array} flows - Flow data
 * @param {Object} marketIntegration - Market integration data
 * @returns {Object} Market role classification
 */
const determineMarketRole = (influence, flows, marketIntegration) => {
  const { flowCentrality, priceInfluence, volumeShare } = influence;

  // Calculate role scores
  const hubScore = (flowCentrality * 0.4) + (volumeShare * 0.4) + (priceInfluence * 0.2);
  const bridgeScore = (flowCentrality * 0.3) + (priceInfluence * 0.5) + (volumeShare * 0.2);
  const peripheralScore = 1 - ((flowCentrality + volumeShare + priceInfluence) / 3);

  // Determine primary role
  const scores = {
    hub: hubScore,
    bridge: bridgeScore,
    peripheral: peripheralScore
  };

  const role = _.maxBy(Object.entries(scores), '[1]');
  
  return {
    type: role[0],
    significance: role[1],
    confidence: calculateRoleConfidence(scores)
  };
};

/**
 * Calculate confidence in role assignment
 * @param {Object} scores - Role scores
 * @returns {number} Confidence score
 */
const calculateRoleConfidence = (scores) => {
  const values = Object.values(scores);
  const max = Math.max(...values);
  const others = values.filter(v => v !== max);
  const avgOthers = _.mean(others);
  
  // Confidence is based on how distinctly the role stands out
  return (max - avgOthers) / max;
};

/**
 * Calculate cohesion score from component metrics
 * @param {Object} metrics - Component metrics
 * @returns {number} Cohesion score
 */
const calculateCohesionScore = (metrics) => {
  const weights = {
    density: 0.3,
    componentRatio: 0.3,
    isolationRatio: 0.2,
    flowStrengthNorm: 0.2
  };

  return Object.entries(weights).reduce((score, [metric, weight]) => {
    return score + (metrics[metric] * weight);
  }, 0);
};

/**
 * Calculate component size distribution
 * @param {Array} componentSizes - Array of component sizes
 * @param {number} totalNodes - Total number of nodes
 * @returns {Object} Component distribution metrics
 */
const calculateComponentDistribution = (componentSizes, totalNodes) => {
  try {
    const sorted = [...componentSizes].sort((a, b) => b - a);
    const total = sorted.reduce((sum, size) => sum + size, 0);

    return {
      distribution: sorted.map(size => size / total),
      gini: calculateGiniCoefficient(sorted),
      entropy: calculateEntropyMeasure(sorted, total),
      largest_component_ratio: sorted[0] / totalNodes
    };
  } catch (error) {
    backgroundMonitor.logError('component-distribution-calculation', error);
    return {
      distribution: [],
      gini: 0,
      entropy: 0,
      largest_component_ratio: 0
    };
  }
};

/**
 * Calculate Gini coefficient for component distribution
 * @param {Array} values - Array of values
 * @returns {number} Gini coefficient
 */
const calculateGiniCoefficient = (values) => {
  if (!values?.length) return 0;

  try {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = _.mean(sorted);
    
    if (mean === 0) return 0;

    const summation = sorted.reduce((sum, value, i) => {
      return sum + ((2 * i - n + 1) * value);
    }, 0);

    return summation / (Math.pow(n, 2) * mean);
  } catch (error) {
    backgroundMonitor.logError('gini-coefficient-calculation', error);
    return 0;
  }
};

/**
 * Calculate entropy measure for component distribution
 * @param {Array} values - Array of values
 * @param {number} total - Total sum of values
 * @returns {number} Entropy measure
 */
const calculateEntropyMeasure = (values, total) => {
  if (!values?.length || total === 0) return 0;

  try {
    return -values.reduce((entropy, value) => {
      const p = value / total;
      return p > 0 ? entropy + (p * Math.log(p)) : entropy;
    }, 0);
  } catch (error) {
    backgroundMonitor.logError('entropy-measure-calculation', error);
    return 0;
  }
};

/**
 * Normalize flow strength relative to network
 * @param {number} avgStrength - Average flow strength
 * @param {Array} links - Network links
 * @returns {number} Normalized flow strength
 */
const normalizeFlowStrength = (avgStrength, links) => {
  if (!links?.length) return 0;

  try {
    const maxFlow = Math.max(...links.map(l => l.totalFlow || 0));
    return maxFlow > 0 ? avgStrength / maxFlow : 0;
  } catch (error) {
    backgroundMonitor.logError('flow-strength-normalization', error);
    return 0;
  }
};

/**
 * Calculate correlation statistics
 * @param {Object} correlations - Correlation values
 * @returns {Object} Correlation statistics
 */
const calculateCorrelationStats = (correlations) => {
  if (!correlations || Object.keys(correlations).length === 0) {
    return {
      mean: 0,
      std: 0,
      min: 0,
      max: 0
    };
  }

  try {
    const values = Object.values(correlations);
    const mean = _.mean(values);
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    return {
      mean,
      std,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  } catch (error) {
    backgroundMonitor.logError('correlation-stats-calculation', error);
    return {
      mean: 0,
      std: 0,
      min: 0,
      max: 0
    };
  }
};

/**
 * Matrix-vector multiplication with numerical stability
 * @param {Array} matrix - Input matrix
 * @param {Array} vector - Input vector
 * @returns {Array} Result vector
 */
const multiplyMatrixVector = (matrix, vector) => {
  if (!matrix?.length || !vector?.length) return [];

  try {
    return matrix.map(row => 
      row.reduce((sum, cell, i) => {
        const product = cell * vector[i];
        return sum + (isNaN(product) ? 0 : product);
      }, 0)
    );
  } catch (error) {
    backgroundMonitor.logError('matrix-vector-multiplication', error);
    return [];
  }
};

/**
 * Analyze overall network structure
 * @param {Array} flows - Flow data
 * @param {Object} marketIntegration - Market integration data
 * @returns {Object} Network structure analysis
 */
export const analyzeMarketNetwork = (flows, marketIntegration) => {
  if (!flows?.length || !marketIntegration) {
    return {
      markets: {},
      global: {
        density: 0,
        avgIntegration: 0,
        flowDensity: 0
      }
    };
  }

  try {
    const markets = new Set(flows.map(f => f.source));
    const networkAnalysis = {
      markets: {},
      global: {
        density: flows.length / (markets.size * (markets.size - 1)),
        avgIntegration: marketIntegration.integration_score || 0,
        flowDensity: marketIntegration.flow_density || 0
      }
    };

    // Analyze individual markets
    markets.forEach(market => {
      const marketFlows = flows.filter(f => f.source === market || f.target === market);
      const integration = calculateMarketIntegrationScore(market, marketIntegration);

      networkAnalysis.markets[market] = {
        integration,
        flows: {
          count: marketFlows.length,
          totalVolume: _.sumBy(marketFlows, 'totalFlow'),
          avgFlow: _.meanBy(marketFlows, 'avgFlow')
        },
        influence: calculateMarketInfluence(market, flows, marketIntegration)
      };
    });

    return networkAnalysis;
  } catch (error) {
    backgroundMonitor.logError('market-network-analysis', error);
    return {
      markets: {},
      global: {
        density: 0,
        avgIntegration: 0,
        flowDensity: 0
      }
    };
  }
};

// Export utility functions for testing
export const testUtils = {
  calculateNetworkDensity,
  findConnectedComponents,
  calculateSignificanceScore,
  determineMarketRole,
  calculateRoleConfidence,
  calculateCohesionScore,
  calculateComponentDistribution,
  calculateGiniCoefficient,
  calculateEntropyMeasure,
  normalizeFlowStrength,
  calculateCorrelationStats,
  multiplyMatrixVector
};