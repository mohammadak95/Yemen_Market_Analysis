/**
 * Utility functions for network analysis and graph calculations
 */

import { calculateDistance, transformRegionName } from './spatialUtils';

/**
 * Calculate network metrics for market flows
 * @param {Array} flows - Array of market flows
 * @param {Object} coordinates - Market coordinates mapping
 * @returns {Object} Network metrics
 */
export const calculateNetworkMetrics = (flows, coordinates) => {
  if (!Array.isArray(flows) || !flows.length) {
    return {
      density: 0,
      avgPathLength: 0,
      clustering: 0,
      centrality: {},
      communities: []
    };
  }

  try {
    // Create adjacency matrix
    const markets = new Set([
      ...flows.map(f => f.source),
      ...flows.map(f => f.target)
    ]);
    const marketList = Array.from(markets);
    const n = marketList.length;
    
    const adjacencyMatrix = Array(n).fill().map(() => Array(n).fill(0));
    const weightMatrix = Array(n).fill().map(() => Array(n).fill(0));

    flows.forEach(flow => {
      const sourceIdx = marketList.indexOf(flow.source);
      const targetIdx = marketList.indexOf(flow.target);
      if (sourceIdx >= 0 && targetIdx >= 0) {
        adjacencyMatrix[sourceIdx][targetIdx] = 1;
        adjacencyMatrix[targetIdx][sourceIdx] = 1; // Undirected graph
        weightMatrix[sourceIdx][targetIdx] = flow.total_flow || 0;
        weightMatrix[targetIdx][sourceIdx] = flow.total_flow || 0;
      }
    });

    // Calculate metrics
    const density = calculateNetworkDensity(adjacencyMatrix);
    const avgPathLength = calculateAveragePathLength(adjacencyMatrix);
    const clustering = calculateClusteringCoefficient(adjacencyMatrix);
    const centrality = calculateCentralityMeasures(adjacencyMatrix, weightMatrix, marketList);
    const communities = detectCommunities(adjacencyMatrix, marketList);

    return {
      density,
      avgPathLength,
      clustering,
      centrality,
      communities
    };
  } catch (error) {
    console.error('Error calculating network metrics:', error);
    return null;
  }
};

/**
 * Calculate network density
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @returns {number} Network density
 */
const calculateNetworkDensity = (adjacencyMatrix) => {
  const n = adjacencyMatrix.length;
  if (n < 2) return 0;

  const maxEdges = (n * (n - 1)) / 2;
  const actualEdges = adjacencyMatrix.reduce((sum, row, i) => 
    sum + row.slice(i + 1).reduce((a, b) => a + b, 0), 0
  );

  return actualEdges / maxEdges;
};

/**
 * Calculate average path length using Floyd-Warshall algorithm
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @returns {number} Average path length
 */
const calculateAveragePathLength = (adjacencyMatrix) => {
  const n = adjacencyMatrix.length;
  if (n < 2) return 0;

  // Initialize distance matrix
  const dist = adjacencyMatrix.map(row => 
    row.map(val => val === 0 ? Infinity : val)
  );
  for (let i = 0; i < n; i++) dist[i][i] = 0;

  // Floyd-Warshall algorithm
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] !== Infinity && dist[k][j] !== Infinity) {
          dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
        }
      }
    }
  }

  // Calculate average
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist[i][j] !== Infinity) {
        sum += dist[i][j];
        count++;
      }
    }
  }

  return count > 0 ? sum / count : 0;
};

/**
 * Calculate clustering coefficient
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @returns {number} Clustering coefficient
 */
const calculateClusteringCoefficient = (adjacencyMatrix) => {
  const n = adjacencyMatrix.length;
  if (n < 3) return 0;

  let totalCoefficient = 0;
  let validNodes = 0;

  for (let i = 0; i < n; i++) {
    const neighbors = [];
    for (let j = 0; j < n; j++) {
      if (adjacencyMatrix[i][j] === 1) {
        neighbors.push(j);
      }
    }

    if (neighbors.length < 2) continue;

    let triangles = 0;
    for (let j = 0; j < neighbors.length; j++) {
      for (let k = j + 1; k < neighbors.length; k++) {
        if (adjacencyMatrix[neighbors[j]][neighbors[k]] === 1) {
          triangles++;
        }
      }
    }

    const maxTriangles = (neighbors.length * (neighbors.length - 1)) / 2;
    if (maxTriangles > 0) {
      totalCoefficient += triangles / maxTriangles;
      validNodes++;
    }
  }

  return validNodes > 0 ? totalCoefficient / validNodes : 0;
};

/**
 * Calculate various centrality measures
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @param {Array<Array<number>>} weightMatrix - Network weight matrix
 * @param {Array<string>} marketList - List of market names
 * @returns {Object} Centrality measures
 */
