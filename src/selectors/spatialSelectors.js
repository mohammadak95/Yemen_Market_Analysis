// src/selectors/spatialSelectors.js

import { createSelector } from '@reduxjs/toolkit';
import { spatialDebugUtils } from '../utils/spatialDebugUtils';


// Base selector for spatial state
const selectSpatialState = (state) => {
  if (process.env.NODE_ENV === 'development') {
    spatialDebugUtils.log('Spatial State Access:', {
      timestamp: new Date().toISOString(),
      stateSize: JSON.stringify(state.spatial).length
    });
  }
  return state.spatial;
};

// UI State Selectors
export const selectSelectedCommodity = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui.selectedDate
);

export const selectSelectedAnalysis = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui.selectedAnalysis
);

export const selectSelectedRegimes = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui.selectedRegimes
);

export const selectSelectedRegion = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui.selectedRegion
);

// Status Selectors
export const selectSpatialStatus = createSelector(
  [selectSpatialState],
  (spatial) => spatial.status
);

export const selectIsLoading = createSelector(
  [selectSpatialStatus],
  (status) => status.loading
);

export const selectError = createSelector(
  [selectSpatialStatus],
  (status) => status.error
);

export const selectIsInitialized = createSelector(
  [selectSpatialStatus],
  (status) => status.isInitialized
);

// Data Selectors
export const selectSpatialData = createSelector(
  [selectSpatialState],
  (spatial) => spatial.data
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
  (data) => data?.flowMaps || []
);

export const selectAnalysisResults = createSelector(
  [selectSpatialData],
  (data) => data?.analysisResults || {}
);

export const selectMetadata = createSelector(
  [selectSpatialData],
  (data) => data?.metadata || {}
);

// Derived Selectors
export const selectAvailableDates = createSelector(
  [selectTimeSeriesData],
  (timeSeriesData) => 
    [...new Set(timeSeriesData.map(entry => entry.month))].sort()
);

export const selectAvailableRegimes = createSelector(
  [selectMarketClusters],
  (clusters) => {
    if (!clusters) return [];
    const regimes = new Set();
    clusters.forEach(cluster => {
      if (cluster.main_market) regimes.add(cluster.main_market);
      cluster.connected_markets?.forEach(market => regimes.add(market));
    });
    return Array.from(regimes);
  }
);

export const selectMarketMetrics = createSelector(
  [selectSpatialData],
  (data) => {
    if (!data) return null;

    return {
      totalMarkets: data.marketClusters?.length || 0,
      avgClusterSize: data.marketClusters?.reduce((acc, cluster) => 
        acc + cluster.market_count, 0) / (data.marketClusters?.length || 1),
      integrationScore: data.analysisResults?.spatialAutocorrelation?.global?.moran_i || 0,
      coverageRate: (data.analysisMetrics?.coverage || 0) * 100,
    };
  }
);

export const selectMarketAnalysis = createSelector(
  [selectSpatialData, selectSelectedRegion],
  (data, selectedRegion) => {
    if (!data || !selectedRegion) return null;

    const marketCluster = data.marketClusters?.find(cluster => 
      cluster.main_market === selectedRegion || 
      cluster.connected_markets?.includes(selectedRegion)
    );

    const flowData = data.flowMaps?.filter(flow => 
      flow.source === selectedRegion || flow.target === selectedRegion
    );

    return {
      cluster: marketCluster || null,
      flows: flowData || [],
      localIntegration: data.analysisResults?.spatialAutocorrelation?.local?.[selectedRegion] || null,
      timeSeriesData: data.timeSeriesData?.filter(ts => ts.region === selectedRegion) || [],
    };
  }
);

export const selectAvailableCommodities = createSelector(
  [selectMetadata],
  (metadata) => metadata?.availableCommodities || []
);

export const selectUniqueMonths = createSelector(
  [selectTimeSeriesData],
  (timeSeriesData) => [...new Set(timeSeriesData.map(d => d.month))].sort()
);