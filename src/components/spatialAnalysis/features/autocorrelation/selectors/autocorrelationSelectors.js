import { createSelector } from '@reduxjs/toolkit';

// Base selector for autocorrelation state
const selectAutocorrelationState = state => state.spatialAnalysis?.spatialAutocorrelation || {};

/**
 * Selects global Moran's I statistics and significance
 */
export const selectGlobalAutocorrelation = createSelector(
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
 * Selects local Moran's I statistics for all regions
 */
export const selectLocalAutocorrelation = createSelector(
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
 * Selects significant spatial clusters categorized by type
 */
export const selectSignificantClusters = createSelector(
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
 * Selects summary statistics for spatial autocorrelation analysis
 */
export const selectAutocorrelationSummary = createSelector(
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
 * Selects autocorrelation statistics for a specific region
 */
export const selectAutocorrelationByRegion = createSelector(
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
 * Selects spatial lag statistics for visualization
 */
export const selectSpatialLagData = createSelector(
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

// Export all selectors
export default {
  selectGlobalAutocorrelation,
  selectLocalAutocorrelation,
  selectSignificantClusters,
  selectAutocorrelationSummary,
  selectAutocorrelationByRegion,
  selectSpatialLagData
};
