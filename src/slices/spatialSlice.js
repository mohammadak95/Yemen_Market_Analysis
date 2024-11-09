// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { spatialDataManager } from '../utils/SpatialDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { 
  memoizedComputeClusters,
  detectMarketShocks,
  calculateSpatialWeights 
} from '../utils/spatialUtils';

const initialState = {
  data: {
    geoData: null,
    analysis: [],
    flows: [],
    weights: {},
    uniqueMonths: [],
    regimes: [],
    commodities: [],
    flowMaps: []
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
  lastAction: null
};

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (params, { dispatch, rejectWithValue, getState }) => {
    let metric;
    try {
      // Handle both string and object parameters
      const selectedCommodity = typeof params === 'string' ? params : params?.selectedCommodity;
      const selectedDate = params?.selectedDate;

      metric = backgroundMonitor.startMetric('spatial-data-fetch', {
        commodity: selectedCommodity,
        date: selectedDate
      });

      if (!selectedCommodity) {
        throw new Error('Commodity parameter is required');
      }

      // Get current state
      const state = getState();
      const currentData = state.spatial.data;

      // Process data with loading stages
      dispatch(setLoadingStage('Processing spatial data'));
      const processMetric = backgroundMonitor.startMetric('process-spatial-data');

      const result = await spatialDataManager.processSpatialData(
        selectedCommodity.toLowerCase(),
        selectedDate || '',
        {
          previousData: currentData,
          onProgress: (progress) => dispatch(setProgress(progress))
        }
      );

      processMetric.finish({ 
        status: 'success',
        source: result.fromCache ? 'cache' : 'processed'
      });

      // Validate response structure
      if (!result || !result.geoData) {
        throw new Error('Invalid data structure returned from processing');
      }

      // Process additional data
      dispatch(setLoadingStage('Computing market metrics'));
      
      const enhancedResult = {
        ...result,
        flowMaps: result.flows || [],
        analysis: result.analysis || [],
        weights: result.weights || {},
        uniqueMonths: Array.from(new Set(
          result.geoData.features
            .map(f => f.properties?.date?.substring(0, 7))
            .filter(Boolean)
        )).sort(),
        regimes: Array.from(new Set(
          result.geoData.features
            .map(f => f.properties?.regime)
            .filter(Boolean)
        )),
        commodities: Array.from(new Set(
          result.geoData.features
            .map(f => f.properties?.commodity)
            .filter(Boolean)
        )).sort(),
        selectedCommodity,
        selectedDate
      };

      // Update progress and finish metric
      dispatch(setProgress(100));
      metric?.finish({ 
        status: 'success',
        commodity: selectedCommodity,
        date: selectedDate
      });

      return enhancedResult;

    } catch (error) {
      console.error('Error fetching spatial data:', error);
      
      metric?.finish({ 
        status: 'error', 
        error: error.message,
        commodity: params?.selectedCommodity,
        date: params?.selectedDate
      });

      backgroundMonitor.logError('spatial-data-fetch-failed', {
        error: error.message,
        commodity: params?.selectedCommodity,
        date: params?.selectedDate
      });

      return rejectWithValue({
        message: error.message,
        commodity: params?.selectedCommodity,
        date: params?.selectedDate
      });
    }
  }
);

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
        if (action.payload) {
          // Update data state while preserving structure
          state.data = {
            geoData: action.payload.geoData || null,
            analysis: action.payload.analysis || [],
            flows: action.payload.flows || [],
            weights: action.payload.weights || {},
            uniqueMonths: action.payload.uniqueMonths || [],
            regimes: action.payload.regimes || [],
            commodities: action.payload.commodities || [],
            flowMaps: action.payload.flowMaps || []
          };

          // Update UI state
          if (action.payload.selectedCommodity) {
            state.ui.selectedCommodity = action.payload.selectedCommodity;
          }
          if (action.payload.selectedDate) {
            state.ui.selectedDate = action.payload.selectedDate;
          }
          
          // If no date is selected but we have months, select the first one
          if (!state.ui.selectedDate && action.payload.uniqueMonths?.length > 0) {
            state.ui.selectedDate = action.payload.uniqueMonths[0];
          }
        }
        state.status.loading = false;
        state.status.error = null;
        state.status.progress = 100;
        state.lastAction = 'fetchSpatialData.fulfilled';
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
        state.lastAction = `fetchSpatialData.rejected: ${JSON.stringify(action.payload)}`;
        // Preserve existing data on error
        if (!state.data.geoData) {
          state.data = { ...initialState.data };
        }
      });
  }
});

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
    flowMaps: spatial.data.flowMaps,
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

export default spatialSlice.reducer;