/**
 * @typedef {Object} PrecomputedData
 * @property {TimeSeriesEntry[]} timeSeriesData
 * @property {MarketShock[]} marketShocks
 * @property {MarketCluster[]} marketClusters
 * @property {FlowAnalysis[]} flowAnalysis
 * @property {EnhancedSpatialAutocorrelation} spatialAutocorrelation
 * @property {SeasonalAnalysis} seasonalAnalysis
 * @property {ConflictAdjustedMetrics} conflictAdjustedMetrics
 * @property {MarketIntegration} marketIntegration
 * @property {EnhancedMetadata} metadata
 * @property {Geometry[]} geoData
 */

/**
 * @typedef {Object} TimeSeriesEntry
 * @property {string} month
 * @property {number} avgUsdPrice
 * @property {number} volatility
 * @property {number} garch_volatility
 * @property {number} conflict_intensity
 * @property {number} sampleSize
 * @property {number} price_stability
 * @property {boolean} [significant]
 */

/**
 * @typedef {Object} MarketShock
 * @property {string} region
 * @property {string} date
 * @property {number} magnitude
 * @property {'price_surge' | 'price_drop'} shock_type
 * @property {'high' | 'medium' | 'low'} severity
 * @property {number} previous_price
 * @property {number} current_price
 * @property {number} conflict_intensity
 * @property {number} threshold_used
 */

/**
 * @typedef {Object} MarketCluster
 * @property {number} cluster_id
 * @property {string} main_market
 * @property {string[]} connected_markets
 * @property {number} market_count
 * @property {ClusterMetrics} metrics
 * @property {ClusterEfficiency} efficiency
 */

/**
 * @typedef {Object} ClusterMetrics
 * @property {number} totalFlow
 * @property {number} avgFlow
 * @property {number} flowDensity
 * @property {number} internal_connectivity
 * @property {number} market_coverage
 * @property {number} price_convergence
 * @property {number} stability
 */

/**
 * @typedef {Object} ClusterEfficiency
 * @property {number} internal_connectivity
 * @property {number} market_coverage
 * @property {number} price_convergence
 * @property {number} stability
 * @property {number} efficiency_score
 */

/**
 * @typedef {Object} FlowAnalysis
 * @property {string} source
 * @property {string} target
 * @property {number} total_flow
 * @property {number} avg_flow
 * @property {number} flow_count
 * @property {number} avg_price_differential
 * @property {number} [flow_weight]
 * @property {[number, number]} source_coordinates
 * @property {[number, number]} target_coordinates
 */

/**
 * @typedef {Object} EnhancedSpatialAutocorrelation
 * @property {GlobalSpatialMetrics} global
 * @property {Object.<string, LocalSpatialMetrics>} local
 * @property {Object.<string, HotspotAnalysis>} hotspots
 */

/**
 * @typedef {Object} GlobalSpatialMetrics
 * @property {number} moran_i
 * @property {number} p_value
 * @property {number} z_score
 * @property {boolean} significance
 */

/**
 * @typedef {Object} LocalSpatialMetrics
 * @property {number} local_i
 * @property {number} p_value
 * @property {string} cluster_type
 */

/**
 * @typedef {Object} HotspotAnalysis
 * @property {number} gi_star
 * @property {number} p_value
 * @property {'hot_spot' | 'cold_spot' | 'not_significant'} intensity
 */

/**
 * @typedef {Object} SeasonalAnalysis
 * @property {number} seasonal_strength
 * @property {number} trend_strength
 * @property {number} peak_month
 * @property {number} trough_month
 * @property {number[]} seasonal_pattern
 */

/**
 * @typedef {Object} ConflictAdjustedMetrics
 * @property {number} avg_raw_price
 * @property {number} avg_adjusted_price
 * @property {number} avg_raw_volatility
 * @property {number} avg_adjusted_volatility
 * @property {number} raw_stability
 * @property {number} adjusted_stability
 * @property {number} high_conflict_periods
 * @property {number} avg_conflict_intensity
 * @property {number} max_conflict_intensity
 */

/**
 * @typedef {Object} MarketIntegration
 * @property {number[][]} price_correlation
 * @property {number} flow_density
 * @property {number[]} accessibility
 * @property {number} integration_score
 */

/**
 * @typedef {Object} EnhancedMetadata
 * @property {string} commodity
 * @property {string} data_source
 * @property {string} processed_date
 * @property {number} total_clusters
 * @property {string} [projection]
 * @property {string[]} [uniqueMonths]
 * @property {AnalysisParameters} analysis_parameters
 */

/**
 * @typedef {Object} AnalysisParameters
 * @property {GarchParameters} garch_parameters
 * @property {string} spatial_weights
 * @property {number} significance_level
 * @property {boolean} seasonal_adjustment
 * @property {boolean} conflict_adjustment
 */

/**
 * @typedef {Object} GarchParameters
 * @property {number} p
 * @property {number} q
 */

/**
 * @typedef {Object} Geometry
 * @property {string} type
 * @property {Array} coordinates
 * @property {Object} [properties]
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
 * @property {SpatialEfficiency} spatialEfficiency
 * @property {number} [reliabilityScore]
 */

/**
 * @typedef {Object} SpatialEfficiency
 * @property {number} moranI
 * @property {number} pValue
 * @property {boolean} significance
 * @property {number} rSquared
 * @property {number} spatialLag
 */

/**
 * @typedef {Object} RegionMapping
 * @property {string} originalName
 * @property {string} normalizedName
 * @property {string} [standardizedName]
 * @property {[number, number]} [coordinates]
 */

/**
 * @typedef {Object} ModelDiagnostics
 * @property {VIFResults} vif
 * @property {ResidualDiagnostics} residuals
 * @property {HomoskedasticityTest} heteroskedasticity
 */

/**
 * @typedef {Object} VIFResults
 * @property {Object.<string, number>} vifFactors
 * @property {boolean} hasHighMulticollinearity
 * @property {number} meanVIF
 */

/**
 * @typedef {Object} ResidualDiagnostics
 * @property {number} skewness
 * @property {number} kurtosis
 * @property {boolean} isNormal
 * @property {BasicStats} stats
 */

/**
 * @typedef {Object} BasicStats
 * @property {number} mean
 * @property {number} std
 */

/**
 * @typedef {Object} HomoskedasticityTest
 * @property {boolean} isHomoskedastic
 * @property {number} varianceRatio
 * @property {'Homoskedastic' | 'Heteroskedastic'} interpretation
 */