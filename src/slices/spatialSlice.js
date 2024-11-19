// spatialSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor } from '../utils/backgroundMonitor';

// Define initial state
export const initialState = {
  data: {
    timeSeriesData: [],
    marketClusters: [],
    detectedShocks: [],
    flowMaps: [],
    geoJSON: null,
    metadata: null,
    uniqueMonths: [],
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
};

// Create async thunk for fetching spatial data
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { rejectWithValue, dispatch }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    dispatch(setLoadingStage('initializing'));

    try {
      if (!selectedCommodity) {
        throw new Error('Commodity parameter is required');
      }

      dispatch(setLoadingStage('fetching'));
      const data = await spatialHandler.getSpatialData(selectedCommodity, selectedDate);

      if (!data || !data.timeSeriesData) {
        throw new Error('Invalid data structure returned from spatial handler');
      }

      // Extract and validate unique months
      const uniqueMonths = data.timeSeriesData
        ? [...new Set(data.timeSeriesData.map(d => d.month))]
            .filter(Boolean)
            .sort()
        : [];

      dispatch(setLoadingStage('complete'));
      metric.finish({
        status: 'success',
        dataSize: JSON.stringify(data).length,
        commodity: selectedCommodity,
        monthsCount: uniqueMonths.length
      });

      return {
        ...data,
        uniqueMonths,
        selectedCommodity,
        selectedDate: selectedDate || uniqueMonths[uniqueMonths.length - 1]
      };

    } catch (error) {
      dispatch(setLoadingStage('error'));
      metric.finish({ 
        status: 'error', 
        error: error.message,
        commodity: selectedCommodity 
      });

      return rejectWithValue({
        message: error.message,
        commodity: selectedCommodity,
        date: selectedDate,
        timestamp: new Date().toISOString()
      });
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.progress = 0;
        state.status.stage = 'pending';
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.error = null;
        state.status.progress = 100;
        state.status.stage = 'complete';
        
        if (action.payload && typeof action.payload === 'object') {
          state.data = action.payload;
          if (action.payload.selectedCommodity) {
            state.ui.selectedCommodity = action.payload.selectedCommodity;
          }
          if (action.payload.selectedDate) {
            state.ui.selectedDate = action.payload.selectedDate;
          }
        }
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.stage = 'error';
        state.status.progress = 0;
        
        state.status.error = {
          message: action.payload?.message || 'Unknown error',
          commodity: action.payload?.commodity,
          date: action.payload?.date,
          timestamp: action.payload?.timestamp || new Date().toISOString()
        };
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
  resetState,
} = spatialSlice.actions;

// Basic selectors
export const selectSpatialData = (state) => state.spatial.data;
export const selectUIState = (state) => state.spatial.ui;
export const selectStatusState = (state) => state.spatial.status;

// Memoized selectors
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

export const selectFlowMaps = createSelector(
  [selectSpatialData],
  (data) => data.flowMaps || []
);

export const selectGeoData = createSelector(
  [selectSpatialData],
  (data) => data.geoData || null
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => data.spatialAutocorrelation || null
);

export const selectUniqueMonths = createSelector(
  [selectSpatialData],
  (data) => data.uniqueMonths || []
);

export const selectSelectedCommodity = createSelector(
  [selectUIState],
  (ui) => ui.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectUIState],
  (ui) => ui.selectedDate
);

export const selectSelectedRegimes = createSelector(
  [selectUIState],
  (ui) => ui.selectedRegimes
);

export const selectView = createSelector(
  [selectUIState],
  (ui) => ui.view
);

export const selectIsLoading = createSelector(
  [selectStatusState],
  (status) => status.loading
);

export const selectError = createSelector(
  [selectStatusState],
  (status) => status.error
);

// Enhanced error selector
export const selectDetailedError = createSelector(
  [selectStatusState],
  (status) => status.error ? {
    message: status.error.message,
    commodity: status.error.commodity,
    date: status.error.date,
    timestamp: status.error.timestamp
  } : null
);

// Debug selector
export const selectDebugState = createSelector(
  [selectSpatialData, selectUIState, selectStatusState],
  (data, ui, status) => ({
    data: {
      hasTimeSeriesData: Array.isArray(data.timeSeriesData),
      timeSeriesCount: data.timeSeriesData?.length || 0,
      hasMarketClusters: Array.isArray(data.marketClusters),
      clusterCount: data.marketClusters?.length || 0,
      hasFlowMaps: Array.isArray(data.flowMaps),
      flowCount: data.flowMaps?.length || 0,
      hasGeoJSON: !!data.geoJSON,
      uniqueMonthsCount: data.uniqueMonths?.length || 0,
    },
    ui: {
      selectedCommodity: ui.selectedCommodity,
      selectedDate: ui.selectedDate,
      hasSelectedRegion: !!ui.selectedRegion,
      viewSettings: ui.view,
    },
    status: {
      isLoading: status.loading,
      stage: status.stage,
      error: status.error,
      progress: status.progress,
    },
  })
);

export default spatialSlice.reducer;