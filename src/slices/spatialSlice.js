// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { MAP_SETTINGS } from '../constants';

export const initialState = {
  data: {
    marketClusters: [], 
    detectedShocks: [], 
    timeSeriesData: [],
    analysisMetrics: {},
    spatialAutocorrelation: null,
    flowAnalysis: [],
    metadata: null
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

      metric.finish({ 
        status: 'success',
        dataSize: JSON.stringify(result).length,
        commodity: selectedCommodity
      });
      
      return {
        ...result,
        selectedCommodity,
        selectedDate: selectedDate || result.timeSeriesData[result.timeSeriesData.length - 1]?.month
      };
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    setProgress: (state, action) => {
      state.status.progress = action.payload;
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
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.data = action.payload;
        state.ui.selectedCommodity = action.payload.selectedCommodity;
        state.ui.selectedDate = action.payload.selectedDate;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
      });
  },
});

export const {
  setProgress,
  setSelectedRegion,
  setView,
  setSelectedCommodity,
  setSelectedDate
} = spatialSlice.actions;

// Memoized selectors
export const selectSpatialData = (state) => state.spatial.data;
export const selectUIState = (state) => state.spatial.ui;

export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => data.timeSeriesData || []
);

export const selectAnalysisMetrics = createSelector(
  [selectSpatialData],
  (data) => data.analysisMetrics || {}
);

export const selectMarketClusters = createSelector(
  [selectSpatialData],
  (data) => data.marketClusters || []
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => data.spatialAutocorrelation
);

export default spatialSlice.reducer;