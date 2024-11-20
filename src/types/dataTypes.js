// src/types/dataTypes.js

/**
 * @typedef {Object} SeasonalAnalysis
 * @property {number} seasonal_strength
 * @property {number} trend_strength
 * @property {number} peak_month
 * @property {number} trough_month
 * @property {Array<number>} seasonal_pattern
 */

/**
 * @typedef {Object} MarketIntegration
 * @property {Object} price_correlation
 * @property {number} flow_density
 * @property {Object} accessibility
 * @property {number} integration_score
 */

/**
 * @typedef {Object} RegressionModel
 * @property {Object} coefficients - Model coefficients
 * @property {number} intercept - Model intercept
 * @property {Object} p_values - P-values for coefficients
 * @property {number} r_squared - R-squared value
 * @property {number} adj_r_squared - Adjusted R-squared
 * @property {number} mse - Mean squared error
 * @property {number} observations - Number of observations
 */

/**
 * @typedef {Object} SpatialStatistics
 * @property {Object} moran_i - Moran's I statistics
 * @property {Array} vif - Variance inflation factors
 */

/**
 * @typedef {Object} ResidualData
 * @property {string} region_id - Region identifier 
 * @property {string} date - ISO date string
 * @property {number} residual - Residual value
 */

/**
 * @typedef {Object} ResidualStats
 * @property {number} mean - Mean of residuals
 * @property {number} variance - Variance of residuals
 * @property {number} maxAbsolute - Maximum absolute residual
 */

/**
 * Default/placeholder values for regression data
 */
export const DEFAULT_REGRESSION_DATA = {
  model: {
    coefficients: {
      spatial_lag_price: 0
    },
    intercept: 0,
    p_values: {
      spatial_lag_price: 1
    },
    r_squared: 0,
    adj_r_squared: 0,
    mse: 0,
    observations: 0
  },
  spatial: {
    moran_i: {
      I: 0,
      'p-value': 1
    },
    vif: []
  },
  residuals: {
    raw: [],
    byRegion: {},
    stats: {
      mean: 0,
      variance: 0,
      maxAbsolute: 0
    }
  }
};
  
  /**
   * Type checking helpers
   */
  export const isValidRegressionData = (data) => {
    if (!data) return false;
    return (
      typeof data.model === 'object' &&
      typeof data.model.r_squared === 'number' &&
      Array.isArray(data.residuals?.raw)
    );
  };

