// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { fetchGeometries } from './geometriesSlice';

export const initialState = {
  data: {
    geoData: null, // GeoJSON data
    marketClusters: [], // Market cluster information
    detectedShocks: [], // Market shocks data
    timeSeriesData: [], // Time series price data
    flowMaps: [], // Flow mapping data
    analysisMetrics: {
      marketEfficiency: {
        integrationScore: 0,
        coverageRatio: 0,
        flowDensity: 0
      },
      priceAnalysis: {
        volatilityIndex: 0,
        trendStrength: 0,
        priceStability: 0
      }
    },
    spatialAutocorrelation: null, // Moran's I and related stats
    flowAnalysis: [], // Flow analysis results
    metadata: null, // Analysis metadata
    uniqueMonths: [] // Available time periods
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    visualizationMode: 'prices', // 'prices', 'flows', 'clusters', 'shocks'
    layerVisibility: {
      flows: true,
      clusters: true,
      shocks: true,
      heatmap: true
    },
    view: {
      center: [15.3694, 44.191], // Yemen's approximate center
      zoom: 6,
    },
  },
  status: {
    loading: false,
    error: null,
    isInitialized: false, 
    progress: 0,
    stage: null,
    lastUpdated: null
  }
};

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { dispatch, getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');

    try {
      if (!selectedCommodity) {
        throw new Error('Commodity parameter is required');
      }

      // Ensure geometries are loaded first
      const state = getState();
      let geometries = state.geometries.data;

      if (!geometries) {
        const geometriesResult = await dispatch(fetchGeometries()).unwrap();
        if (!geometriesResult) {
          throw new Error('Failed to load geometries');
        }
        geometries = geometriesResult;
      }

      // Process spatial data
      const result = await precomputedDataManager.processSpatialData(
        selectedCommodity,
        selectedDate,
        { geometries }
      );

      // Extract unique months if not provided in the result
      const uniqueMonths = Array.isArray(result.timeSeriesData) 
        ? [...new Set(result.timeSeriesData.map(d => d.month))].sort()
        : [];

      const effectiveDate = selectedDate || uniqueMonths[uniqueMonths.length - 1];

      metric.finish({ status: 'success' });

      // Ensure we return all required data
      return {
        ...result,
        uniqueMonths,
        selectedCommodity,
        selectedDate: effectiveDate,
        isLoaded: true // Add this flag to track initial load
      };

    } catch (error) {
      console.error('Error in fetchSpatialData:', error);
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

const spatialSlice = createSlice({
  name: 'spatial',
  initialState: {
    data: {
      geoData: null,
      marketClusters: [],
      detectedShocks: [],
      timeSeriesData: [],
      flowMaps: [],
      analysisMetrics: {
        marketEfficiency: {
          integrationScore: 0,
          coverageRatio: 0,
          flowDensity: 0
        },
        priceAnalysis: {
          volatilityIndex: 0,
          trendStrength: 0,
          priceStability: 0
        }
      },
      spatialAutocorrelation: null,
      metadata: null,
      uniqueMonths: []
    },
    ui: {
      selectedCommodity: '',
      selectedDate: '',
      selectedRegimes: ['unified'],
      selectedRegion: null,
      visualizationMode: 'prices',
      layerVisibility: {
        flows: true,
        clusters: true,
        shocks: true,
        heatmap: true
      },
      view: {
        center: [15.3694, 44.191],
        zoom: 6,
      },
    },
    status: {
      loading: false,
      error: null,
      progress: 0,
      stage: null,
      lastUpdated: null,
      isInitialized: false // Add initialization flag
    }
  },
  reducers: {
    // ... existing reducers ...
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.progress = 0;
        state.status.stage = 'Loading data...';
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.error = null;
        state.status.progress = 100;
        state.status.stage = null;
        state.status.lastUpdated = new Date().toISOString();
        state.status.isInitialized = true;
        
        // Update data state
        state.data = {
          ...action.payload,
          analysisMetrics: {
            marketEfficiency: action.payload.market_efficiency || state.data.analysisMetrics.marketEfficiency,
            priceAnalysis: action.payload.price_analysis || state.data.analysisMetrics.priceAnalysis
          }
        };
        
        // Update UI state
        state.ui.selectedCommodity = action.payload.selectedCommodity;
        state.ui.selectedDate = action.payload.selectedDate;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
        state.status.stage = null;
        state.status.isInitialized = false;
      });
  }
});

// Selectors
export const selectSpatialData = state => state.spatial.data;
export const selectUIState = state => state.spatial.ui;
export const selectStatusState = state => state.spatial.status;

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

export const selectVisualizationState = createSelector(
  [selectUIState],
  ui => ({
    mode: ui.visualizationMode,
    layerVisibility: ui.layerVisibility
  })
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


export const {
  setProgress,
  setLoadingStage,
  setSelectedRegion,
  setVisualizationMode,
  toggleLayerVisibility,
  setView,
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegimes,
  resetState
} = spatialSlice.actions;

export default spatialSlice.reducer;