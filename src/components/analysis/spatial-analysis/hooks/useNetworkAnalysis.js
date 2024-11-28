// src/components/analysis/spatial-analysis/hooks/useNetworkAnalysis.js

import { useMemo } from 'react';
import {
  calculateEigenvectorCentrality,
  calculateMarketIntegrationScore,
  calculateMarketInfluence,
  identifyKeyMarkets,
  analyzeMarketNetwork
} from '../utils/networkAnalysis';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

// Fixed coordinates for Yemen markets
const YEMEN_COORDINATES = {
  'abyan': [45.83, 13.58],
  'aden': [45.03, 12.77],
  'al bayda': [45.57, 14.17],
  'al dhale\'e': [44.73, 13.70],
  'al hudaydah': [42.95, 14.80],
  'al jawf': [45.50, 16.60],
  'al maharah': [51.83, 16.52],
  'al mahwit': [43.55, 15.47],
  'amanat al asimah': [44.21, 15.35],
  'amran': [43.94, 15.66],
  'dhamar': [44.24, 14.54],
  'hadramaut': [48.78, 15.93],
  'hajjah': [43.60, 15.63],
  'ibb': [44.18, 13.97],
  'lahj': [44.88, 13.03],
  'marib': [45.32, 15.47],
  'raymah': [43.71, 14.68],
  'sana\'a': [44.21, 15.35],
  'shabwah': [47.01, 14.53],
  'taizz': [44.02, 13.58],
  'socotra': [53.87, 12.47]
};

/**
 * Create nodes from market coordinates
 */
const createNodes = (flows) => {
  // Get unique market names from flows
  const marketNames = new Set();
  flows.forEach(flow => {
    marketNames.add(flow.source);
    marketNames.add(flow.target);
  });

  // Create nodes with proper coordinates
  return Array.from(marketNames).map(name => {
    const coords = YEMEN_COORDINATES[name] || [0, 0];
    return {
      id: name,
      name: name,
      x: coords[0],
      y: coords[1]
    };
  });
};

/**
 * Process links from flow data
 */
const processLinks = (flows, flowThreshold) => {
  return flows
    .filter(flow => flow.total_flow >= flowThreshold)
    .map(flow => ({
      source: flow.source,
      target: flow.target,
      value: flow.total_flow,
      avgFlow: flow.avg_flow,
      flowCount: flow.flow_count
    }));
};

/**
 * Hook to process network data and compute network metrics
 */
export const useNetworkAnalysis = (geometry, flows, marketIntegration, flowThreshold = 0.1) => {
  return useMemo(() => {
    const analysisMetric = backgroundMonitor.startMetric('network-analysis');
    
    try {
      console.log('Processing network data:', { 
        hasGeometry: !!geometry, 
        flowCount: flows?.length,
        flowSample: flows?.[0],
        threshold: flowThreshold
      });

      // Validation checks
      if (!flows?.length) {
        throw new Error('No flow data available');
      }

      // Create nodes from flows
      const nodes = createNodes(flows);
      console.log('Created nodes:', nodes.length);

      // Process links
      const links = processLinks(flows, flowThreshold);
      console.log('Processed links:', links.length);

      // Calculate metrics
      const metrics = calculateNetworkMetrics(nodes, links, marketIntegration);
      console.log('Network metrics calculated:', {
        nodeCount: nodes.length,
        linkCount: links.length,
        maxFlow: metrics.maxFlow,
        minFlow: metrics.minFlow,
        keyMarketsCount: metrics.keyMarkets?.length
      });

      analysisMetric.finish({ status: 'success' });

      return {
        nodes,
        links,
        metrics,
        error: null
      };

    } catch (error) {
      console.error('Network analysis error:', error);
      analysisMetric.finish({ status: 'failed', error: error.message });
      return {
        nodes: [],
        links: [],
        metrics: {},
        error: error.message
      };
    }
  }, [geometry, flows, marketIntegration, flowThreshold]);
};

/**
 * Calculate network metrics
 */
const calculateNetworkMetrics = (nodes, links, marketIntegration) => {
  const centrality = calculateEigenvectorCentrality(nodes, links);
  const keyMarkets = identifyKeyMarkets(links, marketIntegration);
  const networkAnalysis = analyzeMarketNetwork(links, marketIntegration);

  const maxFlow = Math.max(...links.map(l => l.value), 0);
  const minFlow = Math.min(...links.map(l => l.value), 0);

  console.log('Network metrics calculated:', {
    nodeCount: nodes.length,
    linkCount: links.length,
    maxFlow,
    minFlow,
    keyMarketsCount: keyMarkets?.length
  });

  return {
    centrality,
    keyMarkets,
    maxFlow,
    minFlow,
    networkAnalysis
  };
};
