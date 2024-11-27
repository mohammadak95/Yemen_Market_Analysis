/**
 * Robust GeoJSON Preprocessor
 * Ensures consistent region identification and property mapping
 */
import { backgroundMonitor } from './backgroundMonitor';

// Yemen's approximate bounding box
const YEMEN_BOUNDS = {
  minLat: 12.0,
  maxLat: 19.0,
  minLon: 41.0,
  maxLon: 54.0
};

/**
 * Validate and normalize coordinates for Yemen's geographic region
 */
const validateAndNormalizeCoordinates = (coordinates, type) => {
  if (!Array.isArray(coordinates)) return null;

  const isInYemenBounds = (coord) => {
    const [lon, lat] = coord;
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      lat >= YEMEN_BOUNDS.minLat &&
      lat <= YEMEN_BOUNDS.maxLat &&
      lon >= YEMEN_BOUNDS.minLon &&
      lon <= YEMEN_BOUNDS.maxLon
    );
  };

  switch (type) {
    case 'Point':
      if (coordinates.length === 2) {
        const [x, y] = coordinates;
        if (!isInYemenBounds([x, y]) && isInYemenBounds([y, x])) {
          return [y, x]; // Swap coordinates if valid
        }
        if (isInYemenBounds([x, y])) {
          return [x, y];
        }
      }
      return null;

    case 'Polygon':
      if (!Array.isArray(coordinates[0])) return null;

      const normalizedPolygon = coordinates.map(ring => {
        if (!Array.isArray(ring)) return null;
        const normalizedRing = ring.map(coord => {
          if (!Array.isArray(coord) || coord.length !== 2) return null;
          const [x, y] = coord;
          if (isInYemenBounds([x, y])) return [x, y];
          if (isInYemenBounds([y, x])) return [y, x];
          return null;
        });
        return normalizedRing.every(c => c !== null) ? normalizedRing : null;
      });

      if (normalizedPolygon.every(r => r !== null)) {
        return normalizedPolygon;
      }
      return null;

    default:
      return null;
  }
};

/**
 * Convert unified geometry format to GeoJSON
 */
const convertUnifiedToGeoJSON = (geometry) => {
  if (!geometry) return null;

  try {
    const features = [];

    // Process polygons
    if (Array.isArray(geometry.polygons)) {
      geometry.polygons.forEach(polygon => {
        if (polygon.geometry?.coordinates) {
          const normalizedCoords = validateAndNormalizeCoordinates(
            polygon.geometry.coordinates,
            'Polygon'
          );
          if (normalizedCoords) {
            features.push({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: normalizedCoords
              },
              properties: {
                ...polygon.properties,
                region_id: polygon.properties?.normalizedName,
                feature_type: 'polygon'
              }
            });
          }
        }
      });
    }

    // Process points
    if (Array.isArray(geometry.points)) {
      geometry.points.forEach(point => {
        const normalizedCoords = validateAndNormalizeCoordinates(
          point.coordinates,
          'Point'
        );
        if (normalizedCoords) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: normalizedCoords
            },
            properties: {
              ...point.properties,
              region_id: point.properties?.normalizedName,
              feature_type: 'point'
            }
          });
        }
      });
    }

    if (features.length === 0) {
      throw new Error('No valid features after coordinate normalization');
    }

    return {
      type: 'FeatureCollection',
      features,
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
        }
      }
    };
  } catch (error) {
    backgroundMonitor.logError('unified-geojson-conversion', {
      message: error.message,
      stack: error.stack,
      geometry
    });
    return null;
  }
};

/**
 * Preprocess GeoJSON data
 */
