// src/components/analysis/spatial-analysis/hooks/useNetworkData.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectMarketFlows, selectGeometryData } from '../../../../selectors/optimizedSelectors';
import { normalizeCoordinates } from '../utils/coordinateHandler';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Hook to process market flow data into network graph format
 * @param {number} threshold - Minimum flow value to include (default: 0.5)
 * @returns {Object} Processed nodes and links for network visualization
 */
export const useNetworkData = (threshold = 0.5) => {
    const flows = useSelector(selectMarketFlows);
    const geometryData = useSelector(selectGeometryData);

    return useMemo(() => {
        if (DEBUG) {
            console.group('useNetworkData Processing');
            console.log('Raw Flows:', flows);
            console.log('Geometry Data:', geometryData);
            console.log('Threshold:', threshold);
        }

        if (!flows?.length || !geometryData) {
            if (DEBUG) {
                console.warn('Missing required data');
                console.groupEnd();
            }
            return { nodes: [], links: [] };
        }

        try {
            // Collect unique markets and their coordinates
            const marketsMap = new Map();
            
            flows.forEach(flow => {
                // Source market
                if (!marketsMap.has(flow.source)) {
                    const coords = flow.source_coordinates || 
                                 normalizeCoordinates(geometryData, flow.source);
                    
                    if (coords) {
                        marketsMap.set(flow.source, {
                            id: flow.source,
                            name: flow.source,
                            x: coords[0],
                            y: coords[1],
                            totalFlow: flow.totalFlow
                        });
                    }
                } else {
                    // Accumulate total flow for existing market
                    const market = marketsMap.get(flow.source);
                    market.totalFlow = (market.totalFlow || 0) + flow.totalFlow;
                }

                // Target market
                if (!marketsMap.has(flow.target)) {
                    const coords = flow.target_coordinates || 
                                 normalizeCoordinates(geometryData, flow.target);
                    
                    if (coords) {
                        marketsMap.set(flow.target, {
                            id: flow.target,
                            name: flow.target,
                            x: coords[0],
                            y: coords[1],
                            totalFlow: flow.totalFlow
                        });
                    }
                } else {
                    // Accumulate total flow for existing market
                    const market = marketsMap.get(flow.target);
                    market.totalFlow = (market.totalFlow || 0) + flow.totalFlow;
                }
            });

            // Convert markets map to array
            const nodes = Array.from(marketsMap.values());

            // Create links from flows above threshold
            const links = flows
                .filter(flow => flow.totalFlow >= threshold)
                .map(flow => ({
                    source: flow.source,
                    target: flow.target,
                    value: flow.totalFlow,
                    flowCount: flow.flowCount,
                    avgFlow: flow.avgFlow
                }));

            if (DEBUG) {
                console.log('Processed Network Data:', {
                    nodeCount: nodes.length,
                    linkCount: links.length,
                    nodes: nodes,
                    links: links
                });
                console.groupEnd();
            }

            return { nodes, links };
        } catch (error) {
            console.error('Error processing network data:', error);
            return { nodes: [], links: [] };
        }
    }, [flows, geometryData, threshold]);
};

// Export additional helper hooks if needed
export const useNetworkMetrics = () => {
    const { nodes, links } = useNetworkData();

    return useMemo(() => {
        if (!nodes.length || !links.length) return null;

        const totalFlow = links.reduce((sum, link) => sum + link.value, 0);
        const avgFlow = totalFlow / links.length;
        const maxFlow = Math.max(...links.map(link => link.value));
        const minFlow = Math.min(...links.map(link => link.value));

        return {
            nodeCount: nodes.length,
            linkCount: links.length,
            totalFlow,
            avgFlow,
            maxFlow,
            minFlow,
            density: (2 * links.length) / (nodes.length * (nodes.length - 1))
        };
    }, [nodes, links]);
};

export const useMarketConnectivity = (marketId) => {
    const { nodes, links } = useNetworkData();

    return useMemo(() => {
        if (!marketId || !nodes.length || !links.length) return null;

        const marketLinks = links.filter(link => 
            link.source === marketId || link.target === marketId
        );

        return {
            connections: marketLinks.length,
            totalFlow: marketLinks.reduce((sum, link) => sum + link.value, 0),
            avgFlow: marketLinks.reduce((sum, link) => sum + link.value, 0) / marketLinks.length,
            connectedMarkets: marketLinks.map(link => 
                link.source === marketId ? link.target : link.source
            )
        };
    }, [marketId, nodes, links]);
};