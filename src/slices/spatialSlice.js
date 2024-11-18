// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { spatialSystem } from '../utils/SpatialSystem';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';

// Selector to access the spatial slice state
export const selectSpatialState = createSelector(
  [(state) => state.spatial],
  (spatial) => ({
    ui: spatial.ui,
    data: spatial.data,
    status: spatial.status,
    validation: spatial.validation,
  })
);

// Define the initial state
const initialState = {
  status: {
    loading: false,
    error: null,
    isInitialized: false,
    lastUpdated: null,
    cacheStats: null,
  },
  data: {
    timeSeriesData: [],
    marketClusters: [],
    flowAnalysis: [],
    spatialAutocorrelation: null,
    seasonalAnalysis: [],
    marketIntegration: null,
    tvmii: null,
    priceDifferentials: null,
    ecm: null,
    enhancedSpatial: null,
    metadata: null,
  },
  ui: {
    selectedCommodity: null,
    selectedDate: null,
    selectedRegion: null,
    selectedAnalysis: null,
    selectedRegimes: [],
    visualizationMode: 'prices',
    filters: {
      showConflict: true,
      showSeasonality: true,
      flowThreshold: 0.1,
    },
  },
  validation: {
    warnings: [],
    qualityMetrics: {},
    coverage: {},
    spatialDiagnostics: null,
  },
};

// Async thunk to load spatial data
export const loadSpatialData = createAsyncThunk(
  'spatial/loadSpatialData',
  async ({ commodity, date, options = {} }, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('load-spatial-data');

    try {
      // Initialize core systems if needed
      if (!unifiedDataManager._isInitialized) {
        await unifiedDataManager.init();
      }
      if (!spatialSystem._isInitialized) {
        await spatialSystem.initialize();
      }

      // Load data using UnifiedDataManager
      const rawData = await unifiedDataManager.loadSpatialData(commodity, date, options);

      // Process the data using SpatialSystem
      const processedData = await spatialSystem.processSpatialData(rawData);

      // Transform time series data
      const transformedTimeSeries = await dataTransformationSystem.transformTimeSeriesStream(
        processedData.timeSeriesData,
        {
          applySeasonalAdj: options.seasonalAdjustment,
          applySmooth: options.smoothing,
          includePriceStability: true,
          includeConflict: true,
        }
      );

      // Validate the processed data
      const validationResult = await spatialSystem.validateData(processedData);

      const result = {
        data: {
          ...processedData,
          timeSeriesData: transformedTimeSeries,
        },
        validation: {
          warnings: validationResult.warnings,
          qualityMetrics: validationResult.details,
          coverage: validationResult.coverage,
          spatialDiagnostics: validationResult.spatialDiagnostics,
        },
        metadata: {
          processedAt: new Date().toISOString(),
          commodity,
          date,
          options,
        },
      };

      metric.finish({ status: 'success' });
      return result;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to load spatial data:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Create the slice using the single initialState
export const spatialSlice = createSlice({
  name: 'spatial',
  initialState, // Reference the initialState constant
  reducers: {
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
    },
    setSelectedRegion: (state, action) => {
      state.ui.selectedRegion = action.payload;
    },
    setSelectedAnalysis: (state, action) => {
      state.ui.selectedAnalysis = action.payload;
    },
    setSelectedRegimes: (state, action) => {
      state.ui.selectedRegimes = action.payload;
    },
    setVisualizationMode: (state, action) => {
      state.ui.visualizationMode = action.payload;
    },
    updateFilters: (state, action) => {
      state.ui.filters = { ...state.ui.filters, ...action.payload };
    },
    clearError: (state) => {
      state.status.error = null;
    },
    resetState: () => initialState,
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
        state.status.cacheStats = unifiedDataManager.getCacheStats();
        state.data = action.payload.data;
        state.validation = action.payload.validation;
      })
      .addCase(loadSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'Failed to load spatial data';
      });
  },
});

// Export actions
export const {
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegion,
  setSelectedAnalysis,
  setSelectedRegimes,
  setVisualizationMode,
  updateFilters,
  clearError,
  resetState,
} = spatialSlice.actions;

// Memoized Selectors

// Select the entire spatial state
export const selectSpatial = createSelector(
  [(state) => state.spatial],
  (spatial) => spatial
);

// Select UI state
export const selectSpatialUI = createSelector(
  [selectSpatial],
  (spatial) => spatial.ui
);

// Select Data state
export const selectSpatialData = createSelector(
  [selectSpatial],
  (spatial) => spatial.data
);

// Select Validation state
export const selectSpatialValidation = createSelector(
  [selectSpatial],
  (spatial) => spatial.validation
);

// Select Status state
export const selectSpatialStatus = createSelector(
  [selectSpatial],
  (spatial) => spatial.status
);

// Specific UI Selectors
export const selectSelectedCommodity = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedDate
);

export const selectSelectedRegion = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedRegion
);

export const selectSelectedAnalysis = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedAnalysis
);

export const selectSelectedRegimes = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedRegimes
);

export const selectVisualizationMode = createSelector(
  [selectSpatialUI],
  (ui) => ui.visualizationMode
);

export const selectFilters = createSelector(
  [selectSpatialUI],
  (ui) => ui.filters
);

// Specific Data Selectors
export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => data.timeSeriesData
);

export const selectMarketClusters = createSelector(
  [selectSpatialData],
  (data) => data.marketClusters
);

export const selectFlowAnalysis = createSelector(
  [selectSpatialData],
  (data) => data.flowAnalysis
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => data.spatialAutocorrelation
);

// Export the reducer
export default spatialSlice.reducer;