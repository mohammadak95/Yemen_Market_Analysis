// src/utils/spatialValidation.js

export const spatialValidation = {
  validateDataStructure: (data) => {
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray(data.time_series_data) ||
      !data.spatial_autocorrelation ||
      typeof data.spatial_autocorrelation.global?.significance !== 'string' ||
      !Array.isArray(data.market_clusters)
    ) {
      console.error('[spatialValidation] Invalid data structure:', data);
      return false;
    }
    return true;
    },
  
    validateTransformation: (data, type) => {
      switch (type) {
        case 'aggregation':
          if (!data.aggregatedValues) {
            console.error('[spatialValidation] Aggregation transformation missing aggregatedValues:', data);
            return false;
          }
          break;
        case 'normalization':
          if (typeof data.normalized === 'undefined') {
            console.error('[spatialValidation] Normalization transformation missing normalized field:', data);
            return false;
          }
          break;
        default:
          console.warn(`[spatialValidation] Unknown transformation type: ${type}`);
          return true;
      }
      return true;
    },
  
    validateCache: (cacheData) => {
      if (!cacheData || typeof cacheData !== 'object') {
        console.error('[spatialValidation] Invalid cache data:', cacheData);
        return false;
      }
      const requiredFields = ['timestamp', 'data'];
      for (const field of requiredFields) {
        if (!(field in cacheData)) {
          console.error(`[spatialValidation] Cache data missing field: ${field}`);
          return false;
        }
      }
      return true;
    },
  };