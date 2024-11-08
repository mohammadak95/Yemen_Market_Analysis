// src/types/spatialTypes.js

/**
 * @typedef {Object} SpatialFeature
 * @property {string} type - The type of the feature (e.g., "Feature")
 * @property {Object} geometry - The geometry object following GeoJSON specification
 * @property {Object} properties - The properties of the feature
 * @property {string} properties.region_id - The region identifier
 * @property {string} properties.date - The date associated with the feature
 * @property {string} properties.commodity - The commodity associated with the feature
 * @property {number} properties.price - The price value
 * @property {number} properties.conflict_intensity - The conflict intensity value
 * @property {Object} properties.residual - The residual value from analysis
 */

/**
 * @typedef {Object} FlowData
 * @property {string} source - Source region ID
 * @property {number} source_lat - Latitude of the source region
 * @property {number} source_lng - Longitude of the source region
 * @property {string} target - Target region ID
 * @property {number} target_lat - Latitude of the target region
 * @property {number} target_lng - Longitude of the target region
 * @property {number} flow_weight - Flow weight value
 * @property {string} date - Date of the flow data
 * @property {string} commodity - Commodity associated with the flow
 */

/**
 * @typedef {Object} MarketCluster
 * @property {string} mainMarket - Main market ID
 * @property {Set<string>} connectedMarkets - Set of connected market IDs
 * @property {number} marketCount - Number of markets in the cluster
 * @property {number} avgFlow - Average flow within the cluster
 * @property {number} totalFlow - Total flow within the cluster
 */

/**
 * @typedef {Object} MarketShock
 * @property {string} region - Affected region ID
 * @property {string} date - Date of the shock event
 * @property {number} magnitude - Magnitude of the shock
 * @property {string} type - Type of shock (e.g., "price_surge", "price_drop")
 * @property {string} severity - Severity level (e.g., "high", "medium", "low")
 * @property {Array<number>} coordinates - Coordinates of the affected region
 * @property {number} price_change - Percentage change in price
 * @property {number} volatility - Volatility measure
 */

/**
 * @typedef {Object} AnalysisResults
 * @property {Object} moran_i - Moran's I statistic results
 * @property {number} moran_i.I - Moran's I value
 * @property {number} moran_i.expected - Expected Moran's I under null hypothesis
 * @property {number} moran_i.variance - Variance of Moran's I
 * @property {number} moran_i.z_score - Z-score of Moran's I
 * @property {number} moran_i.p_value - P-value of Moran's I
 * @property {number} r_squared - R-squared value of the regression model
 * @property {number} adj_r_squared - Adjusted R-squared value
 * @property {number} observations - Number of observations used in analysis
 * @property {number} mse - Mean squared error of the model
 * @property {Object} coefficients - Regression coefficients
 * @property {number} coefficients.spatial_lag_price - Coefficient for spatial lag of price
 * @property {number} coefficients.intercept - Intercept of the regression model
 * @property {Object} p_values - P-values for the coefficients
 * @property {Array<Object>} residual - Array of residuals
 * @property {string} residual[].region_id - Region ID of the residual
 * @property {string} residual[].date - Date associated with the residual
 * @property {number} residual[].residual - Residual value
 * @property {Array<Object>} vif - Variance Inflation Factor results
 * @property {string} vif[].Variable - Name of the variable
 * @property {number} vif[].VIF - VIF value
 */