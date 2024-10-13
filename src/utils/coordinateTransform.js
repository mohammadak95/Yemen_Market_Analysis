// src/utils/coordinateTransform.js

import proj4 from 'proj4';

/**
 * Transforms coordinates from a source projection to WGS84.
 * @param {number} lng - Longitude in source projection.
 * @param {number} lat - Latitude in source projection.
 * @param {string} sourceEPSG - Source EPSG code (e.g., 'EPSG:3857').
 * @returns {[number, number]} - [latitude, longitude] in WGS84.
 */
export const transformToWGS84 = (lng, lat, sourceEPSG = 'EPSG:3857') => {
  // Define source and destination projections
  // 'EPSG:4326' is WGS84
  return proj4(sourceEPSG, 'EPSG:4326', [lng, lat]);
};