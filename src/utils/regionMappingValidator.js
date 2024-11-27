// src/utils/spatialMappingValidator.js


import { backgroundMonitor } from './backgroundMonitor';
import { spatialHandler } from './spatialDataHandler';

const REGION_MAPPINGS = spatialHandler.REGION_MAPPINGS;

/**
 * Normalize region name using mapping
 * @param {string} name - Region name to normalize
 * @returns {string} Normalized region name
 */
export const normalizeRegionName = (name) => {
  if (!name) return '';
  const normalized = name.toLowerCase().trim()
    .replace(/[_-]+/g, ' ')           // Normalize separators
    .replace(/ʿ/g, "'")               // Normalize special quotes
    .replace(/['']/g, "'")            // Normalize quotes
    .replace(/\s+/g, ' ')             // Normalize spaces
    .replace(/governorate$/i, '')      // Remove governorate suffix
    .trim();
  
  return REGION_MAPPINGS[normalized] || normalized;
};

/**
 * Validate network data region mappings
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @returns {Object} Validation results
 */
export const validateNetworkData = (nodes, links) => {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set(nodes.map(n => n.id));
  const unmappedRegions = new Set();
  const invalidLinks = [];

  // Validate links
  links.forEach(link => {
    const sourceNormalized = normalizeRegionName(link.source);
    const targetNormalized = normalizeRegionName(link.target);

    if (!nodeIds.has(sourceNormalized)) {
      unmappedRegions.add(link.source);
      invalidLinks.push({
        link,
        reason: `Source region "${link.source}" not found in nodes`
      });
    }

    if (!nodeIds.has(targetNormalized)) {
      unmappedRegions.add(link.target);
      invalidLinks.push({
        link,
        reason: `Target region "${link.target}" not found in nodes`
      });
    }
  });

  if (unmappedRegions.size > 0) {
    errors.push({
      type: 'unmapped_regions',
      regions: Array.from(unmappedRegions),
      message: 'Some regions in links are not mapped to nodes'
    });
  }

  if (invalidLinks.length > 0) {
    warnings.push({
      type: 'invalid_links',
      links: invalidLinks,
      message: 'Some links reference non-existent nodes'
    });
  }

  // Log validation results for debugging
  if (process.env.NODE_ENV === 'development') {
    console.group('Network Data Validation');
    console.log('Nodes:', nodes.length);
    console.log('Links:', links.length);
    console.log('Unmapped Regions:', Array.from(unmappedRegions));
    console.log('Invalid Links:', invalidLinks);
    console.groupEnd();

    backgroundMonitor.logMetric('network-validation', {
      nodeCount: nodes.length,
      linkCount: links.length,
      unmappedCount: unmappedRegions.size,
      invalidLinkCount: invalidLinks.length
    });
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
    unmappedRegions: Array.from(unmappedRegions),
    invalidLinks
  };
};

/**
 * Validate spatial data region mappings
 * @param {Object} spatialData - Spatial autocorrelation data
 * @param {Object} localI - Local Moran's I values by region
 * @returns {Object} Validation results
 */
export const validateSpatialData = (spatialData, localI) => {
  const errors = [];
  const warnings = [];
  const processedData = {};

  // Check for required data
  if (!spatialData || !localI) {
    errors.push('Missing spatial data or local Moran\'s I values');
    return { errors, warnings, processedData, isValid: false };
  }

  // Process each region
  Object.entries(localI).forEach(([region, data]) => {
    const normalizedRegion = normalizeRegionName(region);
    
    if (!normalizedRegion) {
      warnings.push(`Could not normalize region name: ${region}`);
      return;
    }

    // Validate Moran's I value
    if (typeof data.local_i !== 'number' || isNaN(data.local_i)) {
      warnings.push(`Invalid Moran's I value for region: ${region}`);
      return;
    }

    processedData[normalizedRegion] = {
      original: region,
      local_i: data.local_i,
      p_value: data.p_value,
      cluster_type: data.cluster_type || 'not-significant'
    };
  });

  return {
    errors,
    warnings,
    processedData,
    isValid: errors.length === 0
  };
};

/**
 * Debug spatial data mappings
 */
export const debugSpatialMappings = (spatialData, localI) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('Spatial Data Mapping Debug');
  
  const unmappedRegions = new Set();
  const mappedRegions = new Map();

  Object.keys(localI || {}).forEach(region => {
    const normalizedRegion = normalizeRegionName(region);
    if (normalizedRegion === region) {
      unmappedRegions.add(region);
    } else {
      mappedRegions.set(region, normalizedRegion);
    }
  });

  console.log('Unmapped Regions:', Array.from(unmappedRegions));
  console.log('Mapped Regions:', Object.fromEntries(mappedRegions));
  console.log('Moran\'s I Summary:', summarizeMoranI(localI));

  console.groupEnd();
};

/**
 * Summarize Moran's I statistics
 */
const summarizeMoranI = (localI) => {
  if (!localI) return null;

  const values = Object.values(localI).map(d => d.local_i).filter(v => !isNaN(v));
  
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: values.reduce((a, b) => a + b, 0) / values.length
  };
};
