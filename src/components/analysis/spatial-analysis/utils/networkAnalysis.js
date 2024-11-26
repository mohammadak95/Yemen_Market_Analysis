// src/components/analysis/spatial-analysis/utils/networkAnalysis.js

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Calculate eigenvector centrality for the network
 * @param {Array} nodes - Network nodes with coordinates
 * @param {Array} links - Network links with flow values
 * @returns {Object} Centrality metrics and network statistics
 */
export const eigenvectorCentrality = (nodes, links) => {
    if (DEBUG) {
        console.group('Eigenvector Centrality Calculation');
        console.log('Input Nodes:', nodes);
        console.log('Input Links:', links);
    }

    try {
        // Initialize centrality scores
        let centrality = nodes.reduce((acc, node) => {
            acc[node.id] = 1.0; // Initial score
            return acc;
        }, {});

        // Parameters
        const maxIterations = 100;
        const tolerance = 1e-6;
        let iteration = 0;
        let delta = 1.0;

        // Power iteration method
        while (iteration < maxIterations && delta > tolerance) {
            const prevCentrality = { ...centrality };
            let maxScore = 0;

            // Reset scores for this iteration
            Object.keys(centrality).forEach(node => {
                centrality[node] = 0;
            });

            // Update scores based on connections
            links.forEach(link => {
                // Weight by flow value
                const weight = link.value;
                
                // Update both source and target (undirected)
                centrality[link.source.id] += prevCentrality[link.target.id] * weight;
                centrality[link.target.id] += prevCentrality[link.source.id] * weight;
            });

            // Normalize scores
            Object.keys(centrality).forEach(node => {
                maxScore = Math.max(maxScore, Math.abs(centrality[node]));
            });

            if (maxScore > 0) {
                Object.keys(centrality).forEach(node => {
                    centrality[node] /= maxScore;
                });
            }

            // Calculate change
            delta = Object.keys(centrality).reduce((acc, node) => {
                return Math.max(acc, Math.abs(centrality[node] - prevCentrality[node]));
            }, 0);

            iteration++;
        }

        if (DEBUG) {
            console.log('Centrality Calculation Complete:', {
                iterations: iteration,
                finalDelta: delta,
                scores: centrality
            });
        }

        // Calculate additional network metrics
        const metrics = calculateNetworkMetrics(nodes, links, centrality);

        if (DEBUG) {
            console.log('Network Metrics:', metrics);
            console.groupEnd();
        }

        return {
            centrality,
            metrics,
            components: findConnectedComponents(nodes, links)
        };
    } catch (error) {
        console.error('Error calculating centrality:', error);
        return {
            centrality: {},
            metrics: getDefaultMetrics(),
            components: []
        };
    }
};

/**
 * Calculate various network metrics
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @param {Object} centrality - Calculated centrality scores
 * @returns {Object} Network metrics
 */
const calculateNetworkMetrics = (nodes, links, centrality) => {
    try {
        // Network density
        const maxPossibleLinks = nodes.length * (nodes.length - 1) / 2;
        const density = links.length / maxPossibleLinks;

        // Average degree
        const degrees = nodes.map(node => 
            links.filter(l => 
                l.source.id === node.id || l.target.id === node.id
            ).length
        );
        const averageConnectivity = degrees.reduce((a, b) => a + b, 0) / nodes.length;

        // Calculate weighted clustering coefficient
        let globalClusteringCoeff = 0;
        nodes.forEach(node => {
            const neighbors = new Set(links
                .filter(l => l.source.id === node.id || l.target.id === node.id)
                .map(l => l.source.id === node.id ? l.target.id : l.source.id)
            );

            if (neighbors.size > 1) {
                let triangles = 0;
                const neighborArr = Array.from(neighbors);
                for (let i = 0; i < neighborArr.length; i++) {
                    for (let j = i + 1; j < neighborArr.length; j++) {
                        if (links.some(l => 
                            (l.source.id === neighborArr[i] && l.target.id === neighborArr[j]) ||
                            (l.source.id === neighborArr[j] && l.target.id === neighborArr[i])
                        )) {
                            triangles++;
                        }
                    }
                }
                globalClusteringCoeff += triangles / (neighbors.size * (neighbors.size - 1) / 2);
            }
        });
        globalClusteringCoeff /= nodes.length;

        return {
            density,
            averageConnectivity,
            globalClusteringCoeff,
            marketCount: nodes.length,
            linkCount: links.length,
            maxCentrality: Math.max(...Object.values(centrality)),
            minCentrality: Math.min(...Object.values(centrality))
        };
    } catch (error) {
        console.error('Error calculating network metrics:', error);
        return getDefaultMetrics();
    }
};

/**
 * Find connected components in the network
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @returns {Array} Array of connected components
 */
const findConnectedComponents = (nodes, links) => {
    const visited = new Set();
    const components = [];

    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const component = [];
            const queue = [node.id];
            
            while (queue.length > 0) {
                const current = queue.shift();
                if (!visited.has(current)) {
                    visited.add(current);
                    component.push(current);

                    // Add connected nodes to queue
                    links
                        .filter(l => l.source.id === current || l.target.id === current)
                        .forEach(l => {
                            const neighbor = l.source.id === current ? l.target.id : l.source.id;
                            if (!visited.has(neighbor)) {
                                queue.push(neighbor);
                            }
                        });
                }
            }
            
            if (component.length > 0) {
                components.push(component);
            }
        }
    });

    return components;
};

/**
 * Get default metrics when calculation fails
 * @returns {Object} Default network metrics
 */
const getDefaultMetrics = () => ({
    density: 0,
    averageConnectivity: 0,
    globalClusteringCoeff: 0,
    marketCount: 0,
    linkCount: 0,
    maxCentrality: 0,
    minCentrality: 0
});