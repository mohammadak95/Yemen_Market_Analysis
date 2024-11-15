// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { spatialIntegrationSystem } from '../utils/spatialIntegrationSystem';
import { spatialDebugUtils } from '../utils/spatialDebugUtils';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const initialState = {
  status: {
    loading: false,
    error: null,
    isInitialized: false,
    lastUpdated: null,
    cacheStats: {}
  },
  data: {
    timeSeriesData: [],
    marketClusters: [],
    flowAnalysis: [],
    spatialAutocorrelation: null,
    geoData: null,
    marketIntegration: null,
    seasonalAnalysis: [],
    metrics: null
  },
  ui: {
    selectedCommodity: null,
    selectedDate: null,
    selectedRegion: null,
    selectedAnalysis: null,
    selectedRegimes: [],
    visualizationMode: 'prices'
  },
  validation: {
    warnings: [],
    qualityMetrics: {},
    coverage: {}
  }
};

export const loadSpatialData = createAsyncThunk(
  'spatial/loadSpatialData',
  async ({ selectedCommodity, selectedDate }, { rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('load-spatial-data');
    spatialDebugUtils.log('Loading spatial data:', { selectedCommodity, selectedDate });

    try {
      const result = await spatialIntegrationSystem.loadAndProcessData(
        selectedCommodity,
        selectedDate,
        {
          seasonalAdjustment: true,
          conflictAdjustment: true
        }
      );

      metric.finish({ status: 'success' });
      return result;

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
    setSelectedCommodity(state, action) {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedDate(state, action) {
      state.ui.selectedDate = action.payload;
    },
    setSelectedRegion(state, action) {
      state.ui.selectedRegion = action.payload;
    },
    setSelectedAnalysis(state, action) {
      state.ui.selectedAnalysis = action.payload;
    },
    setSelectedRegimes(state, action) {
      state.ui.selectedRegimes = action.payload;
    },
    setVisualizationMode(state, action) {
      state.ui.visualizationMode = action.payload;
    },
    resetError(state) {
      state.status.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(loadSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.isInitialized = true;
        state.status.lastUpdated = new Date().toISOString();
        state.data = action.payload.data;
        state.validation = action.payload.validation;
        if (action.payload.metrics) {
          state.data.metrics = action.payload.metrics;
        }
        state.status.cacheStats = action.payload.metadata?.cacheStats || {};
      })
      .addCase(loadSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'An error occurred';
      });
  }
});

export const {
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegion,
  setSelectedAnalysis,
  setSelectedRegimes,
  setVisualizationMode,
  resetError
} = spatialSlice.actions;

// Selectors
export const selectSpatialState = state => state.spatial;
export const selectSpatialStatus = state => state.spatial.status;
export const selectSpatialData = state => state.spatial.data;
export const selectSpatialUI = state => state.spatial.ui;
export const selectSpatialValidation = state => state.spatial.validation;

export default spatialSlice.reducer;