// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { spatialDataManager } from '../utils/SpatialDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';

// Initial state
export const initialState = {
  data: {
    marketClusters: [], 
    detectedShocks: [], 
    timeSeriesData: [],
    analysisMetrics: {},
    geoData: null,
    flows: null,
    weights: null,
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
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
  },
  cache: {
    dataByCommodity: {},
    lastUpdate: null,
    version: '1.0',
  },
};

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { dispatch, getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    try {
      if (!selectedCommodity) {
        throw new Error('Commodity parameter is required');
      }

      const state = getState();
      const cachedData = state.spatial.cache.dataByCommodity[selectedCommodity];

      // If cached data exists, use it directly
      if (cachedData) {
        metric.finish({ status: 'success', source: 'cache' });
        return {
          ...cachedData,
          selectedCommodity,
          selectedDate: selectedDate || cachedData.uniqueMonths.slice(-1)[0] // Use latest date if none is provided
        };
      }

      // Set loading stage
      dispatch(setLoadingStage('Processing spatial data'));

      // Fetch and process data, ensuring selectedDate uses the latest date if undefined
      const result = await spatialDataManager.processSpatialData(
        selectedCommodity.toLowerCase(),
        selectedDate || '', // Allow empty, will handle in next step
        {
          onProgress: (progress) => dispatch(setProgress(progress)),
        }
      );

      if (!result || !result.geoData) {
        throw new Error('Invalid data structure returned from processing');
      }

      // Default to the latest date from uniqueMonths if selectedDate is still undefined
      const latestDate = result.uniqueMonths?.slice(-1)[0];
      const finalSelectedDate = selectedDate || latestDate;

      metric.finish({ status: 'success' });
      return {
        ...result,
        selectedCommodity,
        selectedDate: finalSelectedDate,
      };
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      backgroundMonitor.logError('spatial-data-fetch-failed', {
        error: error.message,
        selectedCommodity,
        selectedDate,
      });
      return rejectWithValue(error.message);
    }
  }
);

// Create the spatial slice
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
    // Add missing reducers
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
    },
    updateMarketClusters: (state, action) => {
      state.data.marketClusters = action.payload;
    },
    updateDetectedShocks: (state, action) => {
      state.data.detectedShocks = action.payload;
    },
    // If you have time series data and analysis metrics, include reducers for them
    setTimeSeriesData: (state, action) => {
      state.data.timeSeriesData = action.payload;
    },
    setAnalysisMetrics: (state, action) => {
      state.data.analysisMetrics = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        // Update state with fetched data
        state.data = {
          ...state.data,
          ...action.payload,
        };
        // Update UI state
        state.ui.selectedCommodity = action.payload.selectedCommodity;
        state.ui.selectedDate = action.payload.selectedDate;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
      });
  },
});

// Export action creators
export const {
  setProgress,
  setLoadingStage,
  setSelectedRegion,
  setView,
  setSelectedCommodity,
  setSelectedDate,
  updateMarketClusters,
  updateDetectedShocks,
  setTimeSeriesData,
  setAnalysisMetrics,
} = spatialSlice.actions;

// Define and export selectors
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

// Export the reducer
export default spatialSlice.reducer;
