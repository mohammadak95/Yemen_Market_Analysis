/**
 * Robust GeoJSON Preprocessor
 * Ensures consistent region identification and property mapping
 */
export const preprocessGeoJSON = (geoJSON, visualizationMode = null) => {
  if (!geoJSON || !geoJSON.features) return geoJSON;

  return {
    ...geoJSON,
    features: geoJSON.features.map(feature => {
      // Fallback region identification strategy
      const regionId = 
        feature.properties.region_id || 
        feature.properties.normalizedName || 
        feature.properties.name || 
        feature.id;

      // Dynamic value extraction based on visualization mode
      const extractValue = () => {
        switch (visualizationMode) {
          case 'prices': 
            return feature.properties.avgUsdPrice ?? 
                   feature.properties.price ?? 
                   null;
          case 'integration': 
            return feature.properties.integrationScore ?? 
                   feature.properties.market_integration ?? 
                   null;
          case 'conflicts': 
            return feature.properties.conflictIntensity ?? 
                   feature.properties.conflict_intensity ?? 
                   null;
          default: 
            return null;
        }
      };

      return {
        ...feature,
        properties: {
          ...feature.properties,
          region_id: regionId,
          normalizedName: regionId,
          [`${visualizationMode}_value`]: extractValue()
        }
      };
    })
  };
};

/**
 * Validate GeoJSON structure
 * @param {Object} geoJSON - GeoJSON to validate
 * @returns {boolean} Validity of GeoJSON
 */
export const validateGeoJSON = (geoJSON) => {
  if (!geoJSON || !geoJSON.features) return false;
  
  return geoJSON.features.every(feature => 
    feature.type === 'Feature' && 
    feature.geometry && 
    feature.properties
  );
};

/**
 * Error-safe GeoJSON processing
 * @param {Object} geoJSON - Original GeoJSON
 * @param {string} visualizationMode - Current visualization mode
 * @returns {Object} Processed GeoJSON or original if processing fails
 */
export const safeGeoJSONProcessor = (geoJSON, visualizationMode) => {
  try {
    const processedGeoJSON = preprocessGeoJSON(geoJSON, visualizationMode);
    return validateGeoJSON(processedGeoJSON) ? processedGeoJSON : geoJSON;
  } catch (error) {
    console.error('GeoJSON Processing Error:', error);
    return geoJSON;
  }
};
