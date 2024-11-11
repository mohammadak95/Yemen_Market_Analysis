// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { spatialDataManager } from '../utils/SpatialDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';

// Initial state
export const initialState = {
  data: {
    geoData: null,
    flows: [],
    weights: {},
    uniqueMonths: [],
    regimes: [],
    commodities: [],
    flowMaps: [],
    marketClusters: [],
    detectedShocks: [],
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
    lastUpdate: null,
    version: '1.0',
  },
};

// Async thunk for fetching spatial data
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (params, { dispatch, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');

    try {
      // Extract parameters
      const selectedCommodity = params?.selectedCommodity;
      const selectedDate = params?.selectedDate;

      if (!selectedCommodity) {
        throw new Error('Commodity parameter is required');
      }

      // Update loading stage
      dispatch(setLoadingStage('Processing spatial data'));

      // Process data with progress tracking
      const result = await spatialDataManager.processSpatialData(
        selectedCommodity.toLowerCase(),
        selectedDate || '',
        {
          onProgress: (progress) => dispatch(setProgress(progress)),
        }
      );

      if (!result || !result.geoData) {
        throw new Error('Invalid data structure returned from processing');
      }

      // Prepare enhanced result
      const enhancedResult = {
        ...result,
        uniqueMonths: Array.from(
          new Set(
            result.geoData.features
              .map((f) => f.properties?.date?.substring(0, 7))
              .filter(Boolean)
          )
        ).sort(),
        regimes: Array.from(
          new Set(result.geoData.features.map((f) => f.properties?.regime).filter(Boolean))
        ),
        commodities: Array.from(
          new Set(result.geoData.features.map((f) => f.properties?.commodity).filter(Boolean))
        ).sort(),
        selectedCommodity,
        selectedDate,
      };

      metric.finish({ status: 'success' });
      return enhancedResult;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      backgroundMonitor.logError('spatial-data-fetch-failed', {
        error: error.message,
        params,
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
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
    },
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedRegimes: (state, action) => {
      state.ui.selectedRegimes = action.payload;
    },
    updateMarketClusters: (state, action) => {
      state.data.marketClusters = action.payload;
    },
    updateDetectedShocks: (state, action) => {
      state.data.detectedShocks = action.payload;
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.progress = 0;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        const payload = action.payload;

        state.data = {
          geoData: payload.geoData || null,
          flows: payload.flows || [],
          weights: payload.weights || {},
          uniqueMonths: payload.uniqueMonths || [],
          regimes: payload.regimes || [],
          commodities: payload.commodities || [],
          flowMaps: payload.flowMaps || [],
          marketClusters: payload.marketClusters || [],
          detectedShocks: payload.detectedShocks || [],
        };

        state.ui.selectedCommodity = payload.selectedCommodity || '';
        state.ui.selectedDate = payload.selectedDate || '';

        state.status.loading = false;
        state.status.error = null;
        state.status.progress = 100;
        state.cache.lastUpdate = Date.now();
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
      });
  },
});

// Actions
export const {
  setProgress,
  setLoadingStage,
  setSelectedRegion,
  setView,
  setSelectedDate,
  setSelectedCommodity,
  setSelectedRegimes,
  updateMarketClusters,
  updateDetectedShocks,
  resetState,
} = spatialSlice.actions;

// Selectors
export const selectSpatialState = (state) => state.spatial;

export const selectSpatialData = createSelector(
  [selectSpatialState],
  (spatial) => spatial.data
);

export const selectUIState = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui
);

export const selectStatusState = createSelector(
  [selectSpatialState],
  (spatial) => spatial.status
);

export const selectCacheState = createSelector(
  [selectSpatialState],
  (spatial) => spatial.cache
);

export const selectTimeSeriesData = createSelector(
  [selectSpatialState],
  (spatial) => {
    if (!spatial.data.geoData?.features) return [];

    return spatial.data.geoData.features
      .filter(feature => 
        feature.properties.commodity === spatial.ui.selectedCommodity
      )
      .map(feature => ({
        date: feature.properties.date,
        price: feature.properties.price,
        usdPrice: feature.properties.usdprice,
        conflictIntensity: feature.properties.conflict_intensity,
        region: feature.properties.region_id
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
);

export const selectAnalysisMetrics = createSelector(
  [selectSpatialState],
  (spatial) => {
    const { marketClusters, detectedShocks, weights } = spatial.data;
    
    return {
      clusterCount: marketClusters.length,
      shockCount: detectedShocks.length,
      marketCoverage: weights ? Object.keys(weights).length : 0,
      integrationScore: marketClusters.reduce(
        (sum, cluster) => sum + (cluster.totalFlow || 0), 
        0
      ) / (marketClusters.length || 1),
      transmissionEfficiency: spatial.analysis?.transmissionEfficiency || 0,
      priceConvergence: spatial.analysis?.priceConvergence || 0,
      adj_r_squared: spatial.analysis?.adj_r_squared || 0,
    };
  }
);

export const selectSpatialViewData = createSelector(
  [selectSpatialState],
  (spatial) => ({
    geoData: spatial.data.geoData,
    flowMaps: spatial.data.flowMaps,
    flows: spatial.data.flows,
    weights: spatial.data.weights,
    uniqueMonths: spatial.data.uniqueMonths,
    commodities: spatial.data.commodities,
    regimes: spatial.data.regimes,
    marketClusters: spatial.data.marketClusters,
    detectedShocks: spatial.data.detectedShocks,
    status: spatial.status,
    ui: {
      selectedCommodity: spatial.ui.selectedCommodity,
      selectedDate: spatial.ui.selectedDate,
      selectedRegion: spatial.ui.selectedRegion,
      view: spatial.ui.view
    }
  })
);

// Export the reducer
export default spatialSlice.reducer;
