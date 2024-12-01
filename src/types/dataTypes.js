// src/types/dataTypes.js

/**
 * Default regression analysis data structure
 */
export const DEFAULT_REGRESSION_DATA = {
  model: {
    coefficients: {},
    r_squared: 0,
    adj_r_squared: 0,
    f_statistic: 0,
    p_value: 1,
    observations: 0,
    mse: 0
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
  },
  metadata: {
    timestamp: null,
    version: '1.0',
    commodity: '',
    period: {
      start: null,
      end: null
    }
  }
};

/**
 * Validate regression data structure
 * @param {Object} data - Data to validate
 * @returns {boolean} Whether the data is valid
 */
export const isValidRegressionData = (data) => {
  if (!data || typeof data !== 'object') return false;

  // Check model properties
  const hasValidModel = data.model && 
    typeof data.model === 'object' &&
    typeof data.model.coefficients === 'object' &&
    typeof data.model.r_squared === 'number' &&
    typeof data.model.adj_r_squared === 'number' &&
    typeof data.model.f_statistic === 'number' &&
    typeof data.model.p_value === 'number' &&
    typeof data.model.observations === 'number' &&
    typeof data.model.mse === 'number';

  if (!hasValidModel) return false;

  // Check spatial properties
  const hasValidSpatial = data.spatial &&
    typeof data.spatial === 'object' &&
    data.spatial.moran_i &&
    typeof data.spatial.moran_i.I === 'number' &&
    typeof data.spatial.moran_i['p-value'] === 'number' &&
    Array.isArray(data.spatial.vif);

  if (!hasValidSpatial) return false;

  // Check residuals properties
  const hasValidResiduals = data.residuals &&
    typeof data.residuals === 'object' &&
    Array.isArray(data.residuals.raw) &&
    typeof data.residuals.byRegion === 'object' &&
    data.residuals.stats &&
    typeof data.residuals.stats.mean === 'number' &&
    typeof data.residuals.stats.variance === 'number' &&
    typeof data.residuals.stats.maxAbsolute === 'number';

  if (!hasValidResiduals) return false;

  // Check metadata properties
  const hasValidMetadata = data.metadata &&
    typeof data.metadata === 'object' &&
    typeof data.metadata.version === 'string' &&
    typeof data.metadata.commodity === 'string' &&
    data.metadata.period &&
    typeof data.metadata.period === 'object';

  return hasValidMetadata;
};

/**
 * Market cluster data structure
 */
export const MARKET_CLUSTER_TYPE = {
  cluster_id: '',
  main_market: '',
  connected_markets: [],
  metrics: {
    efficiency: 0,
    internal_connectivity: 0,
    market_coverage: 0,
    price_convergence: 0,
    stability: 0
  }
};

/**
 * Market flow data structure
 */
export const MARKET_FLOW_TYPE = {
  source: '',
  target: '',
  total_flow: 0,
  avg_flow: 0,
  flow_count: 0,
  avg_price_differential: 0
};

/**
 * Market shock data structure
 */
export const MARKET_SHOCK_TYPE = {
  region: '',
  date: '',
  shock_type: '',
  magnitude: 0,
  current_price: 0,
  previous_price: 0
};

/**
 * Time series data point structure
 */
export const TIME_SERIES_TYPE = {
  region: '',
  month: '',
  usdPrice: 0,
  conflictIntensity: 0,
  additionalProperties: {
    date: null,
    residual: 0
  }
};

/**
 * Geometry data structure
 */
export const GEOMETRY_TYPE = {
  points: [],
  polygons: [],
  unified: null,
  metadata: {
    lastUpdated: null,
    version: '1.0'
  }
};

/**
 * Market integration data structure
 */
export const MARKET_INTEGRATION_TYPE = {
  price_correlation: {},
  flow_density: 0,
  accessibility: {},
  integration_score: 0
};

/**
 * Spatial autocorrelation data structure
 */
export const SPATIAL_AUTOCORRELATION_TYPE = {
  global: {
    moran_i: 0,
    p_value: 1,
    z_score: null,
    significance: false
  },
  local: {}
};

/**
 * Visualization data structure
 */
export const VISUALIZATION_DATA_TYPE = {
  prices: null,
  integration: null,
  clusters: null,
  shocks: null
};

/**
 * Status data structure
 */
export const STATUS_TYPE = {
  loading: false,
  error: null,
  progress: 0,
  stage: 'idle',
  geometryLoading: false,
  regressionLoading: false,
  visualizationLoading: false,
  dataFetching: false,
  dataCaching: false,
  lastUpdated: null,
  retryCount: 0,
  lastError: null
};

// Export all types
export const types = {
  DEFAULT_REGRESSION_DATA,
  MARKET_CLUSTER_TYPE,
  MARKET_FLOW_TYPE,
  MARKET_SHOCK_TYPE,
  TIME_SERIES_TYPE,
  GEOMETRY_TYPE,
  MARKET_INTEGRATION_TYPE,
  SPATIAL_AUTOCORRELATION_TYPE,
  VISUALIZATION_DATA_TYPE,
  STATUS_TYPE
};