const calculateCentralityMeasures = (adjacencyMatrix, weightMatrix, marketList) => {
  const n = adjacencyMatrix.length;
  const centrality = {};

  marketList.forEach((market, i) => {
    // Degree centrality
    const degree = adjacencyMatrix[i].reduce((a, b) => a + b, 0);
    
    // Weighted degree (strength)
    const strength = weightMatrix[i].reduce((a, b) => a + b, 0);
    
    // Betweenness centrality (approximate)
    const betweenness = calculateBetweennessCentrality(adjacencyMatrix, i);

    centrality[market] = {
      degree: degree / (n - 1),
      strength: strength,
      betweenness: betweenness
    };
  });

  return centrality;
};

/**
 * Calculate betweenness centrality for a node
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @param {number} nodeIndex - Index of the node
 * @returns {number} Betweenness centrality
 */
const calculateBetweennessCentrality = (adjacencyMatrix, nodeIndex) => {
  const n = adjacencyMatrix.length;
  let betweenness = 0;

  // For each pair of nodes
  for (let s = 0; s < n; s++) {
    if (s === nodeIndex) continue;
    for (let t = s + 1; t < n; t++) {
      if (t === nodeIndex) continue;

      // Find shortest paths using BFS
      const paths = findShortestPaths(adjacencyMatrix, s, t);
      if (paths.length === 0) continue;

      // Count paths through nodeIndex
      const pathsThroughNode = paths.filter(path => 
        path.includes(nodeIndex)
      ).length;

      betweenness += pathsThroughNode / paths.length;
    }
  }

  return betweenness;
};

/**
 * Find all shortest paths between two nodes using BFS
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @param {number} start - Start node index
 * @param {number} end - End node index
 * @returns {Array<Array<number>>} Array of shortest paths
 */
const findShortestPaths = (adjacencyMatrix, start, end) => {
  const n = adjacencyMatrix.length;
  const queue = [[start]];
  const paths = [];
  const visited = new Set();
  let shortestLength = Infinity;

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (path.length > shortestLength) break;

    if (node === end) {
      shortestLength = path.length;
      paths.push(path);
      continue;
    }

    for (let next = 0; next < n; next++) {
      if (adjacencyMatrix[node][next] === 1 && !path.includes(next)) {
        queue.push([...path, next]);
      }
    }
  }

  return paths;
};

/**
 * Detect communities using Louvain method
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @param {Array<string>} marketList - List of market names
 * @returns {Array<Array<string>>} Detected communities
 */
const detectCommunities = (adjacencyMatrix, marketList) => {
  const n = adjacencyMatrix.length;
  let communities = Array.from({ length: n }, (_, i) => [marketList[i]]);
  let modularity = calculateModularity(adjacencyMatrix, communities);
  let improved = true;

  while (improved) {
    improved = false;
    const newCommunities = [...communities];

    for (let i = 0; i < n; i++) {
      const currentCommunity = communities.findIndex(c => 
        c.includes(marketList[i])
      );
      let bestModularity = modularity;
      let bestCommunity = currentCommunity;

      // Try moving node to each community
      for (let j = 0; j < communities.length; j++) {
        if (j === currentCommunity) continue;

        // Move node
        newCommunities[currentCommunity] = newCommunities[currentCommunity]
          .filter(m => m !== marketList[i]);
        newCommunities[j].push(marketList[i]);

        const newModularity = calculateModularity(adjacencyMatrix, newCommunities);
        if (newModularity > bestModularity) {
          bestModularity = newModularity;
          bestCommunity = j;
          improved = true;
        }

        // Move node back
        newCommunities[j] = newCommunities[j]
          .filter(m => m !== marketList[i]);
        newCommunities[currentCommunity].push(marketList[i]);
      }

      // Apply best move
      if (bestCommunity !== currentCommunity) {
        newCommunities[currentCommunity] = newCommunities[currentCommunity]
          .filter(m => m !== marketList[i]);
        newCommunities[bestCommunity].push(marketList[i]);
        modularity = bestModularity;
      }
    }

    communities = newCommunities.filter(c => c.length > 0);
  }

  return communities;
};

/**
 * Calculate modularity of a network partition
 * @param {Array<Array<number>>} adjacencyMatrix - Network adjacency matrix
 * @param {Array<Array<string>>} communities - Network partition
 * @returns {number} Modularity value
 */
const calculateModularity = (adjacencyMatrix, communities) => {
  const n = adjacencyMatrix.length;
  const m = adjacencyMatrix.reduce((sum, row, i) => 
    sum + row.slice(i + 1).reduce((a, b) => a + b, 0), 0
  );
  if (m === 0) return 0;

  let modularity = 0;
  for (const community of communities) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (community.includes(i) && community.includes(j)) {
          const ki = adjacencyMatrix[i].reduce((a, b) => a + b, 0);
          const kj = adjacencyMatrix[j].reduce((a, b) => a + b, 0);
          modularity += adjacencyMatrix[i][j] - (ki * kj) / (2 * m);
        }
      }
    }
  }

  return modularity / (2 * m);
};

export default {
  calculateNetworkMetrics,
  calculateNetworkDensity,
  calculateAveragePathLength,
  calculateClusteringCoefficient,
  calculateCentralityMeasures,
  detectCommunities
};
