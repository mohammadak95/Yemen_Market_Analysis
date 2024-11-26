// src/components/analysis/spatial-analysis/hooks/useNetworkData.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  selectMarketFlows, 
  selectGeometryData, 
  selectMarketIntegration 
} from '../../../../selectors/optimizedSelectors';
import { normalizeCoordinates } from '../utils/coordinateHandler';
import _ from 'lodash';

const DEBUG = process.env.NODE_ENV === 'development';

export const useNetworkData = (threshold = 0.5) => {
  const flows = useSelector(selectMarketFlows);
  const geometryData = useSelector(selectGeometryData);
  const marketIntegration = useSelector(selectMarketIntegration);

  return useMemo(() => {
    if (DEBUG) {
      console.group('useNetworkData Processing');
      console.log('Raw Flows:', flows);
      console.log('Geometry Data:', geometryData);
      console.log('Market Integration:', marketIntegration);
      console.log('Threshold:', threshold);
    }

    if (!flows?.length || !geometryData) {
      if (DEBUG) {
        console.warn('Missing required data');
        console.groupEnd();
      }
      return { nodes: [], links: [], metrics: {} };
    }

    try {
      // Process market data
      const marketsMap = new Map();
      
      // Calculate node metrics
      flows.forEach(flow => {
        // Process source market
        if (!marketsMap.has(flow.source)) {
          const coords = flow.source_coordinates || 
                        normalizeCoordinates(geometryData, flow.source);
          
          if (coords) {
            marketsMap.set(flow.source, {
              id: flow.source,
              name: flow.source,
              x: coords[0],
              y: coords[1],
              totalFlow: flow.totalFlow,
              integrationScore: marketIntegration?.price_correlation[flow.source]?.average || 0
            });
          }
        } else {
          const market = marketsMap.get(flow.source);
          market.totalFlow = (market.totalFlow || 0) + flow.totalFlow;
        }

        // Process target market
        if (!marketsMap.has(flow.target)) {
          const coords = flow.target_coordinates || 
                        normalizeCoordinates(geometryData, flow.target);
          
          if (coords) {
            marketsMap.set(flow.target, {
              id: flow.target,
              name: flow.target,
              x: coords[0],
              y: coords[1],
              totalFlow: flow.totalFlow,
              integrationScore: marketIntegration?.price_correlation[flow.target]?.average || 0
            });
          }
        } else {
          const market = marketsMap.get(flow.target);
          market.totalFlow = (market.totalFlow || 0) + flow.totalFlow;
        }
      });

      // Create nodes array
      const nodes = Array.from(marketsMap.values());

      // Create filtered links
      const links = flows
        .filter(flow => flow.totalFlow >= threshold)
        .map(flow => ({
          source: flow.source,
          target: flow.target,
          value: flow.totalFlow,
          flowCount: flow.flowCount,
          avgFlow: flow.avgFlow,
          priceDifferential: flow.avgPriceDifferential
        }));

      // Calculate network metrics
      const metrics = calculateNetworkMetrics(nodes, links);

      if (DEBUG) {
        console.log('Processed Network Data:', {
          nodeCount: nodes.length,
          linkCount: links.length,
          nodes,
          links,
          metrics
        });
        console.groupEnd();
      }

      return { nodes, links, metrics };
    } catch (error) {
      console.error('Error processing network data:', error);
      return { nodes: [], links: [], metrics: {} };
    }
  }, [flows, geometryData, marketIntegration, threshold]);
};

const calculateNetworkMetrics = (nodes, links) => {
  if (!nodes.length || !links.length) return {};

  try {
    const maxFlow = Math.max(...links.map(l => l.value));
    const minFlow = Math.min(...links.map(l => l.value));
    const avgFlow = links.reduce((sum, l) => sum + l.value, 0) / links.length;
    
    // Calculate density
    const maxPossibleLinks = (nodes.length * (nodes.length - 1)) / 2;
    const density = links.length / maxPossibleLinks;

    // Calculate average degree
    const degrees = nodes.map(node => 
      links.filter(l => l.source === node.id || l.target === node.id).length
    );
    const avgDegree = degrees.reduce((sum, d) => sum + d, 0) / nodes.length;

    return {
      maxFlow,
      minFlow,
      avgFlow,
      density,
      avgDegree,
      nodeCount: nodes.length,
      linkCount: links.length,
      degreeCentralization: calculateDegreeCentralization(degrees),
      flowConcentration: calculateFlowConcentration(links),
      averagePathLength: calculateAveragePathLength(nodes, links)
    };
  } catch (error) {
    console.error('Error calculating network metrics:', error);
    return {};
  }
};

const calculateDegreeCentralization = (degrees) => {
  const maxDegree = Math.max(...degrees);
  const n = degrees.length;
  
  if (n <= 1) return 0;
  
  const sum = degrees.reduce((acc, d) => acc + (maxDegree - d), 0);
  const maxPossibleSum = (n - 1) * (n - 2);
  
  return sum / maxPossibleSum;
};

const calculateFlowConcentration = (links) => {
  const totalFlow = links.reduce((sum, l) => sum + l.value, 0);
  const marketFlows = {};
  
  links.forEach(link => {
    marketFlows[link.source] = (marketFlows[link.source] || 0) + link.value;
    marketFlows[link.target] = (marketFlows[link.target] || 0) + link.value;
  });
  
  const flowShares = Object.values(marketFlows).map(f => f / totalFlow);
  
  return calculateHHI(flowShares);
};

const calculateHHI = (shares) => {
  return shares.reduce((sum, share) => sum + Math.pow(share * 100, 2), 0);
};

const calculateAveragePathLength = (nodes, links) => {
  // Floyd-Warshall algorithm for average shortest path length
  const n = nodes.length;
  const dist = Array(n).fill().map(() => Array(n).fill(Infinity));
  
  // Initialize distances
  nodes.forEach((_, i) => dist[i][i] = 0);
  links.forEach(link => {
    const i = nodes.findIndex(n => n.id === link.source);
    const j = nodes.findIndex(n => n.id === link.target);
    if (i !== -1 && j !== -1) {
      dist[i][j] = 1;
      dist[j][i] = 1;
    }
  });
  
  // Floyd-Warshall
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
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

// Additional helper hooks for specific network analysis needs
export const useMarketConnectivity = (marketId) => {
  const { nodes, links, metrics } = useNetworkData();

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

export const useNetworkClusters = () => {
  const { nodes, links } = useNetworkData();

  return useMemo(() => {
    if (!nodes.length || !links.length) return [];

    // Implement community detection algorithm (e.g., Louvain method)
    // This is a simplified version
    const communities = {};
    let communityId = 0;

    nodes.forEach(node => {
      if (!communities[node.id]) {
        const community = new Set([node.id]);
        const neighbors = links
          .filter(l => l.source === node.id || l.target === node.id)
          .map(l => l.source === node.id ? l.target : l.source);
        
        neighbors.forEach(n => {
          if (!communities[n]) {
            community.add(n);
          }
        });

        Array.from(community).forEach(n => {
          communities[n] = communityId;
        });
        
        communityId++;
      }
    });

    return communities;
  }, [nodes, links]);
};