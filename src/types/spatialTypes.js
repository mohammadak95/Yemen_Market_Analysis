// src/types/spatialTypes.js

/**
 * @typedef {Object} SpatialFeature
 * @property {string} type - Feature type
 * @property {Object} geometry - GeoJSON geometry
 * @property {Object} properties - Feature properties
 */

/**
 * @typedef {Object} FlowData
 * @property {string} source - Source region ID
 * @property {string} target - Target region ID
 * @property {number} flow_weight - Flow weight value
 * @property {number} price_differential - Price difference
 */

/**
 * @typedef {Object} MarketCluster
 * @property {string} mainMarket - Main market ID
 * @property {Set<string>} connectedMarkets - Connected markets
 * @property {number} marketCount - Number of markets in cluster
 */

/**
 * @typedef {Object} MarketShock
 * @property {string} region - Affected region
 * @property {string} date - Shock date
 * @property {number} magnitude - Shock magnitude
 * @property {string} type - Shock type
 * @property {string} severity - Shock severity
 */

/**
 * @typedef {Object} AnalysisResults
 * @property {number} moran_i - Moran's I statistic
 * @property {number} r_squared - R-squared value
 * @property {Object} coefficients - Regression coefficients
 * @property {Array<Object>} residual - Residual values
 */