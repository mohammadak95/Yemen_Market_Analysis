// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { spatialDataManager } from '../utils/SpatialDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { 
  memoizedComputeClusters,
  detectMarketShocks,
  calculateSpatialWeights 
} from '../utils/spatialUtils';

// Initial state structure
const initialState = {
  data: {
    geoData: null,
    analysis: [],
    flows: [],
    weights: {},
    uniqueMonths: [],
    regimes: [],
    commodities: []
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    view: {
      center: [15.3694, 44.191],
      zoom: 6
    }
  },
  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: null
  },
  lastAction: null // Track last action for debugging
};

// Async thunk for fetching spatial data
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { dispatch, rejectWithValue }) => {
    let metric;
    try {
      // Start monitoring
      metric = backgroundMonitor.startMetric('spatial-data-fetch', {
        commodity: selectedCommodity,
        date: selectedDate
      });

      // Validate inputs
      if (!selectedCommodity || typeof selectedCommodity !== 'string') {
        console.warn('Commodity parameter missing or invalid.');
      }

      if (selectedDate && isNaN(new Date(selectedDate).getTime())) {
        throw new Error('Invalid date parameter');
      }

      // Process data
      const result = await spatialDataManager.processSpatialData(
        selectedCommodity?.toLowerCase() || '',
        selectedDate || ''
      );

      // Validate response
      if (!result || !result.geoData) {
        throw new Error('Invalid data structure returned from processing');
      }

      // Update progress and finish metric
      dispatch(setProgress(100));
      metric?.finish({ status: 'success' });

      // Update selected values if provided
      if (selectedCommodity) dispatch(setSelectedCommodity(selectedCommodity));
      if (selectedDate) dispatch(setSelectedDate(selectedDate));

      return result;
    } catch (error) {
      console.error('Error fetching spatial data:', error);
      
      // Finish metric with error
      metric?.finish({ 
        status: 'error', 
        error: error.message 
      });

      // Log error to background monitor
      backgroundMonitor.logError('spatial-data-fetch-failed', {
        commodity: selectedCommodity,
        date: selectedDate,
        error: error.message
      });

      // Return structured error
      return rejectWithValue({
        message: error.message,
        commodity: selectedCommodity,
        date: selectedDate
      });
    }
  }
);

// Create the slice with reducers and extra reducers
const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    setLoadingStage: (state, action) => {
      state.status.stage = action.payload;
      state.lastAction = `setLoadingStage: ${action.payload}`;
    },
    setProgress: (state, action) => {
      state.status.progress = action.payload;
      state.lastAction = `setProgress: ${action.payload}`;
    },
    setSelectedRegion: (state, action) => {
      state.ui.selectedRegion = action.payload;
      state.lastAction = `setSelectedRegion: ${action.payload}`;
    },
    setView: (state, action) => {
      state.ui.view = action.payload;
      state.lastAction = `setView: ${JSON.stringify(action.payload)}`;
    },
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
      state.lastAction = `setSelectedDate: ${action.payload}`;
    },
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
      state.lastAction = `setSelectedCommodity: ${action.payload}`;
    },
    setSelectedRegimes: (state, action) => {
      state.ui.selectedRegimes = action.payload;
      state.lastAction = `setSelectedRegimes: ${action.payload}`;
    },
    resetState: (state) => {
      Object.assign(state, initialState);
      state.lastAction = 'resetState';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.progress = 0;
        state.lastAction = 'fetchSpatialData.pending';
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.data = { ...state.data, ...action.payload };
        state.status.loading = false;
        state.status.error = null;
        state.status.progress = 100;
        state.lastAction = 'fetchSpatialData.fulfilled';
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
        state.lastAction = `fetchSpatialData.rejected: ${action.payload}`;
      });
  }
});

// Memoized selectors
export const selectSpatialData = createSelector(
  [state => state.spatial],
  (spatial) => ({
    geoData: spatial.data.geoData,
    analysis: spatial.data.analysis,
    flows: spatial.data.flows,
    weights: spatial.data.weights,
    uniqueMonths: spatial.data.uniqueMonths,
    regimes: spatial.data.regimes,
    commodities: spatial.data.commodities,
    status: spatial.status.loading ? 'loading' : spatial.status.error ? 'failed' : 'succeeded',
    error: spatial.status.error,
    loadingProgress: spatial.status.progress,
    selectedCommodity: spatial.ui.selectedCommodity,
    selectedDate: spatial.ui.selectedDate
  })
);

export const selectSpatialMetrics = createSelector(
  [
    state => state.spatial.data.geoData?.features || [],
    (_, selectedCommodity) => selectedCommodity,
    state => state.spatial.data.flows || []
  ],
  (features, selectedCommodity, flows) => {
    if (!features.length || !selectedCommodity) return null;

    const clusters = memoizedComputeClusters(flows, features);
    const shocks = detectMarketShocks(features, selectedCommodity);
    const weights = calculateSpatialWeights(features);

    return {
      clusters,
      shocks,
      weights,
      marketConnectivity: clusters.length > 0 ? 
        clusters.reduce((sum, c) => sum + c.connectedMarkets.size, 0) / clusters.length : 
        0
    };
  }
);

export const selectAnalysisData = createSelector(
  [state => state.spatial.data.analysis, (_, selectedCommodity) => selectedCommodity],
  (analysisData, selectedCommodity) => {
    if (!selectedCommodity || !analysisData) return null;
    return analysisData.find(a => 
      a.commodity === selectedCommodity && a.regime === 'unified'
    );
  }
);

export const selectFlowsForPeriod = createSelector(
  [
    state => state.spatial.data.flows,
    (_, selectedDate) => selectedDate,
    (_, __, selectedCommodity) => selectedCommodity
  ],
  (flows, selectedDate, selectedCommodity) => {
    if (!selectedDate || !selectedCommodity || !flows) return [];
    return flows.filter(flow =>
      flow.date?.startsWith(selectedDate) &&
      flow.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    );
  }
);

// Export actions
export const {
  setLoadingStage,
  setProgress,
  setSelectedRegion,
  setView,
  setSelectedDate,
  setSelectedCommodity,
  setSelectedRegimes,
  resetState
} = spatialSlice.actions;

// Export reducer
export default spatialSlice.reducer;