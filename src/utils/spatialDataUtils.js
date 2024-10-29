// src/utils/spatialDataUtils.js

import { isValid } from 'date-fns';

/**
 * Normalizes region names for consistent comparison
 * @param {string} regionName
 * @returns {string}
 */
export const normalizeRegionName = (regionName) => {
  if (!regionName) return '';
  
  return regionName
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, '_')
    .replace(/governorate$/i, '')
    .trim();
};

/**
 * Safely gets region ID from feature properties with fallbacks
 * @param {Object} properties
 * @param {Object} regionMapping
 * @returns {string|null}
 */
export const getRegionId = (properties, regionMapping) => {
  if (!properties) return null;

  // Try direct region_id first
  if (properties.region_id) {
    return normalizeRegionName(properties.region_id);
  }

  // Try admin1 if available
  if (properties.admin1) {
    return normalizeRegionName(properties.admin1);
  }

  // Try shapeName with mapping
  if (properties.shapeName && regionMapping[properties.shapeName]) {
    return normalizeRegionName(regionMapping[properties.shapeName]);
  }

  // Try shapeName directly if no mapping exists
  if (properties.shapeName) {
    return normalizeRegionName(properties.shapeName);
  }

  // Try ADM1_EN as last resort
  if (properties.ADM1_EN) {
    return normalizeRegionName(properties.ADM1_EN);
  }

  return null;
};

/**
 * Validates and processes feature properties
 * @param {Object} props
 * @returns {Object}
 */
export const processFeatureProperties = (props) => {
  if (!props) return {};

  return {
    ...props,
    date: props.date ? new Date(props.date) : null,
    price: typeof props.price === 'number' ? props.price : null,
    usdprice: typeof props.usdprice === 'number' ? props.usdprice : null,
    conflict_intensity: typeof props.conflict_intensity === 'number' ? props.conflict_intensity : null,
    residual: typeof props.residual === 'number' ? props.residual : null
  };
};

/**
 * Validates feature data against requirements and selected commodity
 * @param {Object} feature - The feature to validate
 * @param {string} selectedCommodity - The currently selected commodity
 * @param {Object} regionMapping - The region mapping object
 * @returns {Object} Validation result with isValid flag and any errors
 */
export const validateFeatureData = (feature, selectedCommodity, regionMapping) => {
  if (!feature || !feature.properties) {
    return {
      isValid: false,
      errors: ['Invalid feature structure']
    };
  }

  const errors = [];
  const { properties } = feature;

  // Check required fields
  if (!properties.date) errors.push('Missing date');
  if (!properties.commodity) errors.push('Missing commodity');

  const regionId = getRegionId(properties, regionMapping);
  if (!regionId) errors.push('Missing or invalid region identifier');

  // Validate date
  if (properties.date) {
    const dateObj = new Date(properties.date);
    if (!isValid(dateObj)) {
      errors.push('Invalid date format');
    }
  }

  // Validate numeric fields
  const numericFields = {
    price: 'price',
    usdprice: 'USD price',
    conflict_intensity: 'conflict intensity'
  };

  Object.entries(numericFields).forEach(([field, label]) => {
    if (properties[field] !== null && properties[field] !== undefined) {
      if (typeof properties[field] !== 'number' || isNaN(properties[field])) {
        errors.push(`Invalid ${label} value`);
      }
    }
  });

  // Validate commodity match if selectedCommodity is provided
  if (selectedCommodity && properties.commodity) {
    const normalizedSelected = selectedCommodity.toLowerCase().trim();
    const normalizedFeature = properties.commodity.toLowerCase().trim();
    if (normalizedSelected !== normalizedFeature) {
      errors.push(`Commodity mismatch: expected ${selectedCommodity}, got ${properties.commodity}`);
    }
  }

  // Validate geometry
  if (!feature.geometry || !feature.geometry.type || !feature.geometry.coordinates) {
    errors.push('Invalid or missing geometry');
  }

  return {
    isValid: errors.length === 0,
    errors,
    regionId // Return the resolved regionId for reference
  };
};

/**
 * Enhanced merge function with better error handling
 */
export const mergeGeoData = (geoBoundariesData, enhancedData, regionMapping, excludedRegions) => {
  if (!geoBoundariesData?.features || !enhancedData?.features) {
    console.error('Invalid input data structure');
    return { type: 'FeatureCollection', features: [] };
  }

  const mergedFeatures = [];
  const unmatchedRegions = new Set();
  const geoBoundariesMap = new Map();

  // Process geoBoundaries first
  geoBoundariesData.features.forEach(feature => {
    const regionId = getRegionId(feature.properties, regionMapping);
    
    if (!regionId) {
      console.warn(`Unable to determine region_id for feature:`, feature.properties);
      return;
    }

    if (excludedRegions.map(r => normalizeRegionName(r)).includes(regionId)) {
      console.info(`Excluding region: ${regionId}`);
      return;
    }

    geoBoundariesMap.set(regionId, feature);
  });

  // Process enhanced data features
  enhancedData.features.forEach((enhancedFeature, index) => {
    try {
      const validationResult = validateFeatureData(enhancedFeature, null, regionMapping);
      
      if (!validationResult.isValid) {
        console.warn(`Invalid feature at index ${index}:`, validationResult.errors);
        return;
      }

      const regionId = validationResult.regionId;
      const geoBoundaryFeature = geoBoundariesMap.get(regionId);
      
      if (!geoBoundaryFeature) {
        if (!unmatchedRegions.has(regionId)) {
          console.warn(`No geoBoundaries data for region_id: "${regionId}"`);
          unmatchedRegions.add(regionId);
        }
        return;
      }

      const processedProps = processFeatureProperties(enhancedFeature.properties);
      
      // Create unique ID including date if available
      const date = processedProps.date ? processedProps.date.toISOString().split('T')[0] : 'nodate';
      const uniqueId = `${regionId}_${processedProps.commodity || 'unknown'}_${date}_${index}`;

      mergedFeatures.push({
        type: 'Feature',
        properties: {
          ...geoBoundaryFeature.properties,
          ...processedProps,
          region_id: regionId,
          id: uniqueId
        },
        geometry: geoBoundaryFeature.geometry
      });
    } catch (error) {
      console.error(`Error processing feature at index ${index}:`, error);
    }
  });

  // Add empty features for regions without data
  geoBoundariesMap.forEach((geoFeature, regionId) => {
    const hasData = mergedFeatures.some(f => f.properties.region_id === regionId);
    
    if (!hasData) {
      console.info(`No enhanced data found for region_id: "${regionId}"`);
      
      mergedFeatures.push({
        type: 'Feature',
        properties: {
          ...geoFeature.properties,
          region_id: regionId,
          commodity: 'unknown',
          date: null,
          usdprice: null,
          price: null,
          conflict_intensity: null,
          residual: null,
          id: `${regionId}_no_data`
        },
        geometry: geoFeature.geometry
      });
    }
  });

  if (unmatchedRegions.size > 0) {
    console.warn('Unmatched regions:', Array.from(unmatchedRegions));
  }

  return {
    type: 'FeatureCollection',
    features: mergedFeatures
  };
};

/**
 * Validates and extracts unique months from features
 */
export const extractUniqueMonths = (features) => {
  if (!Array.isArray(features)) return [];

  const validDates = features
    .map(f => f.properties?.date)
    .filter(date => date && isValid(new Date(date)));

  const uniqueMonths = new Set(
    validDates.map(date => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })
  );

  return Array.from(uniqueMonths)
    .map(monthStr => new Date(`${monthStr}-01`))
    .sort((a, b) => a - b);
};