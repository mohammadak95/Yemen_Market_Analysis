// src/components/spatialAnalysis/features/autocorrelation/selectors/autocorrelationSelectors.js

import { createDeepEqualSelector } from '../../../../selectors/selectorUtils';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

/**
 * Base selector to retrieve the autocorrelation state from the Redux store.
 * Provides a default empty object if the state is undefined.
 */
const selectAutocorrelationState = (state) => 
  state.spatialAnalysis?.spatialAutocorrelation || {};

/**
 * Selector to retrieve global Moran's I statistics and significance.
 */
export const selectGlobalAutocorrelation = createDeepEqualSelector(
  [selectAutocorrelationState],
  (autocorrelation) => {
    if (!autocorrelation?.global) {
      return {
        moran_i: 0,
        p_value: null,
        z_score: null,
        significance: false
      };
    }

    return {
      moran_i: autocorrelation.global.moran_i || 0,
      p_value: autocorrelation.global.p_value,
      z_score: autocorrelation.global.z_score,
      significance: autocorrelation.global.significance || false
    };
  }
);

/**
 * Selector to retrieve local Moran's I statistics for all regions.
 */
export const selectLocalAutocorrelation = createDeepEqualSelector(
  [selectAutocorrelationState],
  (autocorrelation) => {
    if (!autocorrelation?.local) {
      return {};
    }

    return Object.entries(autocorrelation.local).reduce((acc, [region, stats]) => {
      acc[region] = {
        local_i: stats.local_i || 0,
        p_value: stats.p_value,
        cluster_type: stats.cluster_type || 'not_significant',
        z_score: stats.z_score,
        spatial_lag: stats.spatial_lag || 0,
        variance: stats.variance || 0
      };
      return acc;
    }, {});
  }
);

/**
 * Selector to categorize significant spatial clusters by type.
 */
export const selectSignificantClusters = createDeepEqualSelector(
  [selectLocalAutocorrelation],
  (localStats) => {
    const clusters = {
      'high-high': [],
      'low-low': [],
      'high-low': [],
      'low-high': [],
      'not_significant': []
    };

    Object.entries(localStats).forEach(([region, stats]) => {
      const type = stats.cluster_type || 'not_significant';
      clusters[type].push({
        region,
        ...stats
      });
    });

    return clusters;
  }
);

/**
 * Selector to summarize statistics for spatial autocorrelation analysis.
 */
export const selectAutocorrelationSummary = createDeepEqualSelector(
  [selectGlobalAutocorrelation, selectLocalAutocorrelation],
  (global, local) => {
    const localCount = Object.keys(local).length;
    const significantCount = Object.values(local).filter(
      stats => stats.p_value && stats.p_value < 0.05
    ).length;

    const clusterCounts = Object.values(local).reduce((acc, stats) => {
      const type = stats.cluster_type || 'not_significant';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      globalMoranI: global.moran_i,
      globalSignificance: global.significance,
      totalRegions: localCount,
      significantRegions: significantCount,
      significanceRate: localCount ? (significantCount / localCount) * 100 : 0,
      clusterDistribution: {
        hotspots: clusterCounts['high-high'] || 0,
        coldspots: clusterCounts['low-low'] || 0,
        outliers: (clusterCounts['high-low'] || 0) + (clusterCounts['low-high'] || 0),
        notSignificant: clusterCounts['not_significant'] || 0
      }
    };
  }
);

/**
 * Selector to retrieve autocorrelation statistics for a specific region.
 *
 * @param {Object} state - The Redux state.
 * @param {string} regionId - The ID of the region.
 * @returns {Object|null} - Autocorrelation data for the specified region or null if not found.
 */
export const selectAutocorrelationByRegion = createDeepEqualSelector(
  [selectLocalAutocorrelation, (_, regionId) => regionId],
  (localStats, regionId) => {
    if (!localStats[regionId]) return null;

    const stats = localStats[regionId];
    return {
      ...stats,
      isSignificant: stats.p_value <= 0.05,
      standardizedValue: stats.local_i / Math.sqrt(stats.variance || 1)
    };
  }
);

/**
 * Selector to retrieve spatial lag statistics for visualization purposes.
 */
export const selectSpatialLagData = createDeepEqualSelector(
  [selectLocalAutocorrelation],
  (localStats) => {
    return Object.entries(localStats).map(([region, stats]) => ({
      region,
      value: stats.local_i,
      spatialLag: stats.spatial_lag,
      significance: stats.p_value <= 0.05,
      quadrant: stats.cluster_type
    }));
  }
);

/**
 * Selector to aggregate all autocorrelation selectors into a single export.
 */
const autocorrelationSelectors = {
  selectGlobalAutocorrelation,
  selectLocalAutocorrelation,
  selectSignificantClusters,
  selectAutocorrelationSummary,
  selectAutocorrelationByRegion,
  selectSpatialLagData
};

export default autocorrelationSelectors;