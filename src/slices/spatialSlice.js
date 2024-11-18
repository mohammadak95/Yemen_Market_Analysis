// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { spatialSystem } from '../utils/SpatialSystem';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';

// Utility function for normalization (if needed)
const normalizeCommodityId = (value) => {
  return value?.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_');
};

// Define base selectors
const selectSpatialRoot = (state) => state.spatial;

export const selectSpatialState = createSelector(
  [selectSpatialRoot],
  (spatial) => ({
    ui: spatial?.ui || {},
    data: spatial?.data || {},
    status: spatial?.status || {},
    validation: spatial?.validation || {},
  })
);

// Initial state with 'regimes' initialized
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
    regimes: [], // Initialized to prevent null reference
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

// Async thunk to initialize spatial systems
export const initializeSpatial = createAsyncThunk(
  'spatial/initialize',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('initialize-spatial');
    
    try {
      // Get selected commodity from state
      const state = getState();
      const defaultCommodity = state.commodities.commodities[0]?.id;
      
      if (!defaultCommodity) {
        throw new Error('No commodities available');
      }

      // Initialize systems if needed
      if (!unifiedDataManager._isInitialized) {
        await unifiedDataManager.init();
      }
      if (!spatialSystem._isInitialized) {
        await spatialSystem.initialize();
      }

      // Load initial spatial data
      const rawData = await unifiedDataManager.loadSpatialData(
        defaultCommodity,
        null,
        { validateData: true }
      );

      // Process the data
      const processedData = await spatialSystem.processSpatialData(rawData);

      // Transform time series data
      const transformedTimeSeries = await dataTransformationSystem.transformTimeSeriesStream(
        processedData.timeSeriesData,
        {
          applySeasonalAdj: false,
          applySmooth: true,
          includePriceStability: true,
          includeConflict: true,
        }
      );

      // Get validation results
      const validationResult = await spatialSystem.validateData(processedData);

      // Set selected commodity
      dispatch(setSelectedCommodity(defaultCommodity));

      const result = {
        data: {
          ...processedData,
          timeSeriesData: transformedTimeSeries,
          regimes: processedData.regimes || [],
        },
        validation: {
          warnings: validationResult.warnings || [],
          qualityMetrics: validationResult.details || {},
          coverage: validationResult.coverage || {},
          spatialDiagnostics: validationResult.spatialDiagnostics || null,
        },
        metadata: {
          processedAt: new Date().toISOString(),
          commodity: defaultCommodity,
          options: { validateData: true }
        },
        selectedCommodity: defaultCommodity
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to load spatial data
export const loadSpatialData = createAsyncThunk(
  'spatial/loadSpatialData',
  async ({ commodity, date, options = {} }, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('load-spatial-data');

    try {
      // Optionally normalize commodity ID if needed
      // const normalizedCommodity = normalizeCommodityId(commodity);

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
          // Ensure regimes are included; use existing if already present
          regimes: processedData.regimes || [],
        },
        validation: {
          warnings: validationResult.warnings || [],
          qualityMetrics: validationResult.details || {},
          coverage: validationResult.coverage || {},
          spatialDiagnostics: validationResult.spatialDiagnostics || null,
        },
        metadata: {
          processedAt: new Date().toISOString(),
          commodity, // Store as received (assumed normalized)
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
      .addCase(initializeSpatial.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.isInitialized = false;
      })
      .addCase(initializeSpatial.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.isInitialized = true;
        state.status.lastUpdated = new Date().toISOString();
        state.status.cacheStats = unifiedDataManager.getCacheStats();
        
        // Update data with proper merging
        state.data = {
          ...state.data,
          ...action.payload.data,
          regimes: action.payload.data.regimes || [],
        };
        
        // Update validation
        state.validation = action.payload.validation;
        
        // Update UI state
        state.ui = {
          ...state.ui,
          selectedCommodity: action.payload.selectedCommodity,
          selectedRegimes: [], // Reset selected regimes
        };
      })
      .addCase(initializeSpatial.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || action.error.message;
        state.status.isInitialized = false;
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

        // Merge new data with proper handling of regimes
        state.data = {
          ...state.data,
          ...action.payload.data,
          regimes: action.payload.data.regimes || state.data.regimes,
        };

        // Update validation
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

// UI Selectors with proper null checking
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
      lastUpdate: timeSeriesData[timeSeriesData.length - 1]?.date || null,
    };
  }
);

export default spatialSlice.reducer;