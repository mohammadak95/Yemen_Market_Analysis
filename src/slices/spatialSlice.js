// spatialSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { processRegressionData } from '../utils/dataProcessingUtils';
import { DEFAULT_REGRESSION_DATA } from '../types/dataTypes';


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
    regressionAnalysis: DEFAULT_REGRESSION_DATA
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

export const fetchRegressionAnalysis = createAsyncThunk(
  'spatial/fetchRegressionAnalysis',
  async ({ selectedCommodity }, { rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('regression-analysis-fetch');

    try {
      const paths = ['spatial_analysis_results.json'];
      const data = await fetchDataFromPaths(paths);
      const processedData = processRegressionData(data, selectedCommodity);
      
      if (!processedData) {
        throw new Error(`No regression data found for commodity: ${selectedCommodity}`);
      }

      metric.finish({ status: 'success', commodity: selectedCommodity });
      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message, commodity: selectedCommodity });
      return rejectWithValue({
        message: error.message,
        commodity: selectedCommodity,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Helper function for fetching data
const fetchDataFromPaths = async (paths) => {
  for (const filepath of paths) {
    try {
      const response = await fetch(getDataPath(filepath));
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn(`Failed to load from ${filepath}:`, e);
    }
  }
  throw new Error('Failed to load data from any path');
};

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
    clearRegressionAnalysis: (state) => {
      state.data.regressionAnalysis = initialState.data.regressionAnalysis;
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
      })
      .addCase(fetchRegressionAnalysis.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchRegressionAnalysis.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.error = null;
        state.data.regressionAnalysis = action.payload;
      })
      .addCase(fetchRegressionAnalysis.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = {
          message: action.payload?.message || 'Failed to fetch regression analysis',
          commodity: action.payload?.commodity,
          timestamp: action.payload?.timestamp
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
  clearRegressionAnalysis
} = spatialSlice.actions;

// Basic selectors - these should come first
export const selectSpatialData = (state) => state.spatial.data;
export const selectUIState = (state) => state.spatial.ui;
export const selectStatusState = (state) => state.spatial.status;

// UI selectors
export const selectSelectedRegion = createSelector(
  [selectUIState],
  (ui) => ui.selectedRegion
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

// Status selectors
export const selectIsLoading = createSelector(
  [selectStatusState],
  (status) => status.loading
);

export const selectError = createSelector(
  [selectStatusState],
  (status) => status.error
);

// Data selectors
export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => data.timeSeriesData || []
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

// Analysis related selectors
export const selectRegressionAnalysis = createSelector(
  [selectSpatialData],
  (data) => data.regressionAnalysis
);

export const selectRegressionModel = createSelector(
  [selectRegressionAnalysis],
  (regression) => regression?.model || null
);

export const selectRegressionResiduals = createSelector(
  [selectRegressionAnalysis],
  (regression) => regression?.residuals || null
);

export const selectSpatialRegression = createSelector(
  [selectRegressionAnalysis],
  (regression) => regression?.spatial || null
);

// Combined selectors - these should come last since they depend on other selectors
export const selectResidualsByRegion = createSelector(
  [selectRegressionResiduals, selectSelectedRegion],
  (residuals, selectedRegion) => {
    if (!residuals?.raw || !selectedRegion) return [];
    return residuals.raw.filter(r => r.region_id === selectedRegion);
  }
);

export const selectDetailedError = createSelector(
  [selectStatusState],
  (status) => status.error ? {
    message: status.error.message,
    commodity: status.error.commodity,
    date: status.error.date,
    timestamp: status.error.timestamp
  } : null
);

// Debug selector - should be last as it depends on multiple other selectors
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