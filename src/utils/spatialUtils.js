// src/utils/spatialUtils.js

import { transformCoordinates, processFlowMapWithTransform } from './coordinateTransforms';
import { parseISO, isValid } from 'date-fns';

/**
 * Enhanced region mapping with additional entries for Yemen governorates
 */
export const regionMapping = {
  'Abyan Governorate': 'abyan',
  'Adan Governorate': 'aden',
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
  // Additional mappings for variations
  'sanʿaʾ': 'sana\'a',
  'san_a_': 'sana\'a',
  'san_a': 'sana\'a',
  'sanaa': 'sana\'a',
  'lahij': 'lahj',
  'aden': 'aden',
  'hudaydah': 'al hudaydah',
  'taizz': 'taizz',
  'shabwah': 'shabwah',
  'hadramaut': 'hadramaut',
  'abyan': 'abyan',
  'al_jawf': 'al jawf',
  'ibb': 'ibb',
  'al_bayda': 'al bayda',
  'al_dhale': 'al dhale\'e',
  'al_mahwit': 'al mahwit',
  'hajjah': 'hajjah',
  'dhamar': 'dhamar',
  'amran': 'amran',
  'al_maharah': 'al maharah',
  'marib': 'marib',
  'raymah': 'raymah'
};

export const excludedRegions = ['Sa\'dah Governorate'];

/**
 * Normalizes region names by removing diacritics and standardizing format
 */
export const normalizeRegionName = (regionName) => {
  if (!regionName) return '';

  const normalized = regionName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[''']/g, "'") // Standardize apostrophes
    .replace(/[\s-]+/g, '_') // Replace spaces and hyphens with underscores
    .replace(/[^a-z0-9_']/g, '') // Remove invalid characters
    .trim();

  // Check if the normalized name has a mapping
  return regionMapping[normalized] || normalized;
};

/**
 * Validates spatial weights data structure
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
 * Processes and validates feature properties
 */
const processFeatureProperties = (properties) => {
  const processed = { ...properties };

  // Convert numeric fields
  const numericFields = ['price', 'usdprice', 'conflict_intensity'];
  numericFields.forEach(field => {
    if (properties[field] !== undefined) {
      const value = parseFloat(properties[field]);
      processed[field] = isNaN(value) ? null : value;
    } else {
      processed[field] = null;
    }
  });

  // Process date
  if (properties.date) {
    const parsedDate = parseISO(properties.date);
    processed.date = isValid(parsedDate) ? parsedDate.toISOString() : null;
  } else {
    processed.date = null;
  }

  // Normalize region ID
  if (properties.region_id) {
    processed.region_id = normalizeRegionName(properties.region_id);
  }

  return processed;
};

/**
 * Merges GeoJSON data with mapping and exclusion logic
 */
export const mergeSpatialDataWithMapping = async (
  geoBoundariesData,
  enhancedData,
  regionMapping,
  excludedRegions,
  chunkSize = 1000
) => {
  if (!geoBoundariesData?.features || !enhancedData?.features) {
    console.error('Invalid input data structure');
    return { type: 'FeatureCollection', features: [] };
  }

  const mergedFeatures = [];
  const unmatchedRegions = new Set();
  const geoBoundariesMap = new Map();

  // Process geoBoundaries first
  geoBoundariesData.features.forEach(feature => {
    const regionId = normalizeRegionName(feature.properties?.shapeName);
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

  for (const chunk of chunks) {
    await new Promise(resolve => setTimeout(resolve, 0)); // Prevent UI blocking

    chunk.forEach((enhancedFeature, index) => {
      try {
        const processedProps = processFeatureProperties(enhancedFeature.properties);
        const regionId = processedProps.region_id;
        const geoBoundaryData = geoBoundariesMap.get(regionId);
        
        if (!geoBoundaryData) {
          unmatchedRegions.add(regionId);
          return;
        }

        const uniqueId = `${regionId}_${processedProps.commodity || 'unknown'}_${processedProps.date || 'nodate'}_${index}`;

        mergedFeatures.push({
          type: 'Feature',
          properties: {
            ...geoBoundaryData.baseProperties,
            ...processedProps,
            id: uniqueId
          },
          geometry: geoBoundaryData.geometry
        });
      } catch (error) {
        console.error(`Error processing feature at index ${index}:`, error);
      }
    });
  } // Correctly close the for-of loop

  // Add features for regions without data
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

  if (unmatchedRegions.size > 0) {
    console.warn('Unmatched regions:', Array.from(unmatchedRegions));
  }

  return {
    type: 'FeatureCollection',
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
 * Extracts unique months from features
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
 * Monitors spatial data processing performance
 */
export const monitorSpatialDataProcessing = (data, stage) => {
  const startTime = performance.now();
  
  const stats = {
    stage,
    timestamp: new Date().toISOString(),
    featureCount: data?.features?.length || 0,
    memoryUsage: typeof process !== 'undefined' && process.memoryUsage ? {
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

/**
 * Merges residuals into GeoJSON data
 */
export const mergeResidualsIntoGeoData = (geoJsonData, residualsData) => {
  if (!geoJsonData?.features || !residualsData) {
    console.warn('Invalid input for residuals merge');
    return geoJsonData;
  }

  geoJsonData.features.forEach(feature => {
    const region = feature.properties.region_id ||
      (feature.properties.ADM1_EN ? normalizeRegionName(feature.properties.ADM1_EN) : null);
    const date = feature.properties.date;

    if (region && date && residualsData[region]?.[date] !== undefined) {
      feature.properties.residual = residualsData[region][date];
    } else {
      feature.properties.residual = null;
    }
  });

  return geoJsonData;
};

export default {
  normalizeRegionName,
  validateSpatialWeights,
  mergeSpatialDataWithMapping,
  processFeatureProperties,
  extractUniqueMonths,
  monitorSpatialDataProcessing,
  trackCommodityData,
  mergeResidualsIntoGeoData,
  regionMapping,
  excludedRegions
};
