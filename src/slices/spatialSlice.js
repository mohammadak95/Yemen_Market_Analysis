// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { MAP_SETTINGS } from '../constants';

// Define initial state
export const initialState = {
  data: {
    geoData: null,
    marketClusters: [], 
    detectedShocks: [], 
    timeSeriesData: [],
    flowMaps: [],
    analysisMetrics: {},
    spatialAutocorrelation: null,
    flowAnalysis: [],
    metadata: null,
    uniqueMonths: []
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    view: {
      center: MAP_SETTINGS.DEFAULT_CENTER,
      zoom: MAP_SETTINGS.DEFAULT_ZOOM,
    },
  },
  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: null,
  }
};

// Create async thunk for fetching spatial data
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');

    try {
      if (!selectedCommodity) {
        throw new Error('Commodity parameter is required');
      }

      const result = await precomputedDataManager.processSpatialData(
        selectedCommodity,
        selectedDate
      );

      // Get unique months from time series data
      const uniqueMonths = [...new Set(result.timeSeriesData.map(d => d.month))].sort();

      metric.finish({ 
        status: 'success',
        dataSize: JSON.stringify(result).length,
        commodity: selectedCommodity
      });
      
      return {
        ...result,
        uniqueMonths,
        selectedCommodity,
        selectedDate: selectedDate || uniqueMonths[uniqueMonths.length - 1]
      };
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

// Create the slice
const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    setProgress: (state, action) => {
      state.status.progress = action.payload;
    },
    setLoadingStage: (state, action) => {
      state.status.stage = action.payload;
    },
    setSelectedRegion: (state, action) => {
      state.ui.selectedRegion = action.payload;
    },
    setView: (state, action) => {
      state.ui.view = action.payload;
    },
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
    },
    setSelectedRegimes: (state, action) => {
      state.ui.selectedRegimes = action.payload;
    },
    resetState: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.progress = 0;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.error = null;
        state.status.progress = 100;
        state.data = action.payload;
        state.ui.selectedCommodity = action.payload.selectedCommodity;
        state.ui.selectedDate = action.payload.selectedDate;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
      });
  },
});

// Export actions
export const {
  setProgress,
  setLoadingStage,
  setSelectedRegion,
  setView,
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegimes,
  resetState
} = spatialSlice.actions;

// Basic selectors
export const selectSpatialData = state => state.spatial.data;
export const selectUIState = state => state.spatial.ui;
export const selectStatusState = state => state.spatial.status;

// Memoized selectors
export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  data => data.timeSeriesData || []
);

export const selectAnalysisMetrics = createSelector(
  [selectSpatialData],
  data => data.analysisMetrics || {}
);

export const selectMarketClusters = createSelector(
  [selectSpatialData],
  data => data.marketClusters || []
);

export const selectFlowMaps = createSelector(
  [selectSpatialData],
  data => data.flowMaps || []
);

export const selectGeoData = createSelector(
  [selectSpatialData],
  data => data.geoData || null
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  data => data.spatialAutocorrelation || null
);

export const selectUniqueMonths = createSelector(
  [selectSpatialData],
  data => data.uniqueMonths || []
);

export const selectSelectedCommodity = createSelector(
  [selectUIState],
  ui => ui.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectUIState],
  ui => ui.selectedDate
);

export const selectSelectedRegimes = createSelector(
  [selectUIState],
  ui => ui.selectedRegimes
);

export const selectView = createSelector(
  [selectUIState],
  ui => ui.view
);

export const selectIsLoading = createSelector(
  [selectStatusState],
  status => status.loading
);

export const selectError = createSelector(
  [selectStatusState],
  status => status.error
);

export default spatialSlice.reducer;