// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector, createAction } from '@reduxjs/toolkit';

const initialState = {
  data: {
    geoData: null,
    analysis: null,
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

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { rejectWithValue }) => {
    try {
      const [geoJsonResponse, weightsResponse, analysisResponse, flowsResponse] = await Promise.all([
        fetch('/results/unified_data.geojson'),
        fetch('/results/spatial_weights/transformed_spatial_weights.json'),
        fetch('/results/spatial_analysis_results.json'),
        fetch('/results/network_data/time_varying_flows.csv')
      ]);

      if (!geoJsonResponse.ok) throw new Error('Failed to fetch GeoJSON data');
      if (!weightsResponse.ok) throw new Error('Failed to fetch weights data');
      if (!analysisResponse.ok) throw new Error('Failed to fetch analysis data');
      if (!flowsResponse.ok) throw new Error('Failed to fetch flows data');

      const [geoData, weights, analysis, flowsText] = await Promise.all([
        geoJsonResponse.json(),
        weightsResponse.json(),
        analysisResponse.json(),
        flowsResponse.text()
      ]);

      // Parse CSV flows data
      const flows = flowsText.split('\n')
        .slice(1) // Skip header
        .filter(line => line.trim())
        .map(line => {
          const [date, source, target, flow_weight, price_differential] = line.split(',');
          return {
            date,
            source,
            target,
            flow_weight: parseFloat(flow_weight),
            price_differential: parseFloat(price_differential)
          };
        });

      // Extract unique months from geo data
      const uniqueMonths = [...new Set(
        geoData.features
          .map(f => f.properties.date?.slice(0, 7))
          .filter(Boolean)
      )].sort();

      // Extract regimes and commodities
      const regimes = [...new Set(
        geoData.features
          .map(f => f.properties.regime)
          .filter(Boolean)
      )];

      const commodities = [...new Set(
        geoData.features
          .map(f => f.properties.commodity)
          .filter(Boolean)
      )];

      return {
        geoData,
        weights,
        analysis,
        flows,
        uniqueMonths,
        regimes,
        commodities
      };
    } catch (error) {
      console.error('Error fetching spatial data:', error);
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
    // Add new reducers if needed
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
        state.data = {
          ...state.data,
          ...action.payload
        };
        state.status.progress = 100;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
      });
  }
});

// Selectors
export const selectSpatialData = createSelector(
  [(state) => state.spatial],
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
    loadingProgress: spatial.status.progress
  })
);

export const selectSpatialState = (state) => state.spatial;

export const selectAnalysisData = createSelector(
  [selectSpatialState, (_, selectedCommodity) => selectedCommodity],
  (spatialState, selectedCommodity) => {
    const key = `${selectedCommodity}_unified`;
    return spatialState.data.analysis?.[key] || null;
  }
);

export const selectFlowsForPeriod = createSelector(
  [selectSpatialState, (_, period) => period],
  (spatialState, period) => {
    return spatialState.data.flows?.filter(flow => flow.date === period) || [];
  }
);

// New selectors
export const selectCurrentAnalysis = (state, selectedCommodity) => {
  const { analysis } = state.spatial.data;
  if (!analysis || !selectedCommodity) return null;
  return analysis.find(a => 
    a.commodity === selectedCommodity && 
    a.regime === 'unified'
  );
};

export const selectSpatialMetrics = (state, selectedCommodity, selectedDate) => {
  const analysis = selectCurrentAnalysis(state, selectedCommodity);
  const { weights } = state.spatial.data;
  
  if (!analysis || !weights) return null;

  const totalConnections = Object.values(weights).reduce(
    (sum, region) => sum + (region.neighbors?.length || 0), 
    0
  );
  const avgConnections = totalConnections / (Object.keys(weights).length * 2);

  return {
    integration: analysis.r_squared || 0,
    spatialEffect: analysis.coefficients?.spatial_lag_price || 0,
    correlation: analysis.moran_i?.I || 0,
    avgConnections
  };
};

// New actions
export const setVisualizationMode = createAction('spatial/setVisualizationMode');
export const setTimeRange = createAction('spatial/setTimeRange');

export const {
  setSelectedRegion,
  setView,
  setLoadingStage,
  setProgress,
  clearCache
} = spatialSlice.actions;

export default spatialSlice.reducer;