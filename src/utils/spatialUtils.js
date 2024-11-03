// ===== spatialUtils.js =====

// ==========================
// Region Mapping and Exclusion
// ==========================
export const regionMapping = {
  'Abyan Governorate': 'abyan',
  '‘Adan Governorate': 'aden',
  "Al Bayda' Governorate": 'al bayda',
  "Ad Dali' Governorate": 'al dhale\'e',
  'Al Hudaydah Governorate': 'al hudaydah',
  'Al Jawf Governorate': 'al jawf',
  'Al Mahrah Governorate': 'al maharah',
  'Al Mahwit Governorate': 'al mahwit',
  'Sanʿaʾ': 'amanat al asimah',
  "'Amran Governorate": 'amran',
  'Dhamar Governorate': 'dhamar',
  'Hadhramaut': 'hadramaut',
  'Hajjah Governorate': 'hajjah',
  'Ibb Governorate': 'ibb',
  'Lahij Governorate': 'lahj',
  "Ma'rib Governorate": 'marib',
  'Raymah Governorate': 'raymah',
  'Sanʿaʾ Governorate': 'sana\'a',
  'Shabwah Governorate': 'shabwah',
  'Socotra': 'socotra',
  "Ta'izz Governorate": 'taizz',
};

export const excludedRegions = ['Sa\'dah Governorate'];

// src/utils/spatialUtils.js

import { isValid } from 'date-fns';

/**
 * Normalizes region names for consistent comparison.
 * @param {string} regionName - Name of the region to normalize.
 * @returns {string} Normalized region name.
 */
export const normalizeRegionName = (regionName) => {
  if (!regionName) return '';

  return regionName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/['']/g, "'")
    .replace(/\s+/g, '_')
    .replace(/governorate$/i, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_') // Collapse multiple underscores
    .trim();
};

/**
 * Validates spatial weights data structure
 * @param {Object} weightsData - The spatial weights data to validate
 * @returns {Object} Validation result with isValid flag and any errors
 */
