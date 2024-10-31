// ===== spatialDataUtils.js =====

// src/utils/spatialDataUtils.js

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
    .replace(/['']/g, "'")
    .replace(/\s+/g, '_')
    .replace(/governorate$/i, '')
    .trim();
};

/**
 * Safely retrieves region ID from feature properties with fallbacks.
 * @param {Object} properties - The feature properties.
 * @param {Object} regionMapping - Mapping for region names.
 * @returns {string|null} Normalized region ID or null if not found.
 */
export const getRegionId = (properties, regionMapping) => {
  if (!properties) return null;

  // Check for region ID using different property names.
  const regionOptions = ['region_id', 'admin1', 'shapeName', 'ADM1_EN'];
  for (let option of regionOptions) {
    const value = properties[option];
    if (value && (option !== 'shapeName' || regionMapping[value])) {
      return normalizeRegionName(regionMapping[value] || value);
    }
  }

  return null;
};

/**
 * Validates and processes feature properties.
 * @param {Object} props - The feature properties.
 * @returns {Object} Processed properties.
 */
export const processFeatureProperties = (props) => ({
  ...props,
  date: props.date ? new Date(props.date) : null,
  price: typeof props.price === 'number' ? props.price : null,
  usdprice: typeof props.usdprice === 'number' ? props.usdprice : null,
  conflict_intensity: typeof props.conflict_intensity === 'number' ? props.conflict_intensity : null,
  residual: typeof props.residual === 'number' ? props.residual : null
});


