// src/selectors/optimizedSelectors.js
import { createSelector } from 'reselect';
import _ from 'lodash';

// Base selectors
const selectSpatialState = state => state.spatial;
const selectData = state => state.spatial?.data;
const selectUI = state => state.spatial?.ui;

// Memoized selectors with optimized equality checks
export const selectSpatialDataOptimized = createSelector(
  [selectData],
  data => ({
    geometry: data?.geometry || {},
    flowMaps: data?.flowMaps || [],
    timeSeriesData: data?.timeSeriesData || [],
    marketClusters: data?.marketClusters || [],
    commodities: data?.commodities || []
  }),
  {
    memoizeOptions: {
      resultEqualityCheck: _.isEqual,
      maxSize: 10
    }
  }
);

export const selectActiveViewData = createSelector(
  [selectSpatialDataOptimized, selectUI],
  (data, ui) => {
    if (!ui?.selectedCommodity) return null;
    
    // Return only the data needed for current view
    return {
      commodity: ui.selectedCommodity,
      date: ui.selectedDate,
      data: _.pick(data, [
        'timeSeriesData',
        ui.selectedAnalysis === 'spatial' ? 'flowMaps' : null,
        ui.selectedAnalysis === 'clusters' ? 'marketClusters' : null
      ].filter(Boolean))
    };
  }
);