// src/utils/spatialUtils.js

import _ from 'lodash';

/**
 * Transform region name to normalized format
 * @param {string} name - Region name to transform
 * @returns {string} Normalized region name
 */
export const transformRegionName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
};

/**
 * Get coordinates for a region
 * @param {string} region - Region name
 * @returns {Array} [longitude, latitude]
 */
export const getRegionCoordinates = (region) => {
  const YEMEN_COORDINATES = {
    'abyan': [45.83, 13.58],
    'aden': [45.03, 12.77],
    'al_bayda': [45.57, 14.17],
    'al_dhalee': [44.73, 13.70],
    'al_hudaydah': [42.95, 14.80],
    'al_jawf': [45.50, 16.60],
    'al_maharah': [51.83, 16.52],
    'al_mahwit': [43.55, 15.47],
    'amanat_al_asimah': [44.21, 15.35],
    'amran': [43.94, 15.66],
    'dhamar': [44.24, 14.54],
    'hadramaut': [48.78, 15.93],
    'hajjah': [43.60, 15.63],
    'ibb': [44.18, 13.97],
    'lahj': [44.88, 13.03],
    'marib': [45.32, 15.47],
    'raymah': [43.71, 14.68],
    'sanaa': [44.21, 15.35],
    'shabwah': [47.01, 14.53],
    'taizz': [44.02, 13.58],
    'socotra': [53.87, 12.47]
  };

  const normalizedRegion = transformRegionName(region);
  return YEMEN_COORDINATES[normalizedRegion] || [0, 0];
};

/**
 * Calculate center point from array of coordinates
 * @param {Array} coordinates - Array of [lon, lat] coordinates
 * @returns {Array} Center [longitude, latitude]
 */
export const calculateCenter = (coordinates) => {
  if (!Array.isArray(coordinates) || !coordinates.length) {
    return [0, 0];
  }

  const validCoords = coordinates.filter(coord => 
    Array.isArray(coord) && coord.length === 2 &&
    !isNaN(coord[0]) && !isNaN(coord[1])
  );

  if (!validCoords.length) return [0, 0];

  const sum = validCoords.reduce((acc, coord) => ({
    lon: acc.lon + coord[0],
    lat: acc.lat + coord[1]
  }), { lon: 0, lat: 0 });

  return [
    sum.lon / validCoords.length,
    sum.lat / validCoords.length
  ];
};

/**
 * Validate coordinates
 * @param {Array} coordinates - [longitude, latitude] coordinates
 * @returns {Array|null} Validated coordinates or null
 */
export const validateCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null;
  }

  const [lon, lat] = coordinates.map(Number);

  if (isNaN(lon) || isNaN(lat) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  return [lon, lat];
};

/**
 * Calculate bounding box for array of coordinates
 * @param {Array} coordinates - Array of [lon, lat] coordinates
 * @returns {Object} Bounding box {minLon, maxLon, minLat, maxLat}
 */
export const calculateBoundingBox = (coordinates) => {
  if (!Array.isArray(coordinates) || !coordinates.length) {
    return {
      minLon: 0, maxLon: 0,
      minLat: 0, maxLat: 0
    };
  }

  const validCoords = coordinates
    .map(validateCoordinates)
    .filter(Boolean);

  if (!validCoords.length) {
    return {
      minLon: 0, maxLon: 0,
      minLat: 0, maxLat: 0
    };
  }

  return validCoords.reduce((box, [lon, lat]) => ({
    minLon: Math.min(box.minLon, lon),
    maxLon: Math.max(box.maxLon, lon),
    minLat: Math.min(box.minLat, lat),
    maxLat: Math.max(box.maxLat, lat)
  }), {
    minLon: validCoords[0][0],
    maxLon: validCoords[0][0],
    minLat: validCoords[0][1],
    maxLat: validCoords[0][1]
  });
};

/**
 * Calculate distance between two coordinates
 * @param {Array} coord1 - [lon1, lat1] coordinates
 * @param {Array} coord2 - [lon2, lat2] coordinates
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
  const valid1 = validateCoordinates(coord1);
  const valid2 = validateCoordinates(coord2);

  if (!valid1 || !valid2) return 0;

  const [lon1, lat1] = valid1;
  const [lon2, lat2] = valid2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
           Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRad = (degrees) => degrees * Math.PI / 180;

/**
 * Find neighboring regions based on distance threshold
 * @param {Array} regions - Array of region objects with coordinates
 * @param {number} threshold - Distance threshold in kilometers
 * @returns {Object} Map of region to array of neighboring regions
 */
export const findNeighbors = (regions, threshold = 100) => {
  if (!Array.isArray(regions)) return {};

  const neighbors = {};

  regions.forEach(region => {
    const regionCoords = validateCoordinates(region.coordinates);
    if (!regionCoords) return;

    neighbors[region.id] = regions
      .filter(other => other.id !== region.id)
      .filter(other => {
        const otherCoords = validateCoordinates(other.coordinates);
        if (!otherCoords) return false;

        const distance = calculateDistance(regionCoords, otherCoords);
        return distance <= threshold;
      })
      .map(other => other.id);
  });

  return neighbors;
};

/**
 * Convert UTM coordinates to [longitude, latitude]
 * @param {number} easting - UTM easting coordinate
 * @param {number} northing - UTM northing coordinate
 * @param {number} zone - UTM zone (default: 38 for Yemen)
 * @returns {Array} [longitude, latitude] coordinates
 */
export const convertUTMtoLatLon = (easting, northing, zone = 38) => {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const falseEasting = 500000;

  const x = easting - falseEasting;
  const y = northing;

  const M = y / k0;
  const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64));

  const phi1 = mu + (3 * e1sq / 2 - 27 * Math.pow(e1sq, 3) / 32) * Math.sin(2 * mu);
  const phi2 = phi1 + (21 * Math.pow(e1sq, 2) / 16 - 55 * Math.pow(e1sq, 4) / 32) * Math.sin(4 * mu);
  const phi = phi2 + (151 * Math.pow(e1sq, 3) / 96) * Math.sin(6 * mu);

  const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi) * Math.sin(phi));
  const T1 = Math.tan(phi) * Math.tan(phi);
  const C1 = (e * e * Math.cos(phi) * Math.cos(phi)) / (1 - e * e);
  const R1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.sin(phi) * Math.sin(phi), 1.5);
  const D = x / (N1 * k0);

  const lat = phi - (N1 * Math.tan(phi) / R1) * (
    (D * D) / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e * e) * Math.pow(D, 4) / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e * e - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720
  );

  const lon = ((zone * 6 - 183) + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e * e + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120)
  ) / Math.cos(phi) * (180 / Math.PI);

  return validateCoordinates([lon, lat * 180 / Math.PI]) || [0, 0];
};

// Export all utilities for testing
export const utils = {
  transformRegionName,
  getRegionCoordinates,
  calculateCenter,
  validateCoordinates,
  calculateBoundingBox,
  calculateDistance,
  findNeighbors,
  convertUTMtoLatLon,
  toRad
};
