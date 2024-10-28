// src/utils/spatialDebugUtils.js

import { processData } from './utils';

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
  debugSpatialData,
  trackCommodityData,
  validateFeatureData
};