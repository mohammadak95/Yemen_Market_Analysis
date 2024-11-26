// src/components/analysis/spatial-analysis/hooks/useNetworkData.js

import { useMemo } from 'react';
import { normalizeCoordinates } from '../utils/coordinateHandler';
import { eigenvectorCentrality, betweennessCentrality } from '../utils/networkAnalysis';

const debug = (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
        console.group(`🔄 useNetworkData: ${message}`);
        Object.entries(data).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });
        console.groupEnd();
    }
};

const useNetworkData = (correlationMatrix = {}, flowData = [], threshold = 0.5) => {
    return useMemo(() => {
        debug('Starting Network Data Processing', {
            flowDataLength: flowData?.length,
            hasCorrelationMatrix: Boolean(correlationMatrix),
            threshold
        });

        const nodesSet = new Set();
        const nodes = [];
        const nodeMap = {};

        const flowLinks = flowData
            .filter(flow => {
                if (!flow.source || !flow.target) {
                    debug('Invalid Flow Entry', { flow });
                    return false;
                }
                return true;
            })
            .map((flow) => {
                const source = flow.source;
                const target = flow.target;

                const sourceCoordinates = normalizeCoordinates(
                    flow.source_coordinates, 
                    source
                );
                const targetCoordinates = normalizeCoordinates(
                    flow.target_coordinates,
                    target
                );

                if (!sourceCoordinates || !targetCoordinates) {
                    debug('Missing Coordinates', {
                        source,
                        target,
                        hasSourceCoords: Boolean(sourceCoordinates),
                        hasTargetCoords: Boolean(targetCoordinates)
                    });
                    return null;
                }

                nodesSet.add(source);
                nodesSet.add(target);

                if (!nodeMap[source]) {
                    nodeMap[source] = {
                        id: source,
                        name: flow.source_coordinates?.properties?.originalName || source,
                        coordinates: sourceCoordinates,
                        population: flow.source_coordinates?.properties?.population || 0,
                        type: 'market'
                    };
                }

                if (!nodeMap[target]) {
                    nodeMap[target] = {
                        id: target,
                        name: flow.target_coordinates?.properties?.originalName || target,
                        coordinates: targetCoordinates,
                        population: flow.target_coordinates?.properties?.population || 0,
                        type: 'market'
                    };
                }

                return {
                    source,
                    target,
                    weight: flow.avgFlow || 1,
                    sourceCoordinates,
                    targetCoordinates,
                };
            })
            .filter(Boolean);

        debug('Flow Links Processed', {
            totalFlows: flowData.length,
            validFlows: flowLinks.length,
            uniqueNodes: nodesSet.size
        });

        const correlationLinks = [];
        Object.entries(correlationMatrix).forEach(([source, correlations]) => {
            Object.entries(correlations).forEach(([target, weight]) => {
                if (source !== target && Math.abs(weight) >= threshold) {
                    if (!nodeMap[source] || !nodeMap[target]) {
                        debug('Missing Node for Correlation', { source, target, weight });
                        return;
                    }

                    correlationLinks.push({
                        source,
                        target,
                        weight: Math.abs(weight),
                        sourceCoordinates: nodeMap[source].coordinates,
                        targetCoordinates: nodeMap[target].coordinates,
                        type: 'correlation'
                    });
                }
            });
        });

        nodes.push(...Object.values(nodeMap));
        const links = [...flowLinks, ...correlationLinks];

        let centralityMeasures = {};
        try {
            debug('Calculating Eigenvector Centrality');
            centralityMeasures = eigenvectorCentrality(nodes, links);
        } catch (error) {
            debug('Eigenvector Centrality Failed', { error: error.message });
            try {
                debug('Attempting Betweenness Centrality');
                centralityMeasures = betweennessCentrality(nodes, links);
            } catch (fallbackError) {
                debug('Betweenness Centrality Failed', { error: fallbackError.message });
                debug('Using Degree Centrality Fallback');
                nodes.forEach(node => {
                    centralityMeasures[node.id] = links.filter(
                        link => link.source === node.id || link.target === node.id
                    ).length;
                });
            }
        }

        const centralityValues = Object.values(centralityMeasures);
        const maxCentrality = Math.max(...centralityValues, 1);
        const minCentrality = Math.min(...centralityValues, 0);

        const normalizedCentrality = {};
        Object.keys(centralityMeasures).forEach((nodeId) => {
            normalizedCentrality[nodeId] =
                (centralityMeasures[nodeId] - minCentrality) /
                (maxCentrality - minCentrality || 1);
        });

        debug('Network Processing Complete', {
            nodeCount: nodes.length,
            linkCount: links.length,
            centralityMeasures: Object.keys(normalizedCentrality).length
        });

        return {
            nodes,
            links,
            centralityMeasures: normalizedCentrality
        };
    }, [correlationMatrix, flowData, threshold]);
};

export default useNetworkData;