/**
 * @typedef {Object} PrecomputedData
 * @property {TimeSeriesEntry[]} timeSeriesData
 * @property {MarketShock[]} marketShocks
 * @property {MarketCluster[]} marketClusters
 * @property {FlowAnalysis[]} flowAnalysis
 * @property {SpatialAutocorrelation} spatialAutocorrelation
 * @property {DataMetadata} metadata
 * @property {Geometry[]} geoData // New addition for geometry information
 */

/**
 * @typedef {Object} Geometry
 * @property {string} type - Type of geometry, e.g., "Polygon" or "Point"
 * @property {Array} coordinates - Coordinates array
 */

/**
 * @typedef {Object} TimeSeriesEntry
 * @property {string} month
 * @property {number} avgUsdPrice
 * @property {number} volatility
 * @property {number} sampleSize
 * @property {boolean} [significant] - Optional, indicates if the entry is statistically significant
 */

/**
 * @typedef {Object} MarketShock
 * @property {string} region
 * @property {string} date
 * @property {number} magnitude
 * @property {'price_surge' | 'price_drop'} type
 * @property {'high' | 'medium' | 'low'} severity
 * @property {number} price_change
 * @property {number} previous_price
 * @property {number} current_price
 */

/**
 * @typedef {Object} MarketCluster
 * @property {number} cluster_id
 * @property {string} main_market
 * @property {string[]} connected_markets
 * @property {number} market_count
 * @property {Object} metrics
 * @property {number} metrics.totalFlow
 * @property {number} metrics.avgFlow
 * @property {number} metrics.flowDensity
 */

/**
 * @typedef {Object} FlowAnalysis
 * @property {string} source
 * @property {string} target
 * @property {number} total_flow
 * @property {number} avg_flow
 * @property {number} flow_count
 * @property {number} avg_price_differential
 * @property {number} [flow_weight] - Optional, weight of the flow if applicable
 */

/**
 * @typedef {Object} SpatialAutocorrelation
 * @property {number} moran_i
 * @property {number} p_value
 * @property {boolean} significance
 */

/**
 * @typedef {Object} DataMetadata
 * @property {string} commodity
 * @property {string} data_source
 * @property {string} processed_date
 * @property {number} total_clusters
 * @property {string} [projection] - Optional, projection used for spatial data
 * @property {string[]} [uniqueMonths] - Optional, unique months available in the data
 */

/**
 * @typedef {Object} SpatialViewConfig
 * @property {[number, number]} center
 * @property {number} zoom
 */

/**
 * @typedef {Object} AnalysisMetrics
 * @property {number} marketCoverage
 * @property {number} integrationLevel
 * @property {number} stability
 * @property {number} observations
 * @property {number} [reliabilityScore] - Optional, additional metric if used
 */

/**
 * @typedef {Object} RegionMapping - Mapping of normalized region names
 * @property {string} originalName - The original name of the region
 * @property {string} normalizedName - The normalized name for matching
 */
