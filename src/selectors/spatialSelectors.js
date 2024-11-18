// src/selectors/spatialSelectors.js

import { createSelector } from '@reduxjs/toolkit';
import { spatialDebugUtils } from '../utils/MonitoringSystem';

// Helper function for calculating stability
// Ensure this function is defined or imported from your utilities
const calculateStability = (timeSeriesData) => {
  // Example implementation; replace with your actual logic
  if (!timeSeriesData.length) return 0;
  const prices = timeSeriesData.map(entry => entry.price);
  const mean = prices.reduce((acc, val) => acc + val, 0) / prices.length;
  const variance = prices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / prices.length;
  return Math.sqrt(variance) / mean * 100;
};

// Base selector for spatial state with development logging
const selectSpatialState = (state) => {
  if (process.env.NODE_ENV === 'development') {
    spatialDebugUtils.log('Spatial State Access:', {
      timestamp: new Date().toISOString(),
      stateSize: JSON.stringify(state.spatial).length, // Consider optimizing this if state.spatial is large
    });
  }
  return state.spatial;
};

// UI State Selectors
export const selectSelectedCommodity = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.ui?.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.ui?.selectedDate
);

export const selectSelectedAnalysis = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.ui?.selectedAnalysis
);

export const selectSelectedRegimes = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.ui?.selectedRegimes || []
);

export const selectSelectedRegion = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.ui?.selectedRegion
);

// Status Selectors
export const selectSpatialStatus = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.status
);

export const selectIsLoading = createSelector(
  [selectSpatialStatus],
  (status) => status?.loading
);

export const selectError = createSelector(
  [selectSpatialStatus],
  (status) => status?.error
);

export const selectIsInitialized = createSelector(
  [selectSpatialStatus],
  (status) => status?.isInitialized
);

// Data Selectors
export const selectSpatialData = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.data
);

export const selectGeoData = createSelector(
  [selectSpatialData],
  (data) => data?.geoData
);

export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => data?.timeSeriesData || []
);

export const selectMarketClusters = createSelector(
  [selectSpatialData],
  (data) => data?.marketClusters || []
);

export const selectFlowMaps = createSelector(
  [selectSpatialData],
  (data) => data?.flowAnalysis || []
);

export const selectAnalysisResults = createSelector(
  [selectSpatialData],
  (data) => data?.marketIntegration || {}
);

export const selectMetadata = createSelector(
  [selectSpatialData],
  (data) => data?.metrics || {}
);

// Derived Selectors
export const selectAvailableDates = createSelector(
  [selectTimeSeriesData],
  (timeSeriesData) =>
    [...new Set(timeSeriesData.map((entry) => entry.date))].sort()
);

export const selectAvailableRegimes = createSelector(
  [selectMarketClusters],
  (clusters) => {
    if (!clusters.length) return [];
    const regimes = new Set();
    clusters.forEach((cluster) => {
      if (cluster.main_market) regimes.add(cluster.main_market);
      cluster.connected_markets?.forEach((market) => regimes.add(market));
    });
    return Array.from(regimes);
  }
);

// Composite Selectors
export const selectMarketMetrics = createSelector(
  [selectSpatialData],
  (data) => {
    if (!data) return null;

    const totalMarkets = data.marketClusters?.length || 0;
    const avgClusterSize =
      data.marketClusters?.reduce((acc, cluster) => acc + cluster.market_count, 0) /
        (totalMarkets || 1) || 0;
    const integrationScore = data.spatialAutocorrelation?.global?.moran_i || 0;
    const coverageRate = (data.metrics?.coverage || 0) * 100;

    return {
      totalMarkets,
      avgClusterSize,
      integrationScore,
      coverageRate,
    };
  }
);

export const selectMarketAnalysis = createSelector(
  [selectSpatialData, selectSelectedRegion],
  (data, selectedRegion) => {
    if (!data || !selectedRegion) return null;

    const marketCluster = data.marketClusters?.find(
      (cluster) =>
        cluster.main_market === selectedRegion ||
        cluster.connected_markets?.includes(selectedRegion)
    );

    const flowData = data.flowAnalysis?.filter(
      (flow) => flow.source === selectedRegion || flow.target === selectedRegion
    );

    const localIntegration =
      data.spatialAutocorrelation?.local?.[selectedRegion] || null;

    const timeSeriesData = data.timeSeriesData?.filter(
      (ts) => ts.region === selectedRegion
    ) || [];

    return {
      cluster: marketCluster || null,
      flows: flowData || [],
      localIntegration,
      timeSeriesData,
    };
  }
);

export const selectAvailableCommodities = createSelector(
  [selectMetadata],
  (metadata) => metadata?.availableCommodities || []
);

export const selectUniqueMonths = createSelector(
  [selectTimeSeriesData],
  (timeSeriesData) =>
    [...new Set(timeSeriesData.map((d) => d.date))].sort()
);

// New Memoized Selector
export const selectSpatialMetrics = createSelector(
  [selectSpatialData],
  (data) => {
    if (!data) return null;
    return {
      marketCoverage: data.marketClusters?.length || 0,
      integrationLevel: data.spatialAutocorrelation?.global?.moran_i || 0,
      stability: data.timeSeriesData?.length
        ? calculateStability(data.timeSeriesData)
        : 0,
    };
  }
);