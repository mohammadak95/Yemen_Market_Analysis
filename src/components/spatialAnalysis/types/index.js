// src/components/spatialAnalysis/types/index.js

/**
 * @typedef {Object} ClusterMetrics
 * @property {number} avgPrice - Average price across markets in the cluster
 * @property {number} avgConflict - Average conflict intensity in the cluster
 * @property {number} marketCount - Number of markets in the cluster
 */

/**
 * @typedef {Object} Cluster
 * @property {number} cluster_id - Unique identifier for the cluster
 * @property {string} main_market - Main market in the cluster
 * @property {string[]} connected_markets - Array of connected market identifiers
 * @property {ClusterMetrics} metrics - Cluster metrics
 */

/**
 * @typedef {Object} OverallMetrics
 * @property {number} totalMarkets - Total number of markets across all clusters
 * @property {number} avgPrice - Average price across all markets
 * @property {number} avgConflict - Average conflict intensity across all markets
 */

/**
 * @typedef {Object} ClusterAnalysisResult
 * @property {Cluster[]} clusters - Array of analyzed clusters
 * @property {OverallMetrics} metrics - Overall analysis metrics
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message if any
 */

/**
 * @typedef {Object} GeometryData
 * @property {Object} unified - GeoJSON data for the map
 * @property {Object} points - Point data for markets
 * @property {Object} polygons - Polygon data for regions
 */

// Constants
export const ClusterTypes = {
  CLUSTER_1: 1,
  CLUSTER_2: 2
};

// Default values
export const DEFAULT_METRICS = {
  avgPrice: 0,
  avgConflict: 0,
  marketCount: 0
};

export const DEFAULT_OVERALL_METRICS = {
  totalMarkets: 0,
  avgPrice: 0,
  avgConflict: 0
};
