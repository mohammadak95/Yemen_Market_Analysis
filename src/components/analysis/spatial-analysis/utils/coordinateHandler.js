// src/components/analysis/spatial-analysis/utils/coordinateHandler.js

const YEMEN_BOUNDS = {
  minLon: 41.0,
  maxLon: 54.0,
  minLat: 12.0,
  maxLat: 19.0
};

// Accurate coordinates for major Yemen cities/governorates
const YEMEN_REFERENCE_COORDINATES = {
  'sana\'a': [44.2067, 15.3694],
  'aden': [45.0357, 12.7797],
  'taizz': [44.0075, 13.5769],
  'al hudaydah': [42.9552, 14.7979],
  'ibb': [44.1821, 13.9673],
  'dhamar': [44.4018, 14.5430],
  'hadramaut': [48.7867, 15.9320],
  'al jawf': [45.5837, 16.7875],
  'marib': [45.3223, 15.4542],
  'shabwah': [47.0124, 14.7616],
  'abyan': [46.3262, 13.6339],
  'lahj': [44.8838, 13.0382],
  'al bayda': [45.5723, 14.3516],
  'al dhale\'e': [44.7313, 13.7247],
  'hajjah': [43.6027, 15.6943],
  'amran': [43.9436, 16.0174],
  'al mahwit': [43.5446, 15.4700],
  'raymah': [43.7117, 14.6779],
  'amanat al asimah': [44.2067, 15.3694],
  'socotra': [53.8776, 12.4634]
};

const debug = (message, data = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`📍 CoordinateHandler: ${message}`);
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
    console.groupEnd();
  }
};

const coordinateCache = new Map();

/**
 * Normalize coordinates and ensure they are in the correct range for Yemen
 * @param {Object} data - Geometry data containing coordinates
 * @param {string} regionId - Region identifier
 * @returns {Array|null} - Normalized coordinates [lon, lat]
 */
export const normalizeCoordinates = (data, regionId) => {
  if (!regionId) {
    debug('Missing Region ID', { data });
    return null;
  }

  const normalizedId = regionId.toLowerCase();

  // Check cache first
  if (coordinateCache.has(normalizedId)) {
    return coordinateCache.get(normalizedId);
  }

  // First try reference coordinates as they are most accurate
  if (YEMEN_REFERENCE_COORDINATES[normalizedId]) {
    const referenceCoords = YEMEN_REFERENCE_COORDINATES[normalizedId];
    coordinateCache.set(normalizedId, referenceCoords);
    return referenceCoords;
  }

  let coordinates = null;

  // Extract coordinates from data
  if (data) {
    if (data.geometry?.coordinates) {
      if (data.geometry.type === 'Point') {
        coordinates = transformPointCoordinates(data.geometry.coordinates);
      } else if (data.geometry.type === 'Polygon' || data.geometry.type === 'MultiPolygon') {
        coordinates = calculatePolygonCentroid(data.geometry.coordinates);
      }
    } else if (Array.isArray(data.coordinates)) {
      coordinates = transformPointCoordinates(data.coordinates);
    }

    debug('Extracted Coordinates', {
      regionId: normalizedId,
      coordinates,
      dataType: data.type,
      geometryType: data.geometry?.type
    });
  }

  // Validate coordinates
  if (coordinates && isWithinYemenBounds(coordinates)) {
    coordinateCache.set(normalizedId, coordinates);
    return coordinates;
  }

  debug('Invalid or missing coordinates', {
    regionId: normalizedId,
    rawCoordinates: coordinates,
    fallback: YEMEN_REFERENCE_COORDINATES[normalizedId]
  });

  return YEMEN_REFERENCE_COORDINATES[normalizedId] || null;
};

/**
 * Transform point coordinates to correct format and range
 * @param {Array} coords - Input coordinates
 * @returns {Array} - Transformed coordinates
 */
const transformPointCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return null;

  let [x, y] = coords;

  // Handle normalized coordinates (0-1 range)
  if (Math.abs(x) <= 1 && Math.abs(y) <= 1) {
    x = YEMEN_BOUNDS.minLon + (x * (YEMEN_BOUNDS.maxLon - YEMEN_BOUNDS.minLon));
    y = YEMEN_BOUNDS.minLat + (y * (YEMEN_BOUNDS.maxLat - YEMEN_BOUNDS.minLat));
  }
  
  // Handle flipped coordinates
  if (x < YEMEN_BOUNDS.minLon && y >= YEMEN_BOUNDS.minLon) {
    [x, y] = [y, x];
  }

  return [x, y];
};

/**
 * Calculate the centroid of a polygon
 * @param {Array} coordinates - Polygon coordinates
 * @returns {Array|null} - Centroid coordinates
 */
const calculatePolygonCentroid = (coordinates) => {
  if (!coordinates || !coordinates.length) return null;

  try {
    // Get the first ring of coordinates for polygons
    let points = coordinates;
    while (Array.isArray(points[0][0])) {
      points = points[0];
    }

    // Use area-weighted centroid calculation
    let area = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const f = (x0 * y1) - (x1 * y0);
      area += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }

    area = area * 3;

    // Handle degenerate cases
    if (Math.abs(area) < 1e-8) {
      // Fall back to arithmetic mean
      const [sumX, sumY] = points.reduce(
        ([sx, sy], [x, y]) => [sx + x, sy + y],
        [0, 0]
      );
      return [sumX / points.length, sumY / points.length];
    }

    const centroid = [cx / area, cy / area];
    
    if (!isWithinYemenBounds(centroid)) {
      debug('Centroid outside bounds', { centroid, pointCount: points.length });
      return null;
    }

    return centroid;
  } catch (error) {
    debug('Centroid calculation error', { error: error.message });
    return null;
  }
};

/**
 * Validate coordinates against Yemen bounds
 * @param {Array} coordinates - Coordinates to validate
 * @returns {boolean} - Whether coordinates are valid
 */
const isWithinYemenBounds = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
  
  const [lon, lat] = coordinates;
  if (typeof lon !== 'number' || typeof lat !== 'number') return false;
  
  return (
    lon >= YEMEN_BOUNDS.minLon &&
    lon <= YEMEN_BOUNDS.maxLon &&
    lat >= YEMEN_BOUNDS.minLat &&
    lat <= YEMEN_BOUNDS.maxLat &&
    !isNaN(lon) &&
    !isNaN(lat)
  );
};

/**
 * Clear the coordinate cache
 */
export const clearCoordinateCache = () => {
  coordinateCache.clear();
  debug('Cache cleared');
};