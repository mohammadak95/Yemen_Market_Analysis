/**
 * Utility functions for processing and validating GeoJSON data
 */

import { transformRegionName } from './spatialUtils';

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
  );
};

/**
 * Normalize longitude to be within -180 to 180 range
 * @param {number} lon - Longitude value
 * @returns {number} Normalized longitude
 */
const normalizeLongitude = (lon) => {
  // Handle invalid input
  if (typeof lon !== 'number' || isNaN(lon)) return null;
  
  // Normalize to -180 to 180 range
  lon = lon % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  
  return lon;
};

/**
 * Process and validate GeoJSON data
 * @param {Object} geometry - Raw GeoJSON data
 * @param {string} context - Processing context (e.g., 'clusters', 'flows')
 * @returns {Object|null} Processed GeoJSON or null if invalid
 */
export const safeGeoJSONProcessor = (geometry, context = 'general') => {
  try {
    if (!geometry || typeof geometry !== 'object') {
      console.error('Invalid GeoJSON data provided');
      return null;
    }

    // Create a deep copy of the geometry
    const geometryCopy = deepClone(geometry);

    // Validate GeoJSON structure
    if (!geometryCopy.type || !geometryCopy.features) {
      console.error('Invalid GeoJSON structure');
      return null;
    }

    // Process features based on context
    const processedFeatures = geometryCopy.features.map(feature => {
      // Create a new feature object
      const newFeature = {
        type: 'Feature',
        properties: { ...feature.properties } || {},
        geometry: { ...feature.geometry }
      };

      // Ensure geometry type is capitalized
      if (newFeature.geometry?.type) {
        newFeature.geometry.type = 
          newFeature.geometry.type.charAt(0).toUpperCase() + 
          newFeature.geometry.type.slice(1);
      }

      // Normalize region names
      if (newFeature.properties.name) {
        newFeature.properties.normalizedName = transformRegionName(newFeature.properties.name);
        newFeature.properties.originalName = newFeature.properties.name;
      }

      // Validate and normalize coordinates
      if (newFeature.geometry?.coordinates) {
        newFeature.geometry.coordinates = normalizeCoordinates(
          newFeature.geometry.coordinates,
          newFeature.geometry.type
        );
      }

      // Add context-specific processing
      switch (context) {
        case 'clusters':
          return processClusterFeature(newFeature);
        case 'flows':
          return processFlowFeature(newFeature);
        case 'shocks':
          return processShockFeature(newFeature);
        case 'autocorrelation':
          return processAutocorrelationFeature(newFeature);
        default:
          return newFeature;
      }
    }).filter(Boolean);

    return {
      type: 'FeatureCollection',
      features: processedFeatures,
      crs: geometryCopy.crs || {
        type: 'name',
        properties: {
          name: 'EPSG:4326'
        }
      }
    };
  } catch (error) {
    console.error('Error processing GeoJSON:', error);
    return null;
  }
};

/**
 * Normalize coordinates based on geometry type
 * @param {Array} coordinates - Raw coordinates
 * @param {string} type - Geometry type
 * @returns {Array} Normalized coordinates
 */
const normalizeCoordinates = (coordinates, type) => {
  if (!Array.isArray(coordinates)) return coordinates;

  const validateCoordPair = ([lon, lat]) => {
    if (typeof lon !== 'number' || typeof lat !== 'number' ||
        isNaN(lon) || isNaN(lat) ||
        Math.abs(lat) > 90) {
      return null;
    }

    // Normalize longitude to -180 to 180 range
    const normalizedLon = normalizeLongitude(lon);
    if (normalizedLon === null) return null;

    return [normalizedLon, lat];
  };

  switch (type) {
    case 'Point':
      return validateCoordPair(coordinates);
    case 'LineString':
      return coordinates.map(validateCoordPair).filter(Boolean);
    case 'Polygon':
      return coordinates.map(ring => 
        ring.map(validateCoordPair).filter(Boolean)
      );
    case 'MultiPolygon':
      return coordinates.map(polygon =>
        polygon.map(ring => 
          ring.map(validateCoordPair).filter(Boolean)
        )
      );
    default:
      return coordinates;
  }
};

/**
 * Process feature for cluster visualization
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Processed feature
 */
const processClusterFeature = (feature) => {
  try {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        cluster_id: feature.properties.cluster_id || null,
        efficiency: feature.properties.efficiency || 0,
        market_count: feature.properties.market_count || 0
      }
    };
  } catch (error) {
    console.error('Error processing cluster feature:', error);
    return feature;
  }
};

/**
 * Process feature for flow visualization
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Processed feature
 */
const processFlowFeature = (feature) => {
  try {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        flow_volume: feature.properties.flow_volume || 0,
        flow_direction: feature.properties.flow_direction || 'bidirectional',
        price_differential: feature.properties.price_differential || 0
      }
    };
  } catch (error) {
    console.error('Error processing flow feature:', error);
    return feature;
  }
};

/**
 * Process feature for shock visualization
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Processed feature
 */
const processShockFeature = (feature) => {
  try {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        shock_magnitude: feature.properties.shock_magnitude || 0,
        shock_type: feature.properties.shock_type || 'unknown',
        affected_markets: feature.properties.affected_markets || []
      }
    };
  } catch (error) {
    console.error('Error processing shock feature:', error);
    return feature;
  }
};

/**
 * Process feature for spatial autocorrelation
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Processed feature
 */
const processAutocorrelationFeature = (feature) => {
  try {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        local_i: feature.properties.local_i || 0,
        p_value: feature.properties.p_value || 1,
        cluster_type: feature.properties.cluster_type || 'not-significant',
        z_score: feature.properties.z_score || 0
      }
    };
  } catch (error) {
    console.error('Error processing autocorrelation feature:', error);
    return feature;
  }
};

/**
 * Extract point features from GeoJSON
 * @param {Object} geojson - GeoJSON object
 * @returns {Array} Array of point features
 */
export const extractPointFeatures = (geojson) => {
  if (!geojson?.features) return [];

  return geojson.features.filter(feature => 
    feature.geometry?.type === 'Point'
  ).map(feature => deepClone(feature));
};

/**
 * Extract polygon features from GeoJSON
 * @param {Object} geojson - GeoJSON object
 * @returns {Array} Array of polygon features
 */
export const extractPolygonFeatures = (geojson) => {
  if (!geojson?.features) return [];

  return geojson.features.filter(feature => 
    feature.geometry?.type === 'Polygon' || 
    feature.geometry?.type === 'MultiPolygon'
  ).map(feature => deepClone(feature));
};

/**
 * Create unified GeoJSON from points and polygons
 * @param {Array} points - Point features
 * @param {Array} polygons - Polygon features
 * @returns {Object} Unified GeoJSON
 */
export const createUnifiedGeoJSON = (points = [], polygons = []) => {
  return {
    type: 'FeatureCollection',
    features: [...points.map(deepClone), ...polygons.map(deepClone)],
    crs: {
      type: 'name',
      properties: {
        name: 'EPSG:4326'
      }
    }
  };
};

export default {
  safeGeoJSONProcessor,
  extractPointFeatures,
  extractPolygonFeatures,
  createUnifiedGeoJSON
};
