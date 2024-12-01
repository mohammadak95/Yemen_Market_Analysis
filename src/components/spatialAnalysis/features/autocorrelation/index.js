// src/components/spatialAnalysis/features/autocorrelation/index.js

export { default as SpatialAutocorrelationAnalysis } from './SpatialAutocorrelationAnalysis';
export { default as LISAMap } from './LISAMap';
export { default as MoranScatterPlot } from './MoranScatterPlot';

// Types for documentation
/**
 * @typedef {Object} AutocorrelationData
 * @property {Object} global - Global Moran's I statistics
 * @property {number} global.moranI - Global Moran's I value
 * @property {number} global.pValue - P-value for global Moran's I
 * @property {boolean} global.isSignificant - Whether global autocorrelation is significant
 * @property {Array<Object>} local - Local spatial statistics for each region
 * @property {Object} clusters - Regions grouped by cluster type
 * @property {Object} summary - Summary statistics of spatial patterns
 * @property {Object} geometry - GeoJSON data for mapping
 */

/**
 * @typedef {Object} LocalStatistic
 * @property {string} region - Region identifier
 * @property {number} localI - Local Moran's I value
 * @property {number} zScore - Z-score for local statistic
 * @property {number} pValue - P-value for local statistic
 * @property {string} clusterType - Type of spatial cluster ('high-high', 'low-low', etc.)
 */

/**
 * @typedef {Object} ClusterSummary
 * @property {Array<LocalStatistic>} highHigh - High-value clusters
 * @property {Array<LocalStatistic>} lowLow - Low-value clusters
 * @property {Array<LocalStatistic>} highLow - High-low outliers
 * @property {Array<LocalStatistic>} lowHigh - Low-high outliers
 * @property {Array<LocalStatistic>} notSignificant - Non-significant regions
 */

/**
 * @typedef {Object} AnalysisSummary
 * @property {number} globalMoranI - Global Moran's I value
 * @property {boolean} globalSignificance - Global significance
 * @property {number} totalRegions - Total number of regions
 * @property {number} significantRegions - Number of significant regions
 * @property {number} significanceRate - Percentage of significant regions
 */
