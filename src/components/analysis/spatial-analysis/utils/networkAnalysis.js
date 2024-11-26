// src/components/analysis/spatial-analysis/utils/networkAnalysis.js

import Graph from 'graphology';
import { eigenvector, betweenness, degree } from 'graphology-metrics/centrality';
import { connectedComponents } from 'graphology-components';
import { density } from 'graphology-metrics/graph';
import { dijkstra } from 'graphology-shortest-path';

const debug = (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
        console.group(`📊 NetworkAnalysis: ${message}`);
        Object.entries(data).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });
        console.groupEnd();
    }
};

const createGraph = (nodes, links) => {
    const graph = new Graph({ 
        type: 'undirected',
        allowSelfLoops: false,
        multi: false
    });

    debug('Creating Graph', { nodeCount: nodes.length, linkCount: links.length });

    nodes.forEach((node) => {
        if (!node.id) {
            debug('Invalid Node', { node });
            return;
        }

        try {
            graph.addNode(node.id, {
                coordinates: node.coordinates,
                name: node.name,
                population: node.population,
                type: node.type
            });
        } catch (error) {
            debug('Node Addition Error', { node, error: error.message });
        }
    });

    links.forEach((link) => {
        if (!link.source || !link.target || typeof link.weight !== 'number') {
            debug('Invalid Link', { link });
            return;
        }

        try {
            if (!graph.hasEdge(link.source, link.target)) {
                graph.addUndirectedEdgeWithKey(
                    `${link.source}-${link.target}`,
                    link.source,
                    link.target,
                    {
                        weight: link.weight,
                        type: link.type || 'flow'
                    }
                );
            }
        } catch (error) {
            debug('Edge Addition Error', { link, error: error.message });
        }
    });

    return graph;
};

const analyzeNetworkMetrics = (graph) => {
    const metrics = {
        order: graph.order,
        size: graph.size,
        density: 0,
        averageDegree: 0,
        components: [],
        isolatedNodes: []
    };

    try {
        metrics.density = density(graph);
    } catch (error) {
        debug('Density Calculation Error', { error: error.message });
    }

    try {
        const degrees = [];
        graph.forEachNode(node => {
            degrees.push(graph.degree(node));
        });
        metrics.averageDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length;
    } catch (error) {
        debug('Average Degree Calculation Error', { error: error.message });
    }

    return metrics;
};

export const eigenvectorCentrality = (nodes, links) => {
    debug('Starting Eigenvector Centrality Calculation');
    
    const graph = createGraph(nodes, links);
    const metrics = analyzeNetworkMetrics(graph);
    debug('Graph Metrics', metrics);

    let isolatedCount = 0;
    graph.forEachNode((node) => {
        if (graph.degree(node) === 0) {
            graph.dropNode(node);
            isolatedCount++;
        }
    });

    if (isolatedCount > 0) {
        debug('Removed Isolated Nodes', { count: isolatedCount });
    }

    const components = connectedComponents(graph);
    debug('Component Analysis', { 
        componentCount: components.length,
        componentSizes: components.map(c => c.length)
    });

    if (graph.order === 0) {
        debug('Empty Graph After Processing');
        return {
            centrality: {},
            metrics,
            components
        };
    }

    try {
        const centrality = eigenvector(graph, {
            weighted: true,
            maxIterations: 1000,
            tolerance: 1e-6
        });

        debug('Centrality Calculation Success', {
            measureCount: Object.keys(centrality).length
        });

        return {
            centrality,
            metrics,
            components
        };
    } catch (error) {
        debug('Eigenvector Centrality Failed', { error: error.message });
        
        try {
            debug('Attempting Betweenness Centrality');
            const centrality = betweenness(graph, { 
                weighted: true,
                normalized: true 
            });
            
            return {
                centrality,
                metrics,
                components,
                usedFallback: true
            };
        } catch (fallbackError) {
            debug('Betweenness Centrality Failed', { error: fallbackError.message });
            
            debug('Using Degree Centrality Fallback');
            const degreeCentrality = {};
            graph.forEachNode(node => {
                degreeCentrality[node] = graph.degree(node);
            });
            
            return {
                centrality: degreeCentrality,
                metrics,
                components,
                usedFallback: true
            };
        }
    }
};

export const betweennessCentrality = (nodes, links) => {
    debug('Starting Betweenness Centrality Calculation');
    
    const graph = createGraph(nodes, links);
    const metrics = analyzeNetworkMetrics(graph);
    debug('Graph Metrics', metrics);

    const initialOrder = graph.order;
    graph.forEachNode((node) => {
        if (graph.degree(node) === 0) {
            graph.dropNode(node);
        }
    });

    const removedCount = initialOrder - graph.order;
    if (removedCount > 0) {
        debug('Removed Isolated Nodes', { count: removedCount });
    }

    if (graph.order === 0) {
        debug('Empty Graph After Processing');
        return {
            centrality: {},
            metrics
        };
    }

    try {
        const centrality = betweenness(graph, {
            weighted: true,
            normalized: true
        });

        debug('Centrality Calculation Success', {
            measureCount: Object.keys(centrality).length
        });

        return {
            centrality,
            metrics
        };
    } catch (error) {
        debug('Betweenness Centrality Failed', { error: error.message });
        
        try {
            debug('Using Degree Centrality Fallback');
            const degreeCentrality = {};
            graph.forEachNode(node => {
                degreeCentrality[node] = graph.degree(node);
            });
            
            return {
                centrality: degreeCentrality,
                metrics,
                usedFallback: true
            };
        } catch (fallbackError) {
            debug('Degree Centrality Fallback Failed', { error: fallbackError.message });
            return {
                centrality: {},
                metrics,
                error: error.message,
                fallbackError: fallbackError.message
            };
        }
    }
};

export const validateNetworkData = (nodes, links) => {
    const validation = {
        valid: true,
        nodes: {
            total: nodes.length,
            valid: 0,
            invalid: [],
        },
        links: {
            total: links.length,
            valid: 0,
            invalid: [],
        }
    };

    nodes.forEach((node, index) => {
        if (!node.id || !node.coordinates || node.coordinates.some(isNaN)) {
            validation.nodes.invalid.push({
                index,
                node,
                reason: !node.id ? 'Missing ID' : 'Invalid coordinates'
            });
        } else {
            validation.nodes.valid++;
        }
    });

    links.forEach((link, index) => {
        if (!link.source || !link.target || typeof link.weight !== 'number') {
            validation.links.invalid.push({
                index,
                link,
                reason: !link.source || !link.target ? 'Missing source/target' : 'Invalid weight'
            });
        } else {
            validation.links.valid++;
        }
    });

    validation.valid = 
        validation.nodes.invalid.length === 0 && 
        validation.links.invalid.length === 0;

    return validation;
};