export const validateSpatialWeights = (weightsData) => {
  const errors = [];
  const regions = new Set();
  
  if (!weightsData || typeof weightsData !== 'object') {
    return { isValid: false, errors: ['Invalid weights data structure'] };
  }

  Object.entries(weightsData).forEach(([region, data]) => {
    regions.add(region);
    
    if (!data || !Array.isArray(data.neighbors)) {
      errors.push(`Invalid neighbors format for region: ${region}`);
      return;
    }

    // Validate neighbor references
    data.neighbors.forEach(neighbor => {
      if (typeof neighbor !== 'string') {
        errors.push(`Invalid neighbor type for region ${region}: expected string`);
      }
      if (!weightsData[neighbor]) {
        errors.push(`Invalid neighbor reference: ${neighbor} in region ${region}`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    regionCount: regions.size
  };
};

/**
 * Validates and processes feature properties
 * @param {Object} feature - The GeoJSON feature to validate
 * @param {string} selectedCommodity - Selected commodity for validation
 * @returns {Object} Validation result
 */
export const validateFeature = (feature, selectedCommodity) => {
  const validation = {
    isValid: false,
    issues: []
  };

  try {
    // Basic structure validation
    if (!feature?.type || feature.type !== 'Feature') {
      validation.issues.push('Invalid feature type');
      return validation;
    }

    // Geometry validation
    if (!feature.geometry?.coordinates || !Array.isArray(feature.geometry.coordinates)) {
      validation.issues.push('Invalid geometry coordinates');
    } else {
      // Validate coordinate ranges for Yemen
      const [lon, lat] = feature.geometry.coordinates;
      if (lon < 41 || lon > 55 || lat < 12 || lat > 19) {
        validation.issues.push('Coordinates outside Yemen bounds');
      }
    }

    // Properties validation
    const props = feature.properties || {};
    const required = {
      date: (v) => !isNaN(new Date(v).getTime()),
      commodity: (v) => typeof v === 'string' && v.length > 0,
      price: (v) => typeof v === 'number' && !isNaN(v) && v >= 0,
      usdprice: (v) => typeof v === 'number' && !isNaN(v) && v >= 0,
      conflict_intensity: (v) => typeof v === 'number' && !isNaN(v) && v >= 0
    };

    Object.entries(required).forEach(([prop, validator]) => {
      if (!props[prop] || !validator(props[prop])) {
        validation.issues.push(`Invalid or missing ${prop}`);
      }
    });

    // Commodity match validation if selected
    if (selectedCommodity && props.commodity?.toLowerCase() !== selectedCommodity.toLowerCase()) {
      validation.issues.push('Commodity mismatch');
    }

    validation.isValid = validation.issues.length === 0;
    return validation;

  } catch (error) {
    validation.issues.push(`Validation error: ${error.message}`);
    return validation;
  }
};

/**
 * Merges GeoJSON data in chunks while preserving correct structure and properties
 * @param {Object} geoBoundariesData - GeoJSON from geoBoundaries-YEM-ADM1.geojson
 * @param {Object} enhancedData - GeoJSON from unified_data.geojson
 * @param {Object} regionMapping - Region name mapping object
 * @param {Array<string>} excludedRegions - Regions to exclude from processing
 * @param {number} chunkSize - Size of chunks for processing
 * @returns {Promise<Object>} Merged GeoJSON data
 */
export const mergeGeoDataChunked = async (
  geoBoundariesData,
  enhancedData,
  regionMapping,
  excludedRegions,
  chunkSize = 1000
) => {
  // Validate input data structure
  if (!geoBoundariesData?.features || !enhancedData?.features) {
    console.error('Invalid input data structure');
    return { type: 'FeatureCollection', features: [] };
  }

  const mergedFeatures = [];
  const unmatchedRegions = new Set();
  const geoBoundariesMap = new Map();

  // Process geoBoundaries first
  geoBoundariesData.features.forEach(feature => {
    // Extract region identifier using actual property structure from your data
    const regionId = getRegionId(feature.properties, regionMapping);
    if (!regionId || excludedRegions.includes(regionId)) return;
    
    geoBoundariesMap.set(regionId, {
      geometry: feature.geometry,
      baseProperties: {
        ...feature.properties,
        region_id: regionId
      }
    });
  });

  // Process enhanced data in chunks
  const chunks = [];
  for (let i = 0; i < enhancedData.features.length; i += chunkSize) {
    chunks.push(enhancedData.features.slice(i, i + chunkSize));
  }

  // Process each chunk
  for (const chunk of chunks) {
    await new Promise(resolve => setTimeout(resolve, 0)); // Prevent UI blocking

    chunk.forEach((enhancedFeature, index) => {
      try {
        // Validate and process enhanced feature data
        const validationResult = validateFeatureData(enhancedFeature, null, regionMapping);
        if (!validationResult.isValid) {
          console.warn(`Invalid feature at index ${index}:`, validationResult.errors);
          return;
        }

        const regionId = validationResult.regionId;
        const geoBoundaryData = geoBoundariesMap.get(regionId);
        
        if (!geoBoundaryData) {
          unmatchedRegions.add(regionId);
          return;
        }

        // Process properties according to your unified_data.geojson structure
        const processedProps = processFeatureProperties({
          ...enhancedFeature.properties,
          admin1: regionId,
          // Convert coordinates if needed based on your CRS
          latitude: enhancedFeature.properties.latitude,
          longitude: enhancedFeature.properties.longitude
        });

        // Generate unique ID based on actual data properties
        const date = processedProps.date ? 
          new Date(processedProps.date).toISOString().split('T')[0] : 
          'nodate';
        const uniqueId = `${regionId}_${processedProps.commodity || 'unknown'}_${date}_${index}`;

        // Create merged feature with correct structure
        mergedFeatures.push({
          type: 'Feature',
          properties: {
            ...geoBoundaryData.baseProperties,
            ...processedProps,
            id: uniqueId,
            region_id: regionId
          },
          geometry: geoBoundaryData.geometry
        });
      } catch (error) {
        console.error(`Error processing feature at index ${index}:`, error);
      }
    });
  }

  // Add features for regions without data, preserving original properties
  geoBoundariesMap.forEach((geoBoundaryData, regionId) => {
    if (!mergedFeatures.some(f => f.properties.region_id === regionId)) {
      mergedFeatures.push({
        type: 'Feature',
        properties: {
          ...geoBoundaryData.baseProperties,
          commodity: 'unknown',
          date: null,
          usdprice: null,
          price: null,
          conflict_intensity: null,
          residual: null,
          id: `${regionId}_no_data`,
          // Preserve original coordinate system
          latitude: null,
          longitude: null,
          // Keep required properties from your data structure
          exchange_rate_regime: 'unknown',
          events: null,
          fatalities: null,
          population: null,
          population_percentage: null
        },
        geometry: geoBoundaryData.geometry
      });
    }
  });

  return {
    type: 'FeatureCollection',
    // Preserve CRS information from your data
    crs: geoBoundariesData.crs || { 
      type: "name", 
      properties: { 
        name: "urn:ogc:def:crs:OGC:1.3:CRS84" 
      } 
    },
    features: mergedFeatures
  };
};

/**
 * Validates feature data against expected structure
 * @param {Object} feature - Feature to validate
 * @param {string} selectedCommodity - Selected commodity
 * @param {Object} regionMapping - Region mapping object
 * @returns {Object} Validation result
 */
const validateFeatureData = (feature, selectedCommodity, regionMapping) => {
  const errors = [];
  if (!feature?.properties) {
    return { isValid: false, errors: ['Missing properties'] };
  }

  const props = feature.properties;
  const regionId = getRegionId(props, regionMapping);

  if (!regionId) {
    errors.push('Invalid or missing region identifier');
  }

  // Validate required numeric fields from your data structure
  ['price', 'usdprice', 'conflict_intensity'].forEach(field => {
    const value = props[field];
    if (value !== undefined && value !== null) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(`Invalid ${field} value: ${value}`);
      }
    }
  });

  // Validate date format
  if (props.date && isNaN(new Date(props.date).getTime())) {
    errors.push(`Invalid date format: ${props.date}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    regionId
  };
};

/**
 * Processes feature properties according to your data structure
 * @param {Object} props - Properties to process
 * @returns {Object} Processed properties
 */
const processFeatureProperties = (props) => {
  return {
    ...props,
    // Convert numeric fields based on your data format
    price: props.price !== undefined ? parseFloat(props.price) || null : null,
    usdprice: props.usdprice !== undefined ? parseFloat(props.usdprice) || null : null,
    conflict_intensity: props.conflict_intensity !== undefined ? 
      parseFloat(props.conflict_intensity) || null : null,
    // Handle dates in your format
    date: props.date ? new Date(props.date).toISOString() : null,
    // Process additional fields from your data structure
    events: props.events !== undefined ? parseInt(props.events) || null : null,
    fatalities: props.fatalities !== undefined ? parseInt(props.fatalities) || null : null,
    population: props.population !== undefined ? parseFloat(props.population) || null : null,
    population_percentage: props.population_percentage !== undefined ? 
      parseFloat(props.population_percentage) || null : null,
    exchange_rate_regime: props.exchange_rate_regime || 'unknown'
  };
};

/**
 * Gets region ID from feature properties with fallbacks
 * @param {Object} properties - Feature properties
 * @param {Object} regionMapping - Region name mapping
 * @returns {string|null} Normalized region ID
 */
export const getRegionId = (properties, regionMapping) => {
  if (!properties) return null;

  const regionOptions = ['region_id', 'admin1', 'shapeName', 'ADM1_EN'];
  
  for (const option of regionOptions) {
    const value = properties[option];
    if (value) {
      // Check for direct mapping first
      if (regionMapping[value]) {
        return normalizeRegionName(regionMapping[value]);
      }
      
      // Try normalized version of the value
      const normalizedValue = normalizeRegionName(value);
      if (Object.values(regionMapping).includes(normalizedValue)) {
        return normalizedValue;
      }
      
      // If no mapping found but it's a valid region name, use it
      if (option === 'region_id' || option === 'admin1') {
        return normalizedValue;
      }
    }
  }

  return null;
};

/**
 * Extracts unique months from features
 * @param {Array} features - Array of GeoJSON features
 * @returns {Array<Date>} Array of unique dates
 */
export const extractUniqueMonths = (features) => {
  if (!Array.isArray(features)) return [];

  const uniqueDates = new Set();
  features.forEach(feature => {
    const date = feature.properties?.date;
    if (date && isValid(new Date(date))) {
      const monthDate = new Date(date);
      uniqueDates.add(
        `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`
      );
    }
  });

  return Array.from(uniqueDates)
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => a - b);
};

/**
 * Debug utility for monitoring spatial data processing
 * @param {Object} data - Data being processed
 * @param {string} stage - Processing stage identifier
 * @returns {Object} Processing statistics
 */
export const monitorSpatialDataProcessing = (data, stage) => {
  const startTime = performance.now();
  
  const stats = {
    stage,
    timestamp: new Date().toISOString(),
    featureCount: data?.features?.length || 0,
    memoryUsage: process.memoryUsage ? {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    } : 'Not available',
    processingTime: null
  };

  console.group(`Spatial Data Processing - ${stage}`);
  console.log('Processing Stats:', {
    featureCount: stats.featureCount,
    timestamp: stats.timestamp
  });

  if (stats.featureCount > 10000) {
    console.warn('Large dataset detected - chunked processing recommended');
  }

  return {
    ...stats,
    finish: () => {
      stats.processingTime = `${((performance.now() - startTime) / 1000).toFixed(2)}s`;
      console.log('Processing completed:', {
        processingTime: stats.processingTime,
        memoryUsage: stats.memoryUsage
      });
      console.groupEnd();
      return stats;
    }
  };
};

/**
 * Tracks commodity-specific data during processing
 * @param {string} selectedCommodity - Selected commodity to track
 * @param {Object} data - GeoJSON data being processed
 * @returns {Object} Tracking results
 */
export const trackCommodityData = (selectedCommodity, data) => {
  if (!selectedCommodity || !data?.features) {
    console.warn('Invalid input for commodity tracking');
    return null;
  }

  const tracking = {
    commodity: selectedCommodity,
    timestamp: new Date().toISOString(),
    features: {
      total: data.features.length,
      matched: 0,
      invalid: 0
    },
    prices: {
      min: Infinity,
      max: -Infinity,
      average: 0,
      count: 0
    },
    dates: {
      min: null,
      max: null,
      uniqueCount: 0
    }
  };

  const dates = new Set();
  let priceSum = 0;

  data.features.forEach(feature => {
    if (feature.properties?.commodity?.toLowerCase() === selectedCommodity.toLowerCase()) {
      tracking.features.matched++;
      
      const price = feature.properties.usdprice;
      if (typeof price === 'number' && !isNaN(price)) {
        tracking.prices.min = Math.min(tracking.prices.min, price);
        tracking.prices.max = Math.max(tracking.prices.max, price);
        priceSum += price;
        tracking.prices.count++;
      }

      const date = feature.properties.date;
      if (date && isValid(new Date(date))) {
        dates.add(date.split('T')[0]);
        if (!tracking.dates.min || date < tracking.dates.min) {
          tracking.dates.min = date;
        }
        if (!tracking.dates.max || date > tracking.dates.max) {
          tracking.dates.max = date;
        }
      }
    } else {
      tracking.features.invalid++;
    }
  });

  tracking.prices.average = tracking.prices.count > 0 ? 
    priceSum / tracking.prices.count : null;
  tracking.dates.uniqueCount = dates.size;

  if (tracking.prices.min === Infinity) tracking.prices.min = null;
  if (tracking.prices.max === -Infinity) tracking.prices.max = null;

  return tracking;
};

export default {
  normalizeRegionName,
  validateSpatialWeights,
  validateFeature,
  mergeGeoDataChunked,
  processFeatureProperties,
  getRegionId,
  extractUniqueMonths,
  monitorSpatialDataProcessing,
  trackCommodityData
};