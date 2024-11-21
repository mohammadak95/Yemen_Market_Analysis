// src/components/analysis/spatial-analysis/utils/networkAnalysis.js

import { eigenvector } from 'graphology-metrics/centrality';
import { betweenness } from 'graphology-metrics/centrality';
import Graph from 'graphology';
import { connectedComponents } from 'graphology-components';

export const eigenvectorCentrality = (nodes, links) => {
  const graph = new Graph({ type: 'undirected' });
  
  // Add nodes
  nodes.forEach(node => {
    graph.addNode(node.id);
  });

  // Add edges
  links.forEach(link => {
    if (!graph.hasEdge(link.source, link.target)) {
      graph.addUndirectedEdgeWithKey(`${link.source}-${link.target}`, link.source, link.target, { weight: link.weight });
    }
  });

  console.log(`Total nodes added: ${graph.order}`);
  console.log(`Total edges added: ${graph.size}`);

  // Remove isolated nodes (nodes with degree 0)
  graph.forEachNode((node) => {
    if (graph.degree(node) === 0) {
      graph.dropNode(node);
    }
  });

  console.log(`Nodes after removing isolated nodes: ${graph.order}`);
  console.log(`Edges after removing isolated nodes: ${graph.size}`);

  // Check for connected components
  const components = connectedComponents(graph);
  if (components.length > 1) {
    console.warn(`Graph has ${components.length} connected components.`);
    // Optionally, handle each component separately
  }

  // If the graph is empty after removing isolated nodes
  if (graph.order === 0) {
    console.error('Graph is empty after removing isolated nodes.');
    return {};
  }

  try {
    // Adjust algorithm parameters
    const centrality = eigenvector(graph, {
      weighted: true,
      maxIterations: 10000, // Increased iterations
      tolerance: 1e-4       // Adjusted tolerance
    });

    return centrality;
  } catch (error) {
    console.error('Failed to calculate eigenvector centrality:', error);

    // Fallback to degree centrality
    const degreeCentrality = {};
    graph.forEachNode(node => {
      degreeCentrality[node] = graph.degree(node);
    });
    return degreeCentrality;
  }
};

export const betweennessCentrality = (nodes, links) => {
  const graph = new Graph({ type: 'undirected' });
  
  // Add nodes
  nodes.forEach(node => {
    graph.addNode(node.id);
  });

  // Add edges
  links.forEach(link => {
    if (!graph.hasEdge(link.source, link.target)) {
      graph.addUndirectedEdgeWithKey(`${link.source}-${link.target}`, link.source, link.target, { weight: link.weight });
    }
  });

  // Remove isolated nodes (nodes with degree 0)
  graph.forEachNode((node) => {
    if (graph.degree(node) === 0) {
      graph.dropNode(node);
    }
  });

  // If the graph is empty after removing isolated nodes
  if (graph.order === 0) {
    console.error('Graph is empty after removing isolated nodes.');
    return {};
  }

  try {
    // Calculate betweenness centrality
    const centrality = betweenness(graph, { weight: 'weight' });
    return centrality;
  } catch (error) {
    console.error('Failed to calculate betweenness centrality:', error);
    return {};
  }
};