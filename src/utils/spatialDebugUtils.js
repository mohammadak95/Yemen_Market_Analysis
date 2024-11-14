// src/utils/spatialDebugUtils.js

export const spatialDebugUtils = {
  /**
   * Validates the spatial data structure and content.
   * @param {Object} data - The spatial data to validate.
   * @returns {Object} - An object containing validation results.
   */
  validateSpatialData: (data) => {
    const errors = [];

    // Check if geoData is present and has features
    if (!data.geoData || !Array.isArray(data.geoData.features)) {
      errors.push('geoData is missing or does not contain features.');
    }

    // Check if flowMaps is an array
    if (!Array.isArray(data.flowMaps)) {
      errors.push('flowMaps should be an array.');
    }

    // Validate each feature in geoData
    if (data.geoData && Array.isArray(data.geoData.features)) {
      data.geoData.features.forEach((feature, index) => {
        if (!feature.properties) {
          errors.push(`Feature at index ${index} is missing properties.`);
        }
        if (!feature.geometry) {
          errors.push(`Feature at index ${index} is missing geometry.`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Logs spatial metrics to the console for debugging purposes.
   * @param {Object} data - The spatial data containing metrics.
   */
  logSpatialMetrics: (data) => {
    console.log('Spatial Metrics:');

    // Log integration score
    if (data.analysisResults?.spatialAutocorrelation?.moran_i !== undefined) {
      console.log(`Moran's I: ${data.analysisResults.spatialAutocorrelation.moran_i}`);
    } else {
      console.log("Moran's I is not available.");
    }

    // Log number of clusters
    const clusterCount = data.marketClusters?.length || 0;
    console.log(`Number of Market Clusters: ${clusterCount}`);

    // Log number of detected shocks
    const shockCount = data.detectedShocks?.length || 0;
    console.log(`Number of Detected Shocks: ${shockCount}`);

    // Log time series data length
    const timeSeriesLength = data.timeSeriesData?.length || 0;
    console.log(`Time Series Data Points: ${timeSeriesLength}`);
  },

  /**
   * Analyzes spatial patterns in the data and returns insights.
   * @param {Object} data - The spatial data to analyze.
   * @returns {Object} - An object containing analysis insights.
   */
  analyzeSpatialPatterns: (data) => {
    const insights = {};

    // Analyze price distribution
    if (data.geoData && Array.isArray(data.geoData.features)) {
      const prices = data.geoData.features
        .map((feature) => feature.properties?.priceData?.avgUsdPrice)
        .filter((price) => price !== undefined);

      if (prices.length > 0) {
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

        insights.priceDistribution = {
          maxPrice,
          minPrice,
          avgPrice,
        };
      }
    }

    // Analyze flow intensity
    if (data.flowMaps && Array.isArray(data.flowMaps)) {
      const flowWeights = data.flowMaps
        .map((flow) => flow.flow_weight)
        .filter((weight) => weight !== undefined);

      if (flowWeights.length > 0) {
        const maxFlow = Math.max(...flowWeights);
        const minFlow = Math.min(...flowWeights);
        const avgFlow = flowWeights.reduce((sum, weight) => sum + weight, 0) / flowWeights.length;

        insights.flowIntensity = {
          maxFlow,
          minFlow,
          avgFlow,
        };
      }
    }

    return insights;
  },
};