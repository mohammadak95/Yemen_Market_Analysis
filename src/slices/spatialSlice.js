// Updated spatialSlice.js to integrate with consolidated systems and improve state management


import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem, backgroundMonitor } from '../utils/MonitoringSystem';

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
    monitoringSystem.log('Loading spatial data:', { selectedCommodity, selectedDate });

    try {
      const result = await unifiedDataManager.loadSpatialData(
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
      monitoringSystem.error('Error loading spatial data:', error);
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