export const preprocessGeoJSON = (geoJSON, visualizationMode = null) => {
  const processingMetric = backgroundMonitor.startMetric('geojson-preprocessing', {
    mode: visualizationMode,
    hasFeatures: !!geoJSON?.features || !!(geoJSON?.points || geoJSON?.polygons)
  });

  try {
    // Handle unified geometry format
    if (!geoJSON?.features && (geoJSON?.points || geoJSON?.polygons)) {
      geoJSON = convertUnifiedToGeoJSON(geoJSON);
      if (!geoJSON) {
        throw new Error('Failed to convert unified format');
      }
    }

    if (!geoJSON?.features?.length) {
      throw new Error('Invalid GeoJSON structure');
    }

    backgroundMonitor.logMetric('geojson-features', {
      featureCount: geoJSON.features.length,
      type: geoJSON.type,
      mode: visualizationMode
    });

    const validFeatures = geoJSON.features.filter(feature => {
      if (!feature?.geometry?.type) return false;
      const normalizedCoords = validateAndNormalizeCoordinates(
        feature.geometry.coordinates,
        feature.geometry.type
      );
      if (normalizedCoords) {
        feature.geometry.coordinates = normalizedCoords;
        return true;
      }
      return false;
    });

    if (validFeatures.length === 0) {
      throw new Error('No valid features after filtering');
    }

    const processed = {
      ...geoJSON,
      features: validFeatures.map(feature => {
        // Ensure properties object exists
        feature.properties = feature.properties || {};

        // Normalize region identification
        const regionId =
          feature.properties.region_id ||
          feature.properties.normalizedName ||
          feature.properties.name ||
          feature.id;

        // Extract visualization value
        const value = visualizationMode === 'shocks'
          ? feature.properties.shock_magnitude || feature.properties.magnitude || 0
          : feature.properties[`${visualizationMode}_value`] || null;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            region_id: regionId,
            normalizedName: regionId,
            originalName: feature.properties.originalName || feature.properties.name,
            value
          }
        };
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
    return null;
  }
};

/**
 * Validate GeoJSON structure
 */
export const validateGeoJSON = (geoJSON) => {
  const validationMetric = backgroundMonitor.startMetric('geojson-validation');

  try {
    // Ensure features exist
    if (!geoJSON?.features?.length) {
      throw new Error('Missing GeoJSON or features array');
    }

    const isValid = geoJSON.features.every(feature => {
      if (!feature?.geometry?.type || !feature.geometry.coordinates) {
        return false;
      }

      const normalizedCoords = validateAndNormalizeCoordinates(
        feature.geometry.coordinates,
        feature.geometry.type
      );

      return normalizedCoords !== null;
    });

    validationMetric.finish({
      status: isValid ? 'success' : 'failed',
      featureCount: geoJSON.features.length
    });

    return isValid;
  } catch (error) {
    backgroundMonitor.logError('geojson-validation', {
      message: error.message,
      geoJSON
    });
    validationMetric.finish({ status: 'failed', reason: error.message });
    return false;
  }
};

/**
 * Error-safe GeoJSON processing
 */
export const safeGeoJSONProcessor = (geoJSON, visualizationMode) => {
  const processingMetric = backgroundMonitor.startMetric('safe-geojson-processing', {
    mode: visualizationMode,
    hasInput: !!geoJSON
  });

  try {
    // Handle unified format
    if (!geoJSON?.features && (geoJSON?.points || geoJSON?.polygons)) {
      const unified = convertUnifiedToGeoJSON(geoJSON);
      if (!unified) {
        throw new Error('Failed to convert unified format');
      }
      geoJSON = unified;
    }

    // Process GeoJSON
    const processedGeoJSON = preprocessGeoJSON(geoJSON, visualizationMode);
    if (!processedGeoJSON) {
      throw new Error('Failed to process GeoJSON');
    }

    // Validate result
    if (!validateGeoJSON(processedGeoJSON)) {
      backgroundMonitor.logError('geojson-validation-failed', {
        processedGeoJSON
      });
      processingMetric.finish({ status: 'failed', error: 'Validation failed' });
      return null;
    }

    processingMetric.finish({
      status: 'success',
      inputFeatures: geoJSON?.features?.length || 0,
      outputFeatures: processedGeoJSON.features.length
    });

    return processedGeoJSON;

  } catch (error) {
    backgroundMonitor.logError('safe-geojson-processing', {
      message: error.message,
      stack: error.stack,
      input: geoJSON
    });
    processingMetric.finish({ status: 'failed', error: error.message });
    return null;
  }
};
