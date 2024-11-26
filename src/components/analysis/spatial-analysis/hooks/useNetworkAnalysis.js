// src/components/analysis/spatial-analysis/hooks/useNetworkAnalysis.js

import { useMemo } from 'react';
import {
  calculateEigenvectorCentrality,
  calculateMarketIntegrationScore,
  calculateMarketInfluence,
  identifyKeyMarkets,
  analyzeMarketNetwork
} from '../utils/networkAnalysis';
import { safeGeoJSONProcessor } from '../../../../utils/geoJSONProcessor';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

const debugLog = (message, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[NetworkAnalysis Hook] ${message}:`, data);
  }
};

// Convert GeoJSON point to network node
const convertGeoJSONPointToNode = (feature) => {
  if (!feature?.geometry?.coordinates || 
      feature.geometry.type !== 'Point' || 
      !Array.isArray(feature.geometry.coordinates) || 
      feature.geometry.coordinates.length !== 2 ||
      feature.geometry.coordinates.some(coord => !Number.isFinite(coord))) {
    backgroundMonitor.logError('network-point-conversion', {
      message: 'Invalid GeoJSON point feature',
      feature
    });
    return null;
  }

  const [x, y] = feature.geometry.coordinates;
  const name = feature.properties?.originalName || feature.properties?.name;
  
  if (!name) {
    backgroundMonitor.logError('network-point-conversion', {
      message: 'Missing name in feature properties',
      properties: feature.properties
    });
    return null;
  }

  const normalizedName = name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .trim();

  const node = {
    id: normalizedName,
    name,
    x,
    y,
    population: feature.properties?.population || 0,
    region_id: feature.properties?.region_id,
  };

  backgroundMonitor.logMetric('node-creation', {
    nodeId: node.id,
    coordinates: [x, y],
    hasPopulation: !!node.population
  });

  return node;
};

// Validate network data structure
const validateNetworkData = (nodes, links) => {
  const validationMetric = backgroundMonitor.startMetric('network-validation', {
    nodeCount: nodes.length,
    linkCount: links.length
  });

  if (!Array.isArray(nodes) || !Array.isArray(links)) {
    backgroundMonitor.logError('network-validation', {
      message: 'Invalid data structure',
      nodesType: typeof nodes,
      linksType: typeof links
    });
    validationMetric.finish({ status: 'failed' });
    return false;
  }
  
  // Validate nodes
  const validNodes = nodes.every(node => {
    const isValid = node && 
      typeof node.id === 'string' && 
      typeof node.x === 'number' && 
      typeof node.y === 'number' &&
      Number.isFinite(node.x) && 
      Number.isFinite(node.y);
    
    if (!isValid) {
      backgroundMonitor.logError('network-validation', {
        message: 'Invalid node',
        node
      });
    }
    return isValid;
  });

  // Validate links
  const validLinks = links.every(link => {
    const isValid = link && 
      typeof link.source === 'string' &&
      typeof link.target === 'string' &&
      typeof link.value === 'number' &&
      Number.isFinite(link.value);
    
    if (!isValid) {
      backgroundMonitor.logError('network-validation', {
        message: 'Invalid link',
        link
      });
    }
    return isValid;
  });

  // Additional validation for ForceGraph2D
  const nodeIds = new Set(nodes.map(n => n.id));
  const validReferences = links.every(link => {
    const hasValidRefs = nodeIds.has(link.source) && nodeIds.has(link.target);
    if (!hasValidRefs) {
      backgroundMonitor.logError('network-validation', {
        message: 'Invalid link references',
        link,
        sourceExists: nodeIds.has(link.source),
        targetExists: nodeIds.has(link.target),
        validNodes: Array.from(nodeIds)
      });
    }
    return hasValidRefs;
  });

  const isValid = validNodes && validLinks && validReferences;
  validationMetric.finish({
    status: isValid ? 'success' : 'failed',
    validNodes,
    validLinks,
    validReferences
  });

  return isValid;
};

/**
 * Hook to process network data and compute network metrics
 * @param {Object} geometry - GeoJSON geometry data
 * @param {Array} flows - Flow data between markets
 * @param {Object} marketIntegration - Market integration data
 * @param {number} flowThreshold - Threshold for filtering flows
 * @returns {Object} Processed network data and metrics
 */
export const useNetworkAnalysis = (geometry, flows, marketIntegration, flowThreshold = 0.1) => {
  return useMemo(() => {
    const analysisMetric = backgroundMonitor.startMetric('network-analysis', {
      hasGeometry: !!geometry,
      flowCount: flows?.length,
      hasMarketIntegration: !!marketIntegration,
      flowThreshold
    });

    try {
      if (!geometry || !flows?.length || !marketIntegration) {
        backgroundMonitor.logError('network-analysis', {
          message: 'Missing required data',
          hasGeometry: !!geometry,
          flowCount: flows?.length,
          hasMarketIntegration: !!marketIntegration
        });
        analysisMetric.finish({ status: 'failed', reason: 'missing-data' });
        return {
          nodes: [],
          links: [],
          metrics: {},
          error: 'Missing required data'
        };
      }

      // Process geometry
      const processedGeometry = safeGeoJSONProcessor(geometry, 'network');
      if (!processedGeometry?.features) {
        backgroundMonitor.logError('network-analysis', {
          message: 'Invalid geometry data',
          processedGeometry
        });
        analysisMetric.finish({ status: 'failed', reason: 'invalid-geometry' });
        return {
          nodes: [],
          links: [],
          metrics: {},
          error: 'Invalid geometry data'
        };
      }

      // Create nodes from market points
      const nodes = processedGeometry.features
        .filter(feature => feature.geometry?.type === 'Point')
        .map(convertGeoJSONPointToNode)
        .filter(Boolean);

      backgroundMonitor.logMetric('node-processing', {
        inputFeatures: processedGeometry.features.length,
        pointFeatures: processedGeometry.features.filter(f => f.geometry?.type === 'Point').length,
        outputNodes: nodes.length
      });

      // Process links with validation
      const links = flows
        .filter(flow => {
          const isValid = flow.totalFlow >= flowThreshold && Number.isFinite(flow.totalFlow);
          if (!isValid) {
            backgroundMonitor.logError('network-analysis', {
              message: 'Invalid flow',
              flow
            });
          }
          return isValid;
        })
        .map(flow => {
          const source = flow.source?.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const target = flow.target?.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          return {
            source,
            target,
            value: flow.totalFlow || 0,
            avgFlow: flow.avgFlow || 0,
            flowCount: flow.flowCount || 0,
          };
        })
        .filter(link => {
          const isValid = nodes.some(n => n.id === link.source) && 
            nodes.some(n => n.id === link.target);
          if (!isValid) {
            backgroundMonitor.logError('network-analysis', {
              message: 'Invalid link references',
              link,
              sourceExists: nodes.some(n => n.id === link.source),
              targetExists: nodes.some(n => n.id === link.target)
            });
          }
          return isValid;
        });

      backgroundMonitor.logMetric('link-processing', {
        inputFlows: flows.length,
        validFlows: links.length,
        threshold: flowThreshold
      });

      // Validate network data structure
      if (!validateNetworkData(nodes, links)) {
        backgroundMonitor.logError('network-analysis', {
          message: 'Network data validation failed',
          nodeCount: nodes.length,
          linkCount: links.length
        });
        analysisMetric.finish({ status: 'failed', reason: 'validation-failed' });
        return {
          nodes: [],
          links: [],
          metrics: {},
          error: 'Invalid network data structure'
        };
      }

      // Calculate network metrics
      const centrality = calculateEigenvectorCentrality(nodes, links);
      const keyMarkets = identifyKeyMarkets(flows, marketIntegration);
      const networkAnalysis = analyzeMarketNetwork(flows, marketIntegration);

      const maxFlow = Math.max(...links.map(l => l.value), 0);
      const minFlow = Math.min(...links.map(l => l.value), 0);

      backgroundMonitor.logMetric('network-metrics', {
        nodeCount: nodes.length,
        linkCount: links.length,
        maxFlow,
        minFlow,
        keyMarketsCount: keyMarkets?.length,
        hasCentrality: !!centrality?.metrics
      });

      analysisMetric.finish({ status: 'success' });

      return {
        nodes,
        links,
        metrics: {
          centrality,
          keyMarkets,
          maxFlow,
          minFlow,
          networkAnalysis
        },
        error: null
      };
    } catch (error) {
      backgroundMonitor.logError('network-analysis', {
        message: error.message,
        stack: error.stack
      });
      analysisMetric.finish({ status: 'failed', reason: 'error', error: error.message });
      return {
        nodes: [],
        links: [],
        metrics: {},
        error: error.message
      };
    }
  }, [geometry, flows, marketIntegration, flowThreshold]);
};
