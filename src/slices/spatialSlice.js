// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { spatialSystem } from '../utils/SpatialSystem';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';

// Define memoized base selectors with proper structure
const selectSpatialRoot = state => state.spatial;

export const selectSpatialState = createSelector(
  [selectSpatialRoot],
  (spatial) => ({
    ui: spatial?.ui || {},
    data: spatial?.data || null,
    status: spatial?.status || {},
    validation: spatial?.validation || {},
  })
);

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

export const initializeSpatial = createAsyncThunk(
  'spatial/initialize',
  async (_, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('initialize-spatial');

    try {
      if (!unifiedDataManager._isInitialized) {
        await unifiedDataManager.init();
      }
      if (!spatialSystem._isInitialized) {
        await spatialSystem.initialize();
      }

      metric.finish({ status: 'success' });
      return true;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to initialize spatial system:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const loadSpatialData = createAsyncThunk(
  'spatial/loadSpatialData',
  async ({ commodity, date, options = {} }, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('load-spatial-data');

    try {
      const rawData = await unifiedDataManager.loadSpatialData(commodity, date, options);
      const processedData = await spatialSystem.processSpatialData(rawData);

      const transformedTimeSeries = await dataTransformationSystem.transformTimeSeriesStream(
        processedData.timeSeriesData,
        {
          applySeasonalAdj: options.seasonalAdjustment,
          applySmooth: options.smoothing,
          includePriceStability: true,
          includeConflict: true,
        }
      );

      const validationResult = await spatialSystem.validateData(processedData);

      const result = {
        data: {
          ...processedData,
          timeSeriesData: transformedTimeSeries,
        },
        validation: {
          warnings: validationResult.warnings || [],
          qualityMetrics: validationResult.details || {},
          coverage: validationResult.coverage || {},
          spatialDiagnostics: validationResult.spatialDiagnostics || null,
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

export const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
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
      state.ui.selectedRegimes = action.payload || [];
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
      .addCase('INIT_STATE', (state, action) => {
        if (action.payload?.spatial) {
          return {
            ...state,
            ...action.payload.spatial,
            status: {
              ...state.status,
              ...action.payload.spatial.status,
              isInitialized: true,
            },
          };
        }
        return state;
      })
      .addCase(initializeSpatial.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(initializeSpatial.fulfilled, (state) => {
        state.status.loading = false;
        state.status.isInitialized = true;
        state.status.lastUpdated = new Date().toISOString();
        state.status.cacheStats = unifiedDataManager.getCacheStats();
      })
      .addCase(initializeSpatial.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || action.error.message;
      })
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

// Memoized Selectors with proper dependency chains
export const selectSpatial = createSelector(
  [selectSpatialRoot],
  (spatial) => spatial
);

export const selectSpatialUI = createSelector(
  [selectSpatial],
  (spatial) => spatial?.ui || {}
);

export const selectSpatialData = createSelector(
  [selectSpatial],
  (spatial) => spatial?.data || {}
);

export const selectSpatialValidation = createSelector(
  [selectSpatial],
  (spatial) => spatial?.validation || {}
);

export const selectSpatialStatus = createSelector(
  [selectSpatial],
  (spatial) => spatial?.status || {}
);

// UI Selectors with proper nullchecking
export const selectSelectedCommodity = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedCommodity || null
);

export const selectSelectedDate = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedDate || null
);

export const selectSelectedRegion = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedRegion || null
);

export const selectSelectedAnalysis = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedAnalysis || null
);

export const selectSelectedRegimes = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedRegimes || []
);

export const selectVisualizationMode = createSelector(
  [selectSpatialUI],
  (ui) => ui.visualizationMode || 'prices'
);

export const selectFilters = createSelector(
  [selectSpatialUI],
  (ui) => ui.filters || {}
);

// Data Selectors with proper null checking
export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => data.timeSeriesData || []
);

export const selectMarketClusters = createSelector(
  [selectSpatialData],
  (data) => data.marketClusters || []
);

export const selectFlowAnalysis = createSelector(
  [selectSpatialData],
  (data) => data.flowAnalysis || []
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => data.spatialAutocorrelation || null
);

// Complex derived selectors
export const selectMarketMetrics = createSelector(
  [selectTimeSeriesData, selectMarketClusters, selectFlowAnalysis],
  (timeSeriesData, marketClusters, flowAnalysis) => {
    return {
      totalMarkets: marketClusters.length,
      activeFlows: flowAnalysis.length,
      timeSeriesLength: timeSeriesData.length,
      lastUpdate: timeSeriesData[timeSeriesData.length - 1]?.date || null
    };
  }
);

export default spatialSlice.reducer;