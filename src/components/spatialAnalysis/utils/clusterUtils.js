// src/components/spatialAnalysis/utils/clusterUtils.js

import { DEFAULT_METRICS } from '../types';

/**
 * Calculate average metrics for a set of time series data points
 * @param {Array} timeSeriesData - Array of time series data points
 * @returns {Object} Average metrics
 */
export const calculateAverageMetrics = (timeSeriesData) => {
  if (!timeSeriesData?.length) {
    return DEFAULT_METRICS;
  }

  const sum = timeSeriesData.reduce((acc, point) => ({
    price: acc.price + (point.usdPrice || 0),
    conflict: acc.conflict + (point.conflictIntensity || 0)
  }), { price: 0, conflict: 0 });

  return {
    avgPrice: sum.price / timeSeriesData.length,
    avgConflict: sum.conflict / timeSeriesData.length
  };
};

/**
 * Get time series data for a specific cluster
 * @param {Object} cluster - Cluster object
 * @param {Array} timeSeriesData - Complete time series data
 * @returns {Array} Filtered time series data for cluster markets
 */
export const getClusterTimeSeriesData = (cluster, timeSeriesData) => {
  if (!cluster?.connected_markets || !timeSeriesData?.length) {
    return [];
  }

  return timeSeriesData.filter(point => 
    cluster.connected_markets.includes(point.region)
  );
};

/**
 * Format cluster data for display
 * @param {Object} cluster - Cluster object with metrics
 * @returns {Object} Formatted cluster data
 */
export const formatClusterData = (cluster) => {
  if (!cluster) return null;

  return {
    title: `${cluster.main_market} Cluster`,
    marketCount: cluster.connected_markets?.length || 0,
    metrics: {
      avgPrice: cluster.metrics?.avgPrice?.toFixed(2) || '0.00',
      avgConflict: cluster.metrics?.avgConflict?.toFixed(2) || '0.00',
      marketCount: cluster.metrics?.marketCount || 0
    }
  };
};

/**
 * Check if a region belongs to a cluster
 * @param {string} region - Region identifier
 * @param {Object} cluster - Cluster object
 * @returns {boolean} Whether region belongs to cluster
 */
export const isRegionInCluster = (region, cluster) => {
  if (!region || !cluster?.connected_markets) {
    return false;
  }

  return cluster.connected_markets.includes(region) || 
         cluster.main_market === region;
};

/**
 * Get cluster by region
 * @param {string} region - Region identifier
 * @param {Array} clusters - Array of clusters
 * @returns {Object|null} Cluster containing the region
 */
export const getClusterByRegion = (region, clusters) => {
  if (!region || !clusters?.length) {
    return null;
  }

  return clusters.find(cluster => 
    isRegionInCluster(region, cluster)
  );
};

export default {
  calculateAverageMetrics,
  getClusterTimeSeriesData,
  formatClusterData,
  isRegionInCluster,
  getClusterByRegion
};
