// src/utils/spatialProcessors.js

/**
 * Process GeoJSON data by normalizing properties and filtering by commodity.
 * @param {Array<Object>} features - Array of GeoJSON features.
 * @param {string} selectedCommodity - Commodity to filter by.
 * @returns {Array<Object>} Processed features.
 */
export const processGeoJSON = (features, selectedCommodity) => {
  const commodityLower = selectedCommodity.toLowerCase();
  return features
    .filter(feature => feature.properties && feature.geometry)
    .map(feature => {
      const commodity = feature.properties.commodity?.toLowerCase().trim() || '';
      const dateStr = feature.properties.date;
      const dateISO = dateStr ? new Date(dateStr).toISOString() : null;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          commodity,
          price: parseFloat(feature.properties.price) || 0,
          date: dateISO,
        },
      };
    })
    .filter(feature => feature.properties.commodity === commodityLower);
};

/**
 * Process flow data by filtering by date and parsing numerical values.
 * @param {Array<Object>} flows - Array of flow data.
 * @param {string} selectedDate - Date to filter by (YYYY-MM-DD).
 * @returns {Array<Object>} Processed flows.
 */
export const processFlowData = (flows, selectedDate) => {
  return flows
    .filter(flow => flow.date.startsWith(selectedDate))
    .map(flow => ({
      ...flow,
      flow_weight: parseFloat(flow.flow_weight) || 0,
      price_differential: parseFloat(flow.price_differential) || 0,
    }));
};

/**
 * Process spatial weights to ensure correct structure.
 * @param {Object} weights - Spatial weights object.
 * @returns {Object} Processed spatial weights.
 */
export const processSpatialWeights = (weights) => {
  const processed = {};

  Object.entries(weights).forEach(([region, neighbors]) => {
    processed[region] = Array.isArray(neighbors) ? neighbors : [];
  });

  return processed;
};