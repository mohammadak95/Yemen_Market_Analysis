/**
 * Robust GeoJSON Preprocessor
 * Ensures consistent region identification and property mapping
 */
import { backgroundMonitor } from './backgroundMonitor';

export const preprocessGeoJSON = (geoJSON, visualizationMode = null) => {
  const processingMetric = backgroundMonitor.startMetric('geojson-preprocessing', {
    mode: visualizationMode,
    hasFeatures: !!geoJSON?.features
  });

  if (!geoJSON || !geoJSON.features) {
    backgroundMonitor.logError('geojson-preprocessing', {
      message: 'Invalid GeoJSON structure',
      geoJSON
    });
    processingMetric.finish({ status: 'failed', reason: 'invalid-structure' });
    return geoJSON;
  }

  try {
    backgroundMonitor.logMetric('geojson-features', {
      featureCount: geoJSON.features.length,
      type: geoJSON.type,
      mode: visualizationMode
    });

    const processed = {
      ...geoJSON,
      features: geoJSON.features.map(feature => {
        if (!feature.type || !feature.geometry || !feature.properties) {
          backgroundMonitor.logError('geojson-feature-processing', {
            message: 'Invalid feature structure',
            feature
          });
          return feature;
        }

        // Fallback region identification strategy
        const regionId = 
          feature.properties.region_id || 
          feature.properties.normalizedName || 
          feature.properties.name || 
          feature.id;

        // Dynamic value extraction based on visualization mode
        const extractValue = () => {
          switch (visualizationMode) {
            case 'network':
              // Special handling for network visualization
              if (feature.geometry.type === 'Point') {
                const coordinates = feature.geometry.coordinates;
                if (!Array.isArray(coordinates) || coordinates.length !== 2 || 
                    coordinates.some(coord => !Number.isFinite(coord))) {
                  backgroundMonitor.logError('geojson-network-point', {
                    message: 'Invalid point coordinates',
                    coordinates
                  });
                  return null;
                }
                return {
                  coordinates,
                  name: feature.properties.originalName || feature.properties.name,
                  population: feature.properties.population || 0
                };
              }
              return null;
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

        // Process coordinates for network points
        const processedCoordinates = 
          visualizationMode === 'network' && 
          feature.geometry.type === 'Point' &&
          Array.isArray(feature.geometry.coordinates) &&
          feature.geometry.coordinates.length === 2 &&
          feature.geometry.coordinates.every(coord => Number.isFinite(coord))
            ? feature.geometry.coordinates
            : feature.geometry.coordinates;

        const processedFeature = {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: processedCoordinates
          },
          properties: {
            ...feature.properties,
            region_id: regionId,
            normalizedName: regionId,
            originalName: feature.properties.originalName || feature.properties.name,
            [`${visualizationMode}_value`]: extractValue()
          }
        };

        backgroundMonitor.logMetric('geojson-feature-processing', {
          featureType: feature.geometry.type,
          hasCoordinates: !!processedCoordinates,
          hasValue: !!processedFeature.properties[`${visualizationMode}_value`]
        });

        return processedFeature;
      }).filter(feature => {
        // Additional validation for network mode
        if (visualizationMode === 'network' && feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          const isValid = Array.isArray(coords) && 
            coords.length === 2 && 
            coords.every(coord => Number.isFinite(coord));
          
          if (!isValid) {
            backgroundMonitor.logError('geojson-network-validation', {
              message: 'Invalid network point',
              coordinates: coords
            });
          }
          return isValid;
        }
        return true;
      })
    };

    processingMetric.finish({
      status: 'success',
      inputFeatures: geoJSON.features.length,
      outputFeatures: processed.features.length
    });

    return processed;
  } catch (error) {
    backgroundMonitor.logError('geojson-preprocessing', {
      message: error.message,
      stack: error.stack
    });
    processingMetric.finish({ status: 'failed', error: error.message });
    return geoJSON;
  }
};

/**
 * Validate GeoJSON structure
 * @param {Object} geoJSON - GeoJSON to validate
 * @returns {boolean} Validity of GeoJSON
 */
export const validateGeoJSON = (geoJSON) => {
  const validationMetric = backgroundMonitor.startMetric('geojson-validation');

  if (!geoJSON || !geoJSON.features) {
    backgroundMonitor.logError('geojson-validation', {
      message: 'Missing GeoJSON or features array'
    });
    validationMetric.finish({ status: 'failed', reason: 'missing-data' });
    return false;
  }
  
  const isValid = geoJSON.features.every(feature => {
    const valid = feature.type === 'Feature' && 
      feature.geometry && 
      feature.properties;

    if (!valid) {
      backgroundMonitor.logError('geojson-validation', {
        message: 'Invalid feature',
        feature
      });
    }
    return valid;
  });

  validationMetric.finish({
    status: isValid ? 'success' : 'failed',
    featureCount: geoJSON.features.length
  });

  return isValid;
};

/**
 * Validate network-specific GeoJSON
 * @param {Object} geoJSON - GeoJSON to validate
 * @returns {boolean} Validity for network visualization
 */
export const validateNetworkGeoJSON = (geoJSON) => {
  const validationMetric = backgroundMonitor.startMetric('network-geojson-validation');

  if (!validateGeoJSON(geoJSON)) {
    validationMetric.finish({ status: 'failed', reason: 'invalid-geojson' });
    return false;
  }

  const pointFeatures = geoJSON.features.filter(
    feature => feature.geometry.type === 'Point'
  );

  const isValid = pointFeatures.every(feature => {
    const coords = feature.geometry.coordinates;
    const hasValidCoords = Array.isArray(coords) && 
      coords.length === 2 && 
      coords.every(coord => Number.isFinite(coord));
    
    const hasValidProperties = feature.properties && 
      (feature.properties.originalName || feature.properties.name);

    if (!hasValidCoords || !hasValidProperties) {
      backgroundMonitor.logError('network-geojson-validation', {
        message: 'Invalid network feature',
        hasValidCoords,
        hasValidProperties,
        feature
      });
    }

    return hasValidCoords && hasValidProperties;
  });

  validationMetric.finish({
    status: isValid ? 'success' : 'failed',
    pointFeatureCount: pointFeatures.length
  });

  return isValid;
};

/**
 * Error-safe GeoJSON processing
 * @param {Object} geoJSON - Original GeoJSON
 * @param {string} visualizationMode - Current visualization mode
 * @returns {Object} Processed GeoJSON or original if processing fails
 */
export const safeGeoJSONProcessor = (geoJSON, visualizationMode) => {
  const processingMetric = backgroundMonitor.startMetric('safe-geojson-processing', {
    mode: visualizationMode,
    hasInput: !!geoJSON
  });

  try {
    const processedGeoJSON = preprocessGeoJSON(geoJSON, visualizationMode);
    
    // Use network-specific validation for network mode
    const isValid = visualizationMode === 'network'
      ? validateNetworkGeoJSON(processedGeoJSON)
      : validateGeoJSON(processedGeoJSON);

    processingMetric.finish({
      status: isValid ? 'success' : 'failed',
      inputFeatures: geoJSON?.features?.length,
      outputFeatures: processedGeoJSON?.features?.length
    });

    return isValid ? processedGeoJSON : geoJSON;
  } catch (error) {
    backgroundMonitor.logError('safe-geojson-processing', {
      message: error.message,
      stack: error.stack
    });
    processingMetric.finish({ status: 'failed', error: error.message });
    return geoJSON;
  }
};
