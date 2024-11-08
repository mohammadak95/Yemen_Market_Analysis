// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataUtils';
import { workerManager, WorkerMessageTypes } from '../workers/enhancedWorkerSystem';
import { backgroundMonitor } from '../utils/backgroundMonitor';

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
  }
};

const processFlowData = (flowsResponse) => {
  try {
    if (!flowsResponse) return [];

    const flowsData = Papa.parse(flowsResponse, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transform: (value) => value?.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
      }
    });

    return flowsData.data.filter(flow =>
      flow && flow.source && flow.target &&
      !isNaN(parseFloat(flow.flow_weight))
    );
  } catch (error) {
    console.error('Error processing flow data:', error);
    return [];
  }
};

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (_, { dispatch, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');

    try {
      dispatch(setLoadingStage('Fetching spatial data'));
      dispatch(setProgress(0));

      const [geoResponse, weightsResponse, analysisResponse, flowsResponse] = await Promise.all([
        fetch(getDataPath('unified_data.geojson')),
        fetch(getDataPath('spatial_weights/transformed_spatial_weights.json')),
        fetch(getDataPath('spatial_analysis_results.json')),
        fetch(getDataPath('network_data/time_varying_flows.csv'))
      ]);

      if (!geoResponse.ok || !weightsResponse.ok || !analysisResponse.ok || !flowsResponse.ok) {
        throw new Error('One or more data fetches failed');
      }

      dispatch(setProgress(30));

      const [geoData, weights, analysisData, flowsText] = await Promise.all([
        geoResponse.json(),
        weightsResponse.json(),
        analysisResponse.json(),
        flowsResponse.text()
      ]);

      dispatch(setProgress(50));

      const flowsData = processFlowData(flowsText);

      dispatch(setProgress(70));

      const processedData = await workerManager.processData(
        WorkerMessageTypes.PROCESS_SPATIAL,
        {
          geoData,
          flows: flowsData,
          weights
        }
      );

      // Extract unique commodities, months, and regimes from the data
      const regimes = [...new Set(
        processedData.geoData.features
          .map(f => f.properties?.regime)
          .filter(Boolean)
      )].sort();

      const commodities = [...new Set(
        processedData.geoData.features
          .map(f => f.properties?.commodity)
          .filter(Boolean)
      )].sort();

      const uniqueMonths = [...new Set(
        processedData.geoData.features
          .map(f => f.properties?.date?.slice(0, 7))
          .filter(Boolean)
      )].sort();

      dispatch(setProgress(100));

      metric.finish({ status: 'success' });

      return {
        geoData: processedData.geoData,
        weights: processedData.weights,
        flows: processedData.flows,
        analysis: analysisData,
        uniqueMonths,
        commodities,
        regimes
      };

    } catch (error) {
      console.error('Error fetching spatial data:', error);
      metric.finish({ status: 'error', error: error.message });
      backgroundMonitor.logError('spatial-data-fetch-error', { error });
      return rejectWithValue(error.message);
    }
  }
);

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    setSelectedRegion: (state, action) => {
      state.ui.selectedRegion = action.payload;
    },
    setView: (state, action) => {
      state.ui.view = action.payload;
    },
    setLoadingStage: (state, action) => {
      state.status.stage = action.payload;
    },
    setProgress: (state, action) => {
      state.status.progress = action.payload;
    },
    clearCache: (state) => {
      state.data = initialState.data;
    },
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
    },
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedRegimes: (state, action) => {
      state.ui.selectedRegimes = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.progress = 0;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.data = { ...state.data, ...action.payload };
        state.status.progress = 100;
        state.status.error = null;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
      });
  }
});

export const selectSpatialState = state => state.spatial;

export const selectSpatialData = createSelector(
  [selectSpatialState],
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

// Adjusted selectAnalysisData remains the same
export const selectAnalysisData = createSelector(
  [selectSpatialState, (_, selectedCommodity) => selectedCommodity],
  (spatialState, selectedCommodity) => {
    if (!selectedCommodity || !spatialState.data.analysis) return null;
    return spatialState.data.analysis.find(a =>
      a.commodity === selectedCommodity && a.regime === 'unified'
    ) || null;
  }
);

// Adjusted selectFlowsForPeriod
export const selectFlowsForPeriod = createSelector(
  [selectSpatialState, (state, selectedDate) => selectedDate, (state, selectedDate, selectedCommodity) => selectedCommodity],
  (spatialState, selectedDate, selectedCommodity) => {
    if (!selectedDate || !selectedCommodity || !spatialState.data.flows) return [];
    return spatialState.data.flows.filter(flow =>
      flow.date?.startsWith(selectedDate) &&
      flow.commodity?.toLowerCase() === selectedCommodity.toLowerCase()
    );
  }
);

// Adjusted selectSpatialMetrics
export const selectSpatialMetrics = createSelector(
  [selectSpatialState, (state, selectedCommodity) => selectedCommodity],
  (spatialState, selectedCommodity) => {
    const analysis = spatialState.data.analysis?.find(a =>
      a.commodity === selectedCommodity && a.regime === 'unified'
    );

    if (!analysis || !spatialState.data.weights) return null;

    const totalConnections = Object.values(spatialState.data.weights).reduce(
      (sum, region) => sum + (region.neighbors?.length || 0),
      0
    );

    return {
      integration: analysis.r_squared || 0,
      spatialEffect: analysis.coefficients?.spatial_lag_price || 0,
      correlation: analysis.moran_i?.I || 0,
      avgConnections: totalConnections / (Object.keys(spatialState.data.weights).length || 1)
    };
  }
);

export const {
  setSelectedRegion,
  setView,
  setLoadingStage,
  setProgress,
  clearCache,
  setSelectedDate,
  setSelectedCommodity,
  setSelectedRegimes
} = spatialSlice.actions;

export default spatialSlice.reducer;