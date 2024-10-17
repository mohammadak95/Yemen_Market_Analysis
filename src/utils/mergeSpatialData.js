// src/utils/mergeSpatialData.js

// Utility function to normalize region names
// Enhanced normalization to handle more variations
const normalizeRegionName = (name) => {
    if (typeof name !== 'string') {
      return '';
    }
    return name
      .trim()
      .toLowerCase()
      .replace(/governorate|governorates?/g, '') // remove variations of 'governorate'
      .replace(/['’`´]/g, '') // remove apostrophes
      .replace(/[\s-]+/g, ' ') // normalize spaces and dashes
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // remove diacritics
  };
  
  // Function to merge spatial data with mapping and exclusion logic
  export const mergeSpatialDataWithMapping = (geoBoundariesData, enhancedData, regionMapping, excludedRegions) => {
    // Normalize and map the region names in the geoBoundaries data
    const geoBoundariesMap = new Map(
      geoBoundariesData.features.map((feature) => {
        const normalizedName = normalizeRegionName(feature.properties.shapeName);
        return [normalizedName, feature];
      })
    );
  
    // Create a merged dataset based on matching region names and the mapping
    const mergedFeatures = [];
    const unmatchedRegions = new Set();
  
    enhancedData.features.forEach((feature) => {
      const originalRegionId = normalizeRegionName(feature.properties.region_id);
      
      // Apply the mapping if the region name exists in the mapping table
      const mappedRegionId = regionMapping[originalRegionId] || originalRegionId;
  
      // Exclude regions that are listed in the excludedRegions
      if (excludedRegions.includes(mappedRegionId)) {
        return;
      }
  
      // Check if the mapped region is in the geoBoundaries map
      const geoFeature = geoBoundariesMap.get(mappedRegionId);
      if (geoFeature) {
        // Merge properties from the geoBoundaries feature
        const mergedFeature = {
          type: 'Feature',
          properties: { ...geoFeature.properties, ...feature.properties },
          geometry: geoFeature.geometry,
        };
        mergedFeatures.push(mergedFeature);
      } else {
        unmatchedRegions.add(originalRegionId);
      }
    });
  
    // Create a new FeatureCollection for the merged data
    const mergedData = {
      type: 'FeatureCollection',
      features: mergedFeatures,
    };
  
    console.warn('Unmatched regions:', Array.from(unmatchedRegions));
    
    return mergedData;
  };