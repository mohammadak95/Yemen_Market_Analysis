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
import { spatialHandler } from '../../../../utils/spatialDataHandler';
import { validateNetworkData } from '../../../../utils/regionMappingValidator';
import { YEMEN_REFERENCE_COORDINATES } from '../utils/coordinateHandler';
import { normalizeRegionName } from '../../../../utils/regionMappingValidator.js';

/**
 * Create base nodes from Yemen reference coordinates
 * @returns {Array} Array of network nodes
 */
const createNodesFromReference = () => {
  return Object.entries(YEMEN_REFERENCE_COORDINATES).map(([name, coordinates]) => ({
    id: normalizeRegionName(name),
    name,
    x: coordinates[0],
    y: coordinates[1],
    population: 0,
    region_id: normalizeRegionName(name)
  }));
};

/**
 * Convert GeoJSON point feature to network node
 * @param {Object} feature - GeoJSON feature
 * @returns {Object|null} Network node or null if invalid
 */
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

  const id = normalizeRegionName(name);

  // Cross-reference with reference coordinates
  const referenceCoords = YEMEN_REFERENCE_COORDINATES[name];
  if (referenceCoords) {
    // Use reference coordinates if available
    return {
      id,
      name,
      x: referenceCoords[0],
      y: referenceCoords[1],
      population: feature.properties?.population || 0,
      region_id: id
    };
  }

  const node = {
    id,
    name,
    x,
    y,
    population: feature.properties?.population || 0,
    region_id: id
  };

  backgroundMonitor.logMetric('node-creation', {
    nodeId: node.id,
    coordinates: [x, y],
    hasPopulation: !!node.population,
    usedReference: false
  });

  return node;
};

/**
 * Process and merge nodes from multiple sources
 * @param {Array} referenceNodes - Nodes from reference coordinates
 * @param {Array} featureNodes - Nodes from GeoJSON features
 * @returns {Array} Merged and deduplicated nodes
 */
const mergeNodes = (referenceNodes, featureNodes) => {
  const nodeMap = new Map();
  
  // Add reference nodes first
  referenceNodes.forEach(node => {
    nodeMap.set(node.id, node);
  });

  // Add or update with feature nodes
  featureNodes.forEach(node => {
    if (node && node.id) {
      const existing = nodeMap.get(node.id);
      if (existing) {
        // Update existing node with any additional information
        nodeMap.set(node.id, {
          ...existing,
          population: node.population || existing.population
        });
      } else {
        nodeMap.set(node.id, node);
      }
    }
  });

  return Array.from(nodeMap.values());
};

/**
 * Hook to process network data and compute network metrics
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
      // Validation checks
      if (!flows?.length) {
        throw new Error('No flow data available');
      }

      // Create base nodes from reference coordinates
      const referenceNodes = createNodesFromReference();

      // Process geometry and create additional nodes if available
      let featureNodes = [];
      if (geometry) {
        const processedGeometry = safeGeoJSONProcessor(geometry, 'network');
        if (processedGeometry?.features) {
          featureNodes = processedGeometry.features
            .filter(feature => feature.geometry?.type === 'Point')
            .map(convertGeoJSONPointToNode)
            .filter(Boolean);
        }
      }

      // Merge nodes from both sources
      const nodes = mergeNodes(referenceNodes, featureNodes);

      // Process links with validation
      const links = flows
        .filter(flow => flow.totalFlow >= flowThreshold && Number.isFinite(flow.totalFlow))
        .map(flow => ({
          source: normalizeRegionName(flow.source),
          target: normalizeRegionName(flow.target),
          value: flow.totalFlow || 0,
          avgFlow: flow.avgFlow || 0,
          flowCount: flow.flowCount || 0
        }));

      // Validate network data
      const validation = validateNetworkData(nodes, links);
      
      if (!validation.isValid) {
        backgroundMonitor.logError('network-analysis', {
          message: 'Network validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        });
        
        // Filter out invalid links
        const validLinks = links.filter(link => {
          return nodes.some(n => n.id === link.source) && 
                 nodes.some(n => n.id === link.target);
        });

        // Calculate metrics with valid data
        const metrics = calculateNetworkMetrics(nodes, validLinks, marketIntegration);

        analysisMetric.finish({ 
          status: 'partial-success',
          invalidLinksRemoved: links.length - validLinks.length
        });

        return {
          nodes,
          links: validLinks,
          metrics,
          warnings: validation.warnings,
          error: null
        };
      }

      // Calculate metrics with all data
      const metrics = calculateNetworkMetrics(nodes, links, marketIntegration);

      analysisMetric.finish({ status: 'success' });

      return {
        nodes,
        links,
        metrics,
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

/**
 * Calculate network metrics
 */
const calculateNetworkMetrics = (nodes, links, marketIntegration) => {
  const centrality = calculateEigenvectorCentrality(nodes, links);
  const keyMarkets = identifyKeyMarkets(links, marketIntegration);
  const networkAnalysis = analyzeMarketNetwork(links, marketIntegration);

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

  return {
    centrality,
    keyMarkets,
    maxFlow,
    minFlow,
    networkAnalysis
  };
};