/**
 * Merges GeoJSON data with enhanced data.
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
    
    if (!regionId || excludedRegions.includes(regionId)) return;
    geoBoundariesMap.set(regionId, feature);
  });

  // Merge features
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
        unmatchedRegions.add(regionId);
        return;
      }

      const processedProps = processFeatureProperties(enhancedFeature.properties);
      const date = processedProps.date ? processedProps.date.toISOString().split('T')[0] : 'nodate';
      const uniqueId = `${regionId}_${processedProps.commodity || 'unknown'}_${date}_${index}`;

      mergedFeatures.push({
        type: 'Feature',
        properties: { ...geoBoundaryFeature.properties, ...processedProps, region_id: regionId, id: uniqueId },
        geometry: geoBoundaryFeature.geometry
      });
    } catch (error) {
      console.error(`Error processing feature at index ${index}:`, error);
    }
  });

  geoBoundariesMap.forEach((geoFeature, regionId) => {
    if (!mergedFeatures.some(f => f.properties.region_id === regionId)) {
      mergedFeatures.push({
        type: 'Feature',
        properties: { ...geoFeature.properties, region_id: regionId, commodity: 'unknown', date: null, usdprice: null, price: null, conflict_intensity: null, residual: null, id: `${regionId}_no_data` },
        geometry: geoFeature.geometry
      });
    }
  });

  if (unmatchedRegions.size > 0) console.warn('Unmatched regions:', Array.from(unmatchedRegions));

  return { type: 'FeatureCollection', features: mergedFeatures };
};

/**
 * Extracts unique months from features.
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


export const debugSpatialData = (geoBoundariesData, enhancedData, selectedCommodity) => {
  console.group('Spatial Data Processing Debug');
  
  // Log initial data state
  console.log('Processing Data:', {
    selectedCommodity,
    hasGeoBoundaries: !!geoBoundariesData,
    hasEnhancedData: !!enhancedData,
    geoBoundariesFeatureCount: geoBoundariesData?.features?.length,
    enhancedDataFeatureCount: enhancedData?.features?.length
  });

  try {
    // Check and log region mapping
    const regions = new Set();
    const regionDetails = [];
    
    geoBoundariesData?.features?.forEach(feature => {
      const regionName = feature.properties?.shapeName || 
                        feature.properties?.ADM1_EN ||
                        'Unknown Region';
      regions.add(regionName);
      
      regionDetails.push({
        name: regionName,
        properties: {
          shapeName: feature.properties?.shapeName,
          ADM1_EN: feature.properties?.ADM1_EN,
          region_id: feature.properties?.region_id,
          admin1: feature.properties?.admin1
        },
        hasGeometry: !!feature.geometry,
        geometryType: feature.geometry?.type
      });
    });

    console.log('Region Mapping Details:', {
      totalRegions: regions.size,
      details: regionDetails
    });

    // Analyze commodity data
    const commodityData = enhancedData?.features?.filter(
      f => f.properties?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    );

    const priceAnalysis = commodityData?.reduce((acc, feature) => {
      const price = feature.properties?.usdprice;
      if (typeof price === 'number' && !isNaN(price)) {
        acc.prices.push(price);
        acc.min = Math.min(acc.min, price);
        acc.max = Math.max(acc.max, price);
        acc.sum += price;
        acc.count++;
      }
      return acc;
    }, { prices: [], min: Infinity, max: -Infinity, sum: 0, count: 0 });

    console.log('Commodity Data Analysis:', {
      commodity: selectedCommodity,
      totalFeatures: commodityData?.length,
      priceStatistics: priceAnalysis.count > 0 ? {
        uniquePrices: new Set(priceAnalysis.prices).size,
        min: priceAnalysis.min,
        max: priceAnalysis.max,
        average: priceAnalysis.sum / priceAnalysis.count
      } : null,
      sampleFeature: commodityData?.[0]?.properties
    });

    // Analyze temporal coverage
    const dates = commodityData
      ?.map(f => f.properties?.date)
      .filter(date => date && !isNaN(new Date(date).getTime()))
      .map(date => new Date(date));

    const temporalAnalysis = dates?.length ? {
      earliest: new Date(Math.min(...dates)),
      latest: new Date(Math.max(...dates)),
      totalDates: new Set(dates.map(d => d.toISOString().split('T')[0])).size
    } : null;

    console.log('Temporal Coverage:', temporalAnalysis);

    return {
      regionsFound: Array.from(regions),
      commodityAnalysis: {
        features: commodityData?.length,
        priceRange: priceAnalysis.count > 0 ? [priceAnalysis.min, priceAnalysis.max] : null,
        temporalCoverage: temporalAnalysis
      }
    };

  } catch (error) {
    console.error('Error in spatial data debug:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
};

export const trackCommodityData = (selectedCommodity, data) => {
  if (!selectedCommodity || !data?.features) {
    console.warn('Invalid input for commodity tracking');
    return null;
  }

  console.group(`Commodity Data Tracking: ${selectedCommodity}`);
  
  try {
    const relevantFeatures = data.features.filter(
      f => f.properties?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    );

    const priceStats = relevantFeatures.reduce((acc, feature) => {
      const price = feature.properties?.usdprice;
      if (typeof price === 'number' && !isNaN(price)) {
        acc.prices.add(price);
        acc.min = Math.min(acc.min, price);
        acc.max = Math.max(acc.max, price);
      }
      return acc;
    }, { prices: new Set(), min: Infinity, max: -Infinity });

    const dates = relevantFeatures
      .map(f => f.properties?.date)
      .filter(date => date && !isNaN(new Date(date).getTime()))
      .map(d => new Date(d));

    console.log('Tracking Results:', {
      totalFeatures: data.features.length,
      matchingFeatures: relevantFeatures.length,
      priceStatistics: priceStats.prices.size > 0 ? {
        uniquePrices: priceStats.prices.size,
        range: [priceStats.min, priceStats.max]
      } : null,
      dateRange: dates.length ? {
        min: new Date(Math.min(...dates)),
        max: new Date(Math.max(...dates))
      } : null
    });

    return relevantFeatures;
  } finally {
    console.groupEnd();
  }
};

export const validateFeatureData = (feature, selectedCommodity) => {
  if (!feature) {
    console.warn('No feature provided for validation');
    return null;
  }

  console.group(`Feature Validation: ${feature?.properties?.region_id || 'Unknown'}`);
  
  try {
    const validation = {
      structure: {
        hasProperties: !!feature.properties,
        hasGeometry: !!feature.geometry,
        geometryType: feature.geometry?.type
      },
      properties: {
        commodity: {
          exists: 'commodity' in feature.properties,
          value: feature.properties?.commodity,
          matches: feature.properties?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
        },
        price: {
          exists: 'usdprice' in feature.properties,
          value: feature.properties?.usdprice,
          isValid: typeof feature.properties?.usdprice === 'number' && !isNaN(feature.properties?.usdprice)
        },
        date: {
          exists: 'date' in feature.properties,
          value: feature.properties?.date,
          isValid: !!(feature.properties?.date && !isNaN(new Date(feature.properties.date).getTime()))
        },
        region: {
          id: feature.properties?.region_id,
          name: feature.properties?.shapeName || feature.properties?.ADM1_EN
        }
      }
    };

    console.log('Validation Results:', validation);
    
    return validation;
  } finally {
    console.groupEnd();
  }
};


export default {
  normalizeRegionName,
  getRegionId,
  processFeatureProperties,
  validateFeatureData,
  mergeGeoData,
  extractUniqueMonths
};