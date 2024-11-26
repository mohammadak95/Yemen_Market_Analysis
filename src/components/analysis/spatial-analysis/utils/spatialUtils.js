// src/components/analysis/spatial-analysis/utils/spatialUtils.js

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

/**
 * Additional utility functions can be defined here as needed.
 */
