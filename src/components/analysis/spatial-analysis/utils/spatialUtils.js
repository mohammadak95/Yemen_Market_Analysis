// src/components/analysis/spatial-analysis/utils/spatialUtils.js

import { spatialHandler } from '../../../../utils/spatialDataHandler';

/**
 * Transform and normalize region names to ensure consistency across the application.
 * Handles special cases, variations in spelling, and different formats of region names.
 * 
 * @param {string} name - The original region name to transform
 * @returns {string} - The normalized region name
 */
export const transformRegionName = (name) => {
  if (!name) return '';

  // Special cases mapping for Yemen regions
  const specialCases = {
    // Aden variations
    "'adan governorate": "aden",
    "'adan": "aden",
    "ʿadan": "aden",
    // Al Dhalee variations
    "ad dali' governorate": "al dhalee",
    "ad dali'": "al dhalee",
    "ad dali": "al dhalee",
    "al dhale": "al dhalee",
    "al dhale'": "al dhalee",
    // Saada variations
    "sa'dah governorate": "saada",
    "sa'dah": "saada",
    "sadah": "saada",
    "sa'ada": "saada",
    // Mahrah variations
    "al mahrah governorate": "mahrah",
    "al mahrah": "mahrah",
    "al mahra": "mahrah",
    "mahrah governorate": "mahrah",
    // Marib variations
    "ma'rib governorate": "marib",
    "ma'rib": "marib",
    "mareb": "marib",
    // Socotra variations
    "socotra governorate": "socotra",
    "soqatra": "socotra",
    // Sanaa variations
    "sanʿaʾ governorate": "sanaa",
    "san'a'": "sanaa",
    "sana'a": "sanaa",
    "sanaa governorate": "sanaa",
    // Taiz variations
    "ta'izz": "taizz",
    "ta'izz governorate": "taizz",
    "taiz": "taizz",
    // Amran variations
    "'amran": "amran",
    "'amran governorate": "amran",
    "ʿamran": "amran"
  };

  // Clean up the name
  const cleaned = name.toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/governorate$/i, '')
    .replace(/ʿ/g, "'")  // Normalize special quotes
    .replace(/['']/g, "'") // Normalize quotes
    .trim();

  // Check special cases first
  if (specialCases[cleaned]) {
    return specialCases[cleaned];
  }

  // Check with 'governorate' suffix
  const withGovernorate = `${cleaned} governorate`;
  if (specialCases[withGovernorate]) {
    return specialCases[withGovernorate];
  }

  // Use spatialHandler's normalization as fallback
  const normalized = spatialHandler.normalizeRegionName(name);
  
  if (!normalized) return cleaned;

  // Post-process the normalized name
  return normalized
    .replace(/^'/, '')  // Remove leading apostrophe
    .replace(/'$/, '')  // Remove trailing apostrophe
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/^al-/, 'al ') // Normalize 'al-' prefix
    .replace(/^ad-/, 'al ') // Normalize 'ad-' prefix
    .trim();
};

/**
 * Calculate geographical distance between two features using the Haversine formula.
 */
export const calculateDistance = (feature1, feature2) => {
  const [lon1, lat1] = feature1.geometry.coordinates;
  const [lon2, lat2] = feature2.geometry.coordinates;
  const toRadians = (deg) => (deg * Math.PI) / 180;

  const R = 6371; // Earth radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));
  const distance = R * c;

  return distance; // Distance in kilometers
};

/**
 * Create a spatial weights matrix based on specified options.
 * Supports 'binary' and 'distance-decay' weight types.
 */
export const createWeightsMatrix = (geometry, options = {}) => {
  const { type = 'binary', bandwidth = 100 } = options; // Default bandwidth to 100 km
  const weights = {};

  geometry.features.forEach((feature1) => {
    const id1 = feature1.properties.normalizedName;
    weights[id1] = {};

    geometry.features.forEach((feature2) => {
      const id2 = feature2.properties.normalizedName;
      if (id1 === id2) return; // Skip self

      const distance = calculateDistance(feature1, feature2);

      if (type === 'binary') {
        weights[id1][id2] = 1;
      } else if (type === 'distance-decay') {
        if (distance > 0 && distance <= bandwidth) {
          weights[id1][id2] = 1 / distance;
        }
      }
    });
  });

  return weights;
};

/**
 * Calculate the standard deviation of an array of numbers.
 */
export const calculateStandardDeviation = (values) => {
  const mean =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
};

/**
 * Calculate the coefficient of variation for an array of numbers.
 */
export const calculateCoefficientOfVariation = (values) => {
  const mean =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);
  return stdDev / mean;
};
