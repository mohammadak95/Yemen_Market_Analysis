// src/slices/spatialSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { processGeoJSON, processFlowData, processSpatialWeights } from '../utils/spatialProcessors';

// Enhanced initial state with metadata
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
  metadata: {
    lastUpdated: null,
    dataVersion: '1.0',
    processingStats: {}
  },
  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: null
  },
  cache: {
    analysisResults: {},
    processedFeatures: new Map()
  }
};

// Optimized data fetching thunk
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { dispatch, getState }) => {
    try {
      dispatch(setLoadingStage('FETCHING_DATA'));
      
      // Check cache first
      const cacheKey = `${selectedCommodity}_${selectedDate}`;
      const cachedData = getState().spatial.cache.analysisResults[cacheKey];
      if (cachedData) {
        return cachedData;
      }

      const responses = await Promise.all([
        fetch('/results/unified_data.geojson'),
        fetch('/results/spatial_weights/transformed_spatial_weights.json'),
        fetch('/results/spatial_analysis_results.json'),
        fetch('/results/network_data/time_varying_flows.csv')
      ]);

      const [geoJSON, weights, analysis, flows] = await Promise.all(
        responses.map(r => r.json())
      );

      dispatch(setLoadingStage('PROCESSING_DATA'));

      // Process data in chunks to avoid blocking
      const processedData = await processDataInChunks({
        geoJSON,
        weights,
        analysis,
        flows,
        selectedCommodity,
        selectedDate,
        onProgress: (progress) => dispatch(setProgress(progress))
      });

      // Cache results
      dispatch(updateCache({ key: cacheKey, data: processedData }));

      return processedData;
    } catch (error) {
      console.error('Error fetching spatial data:', error);
      throw error;
    }
  }
);

// Enhanced slice with optimized reducers
const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    setLoadingStage: (state, action) => {
      state.status.stage = action.payload;
    },
    setProgress: (state, action) => {
      state.status.progress = action.payload;
    },
    updateCache: (state, action) => {
      const { key, data } = action.payload;
      state.cache.analysisResults[key] = data;
    },
    clearCache: (state) => {
      state.cache = {
        analysisResults: {},
        processedFeatures: new Map()
      };
    },
    setView: (state, action) => {
      state.ui.view = action.payload;
    },
    setSelectedRegion: (state, action) => {
      state.ui.selectedRegion = action.payload;
    },
    updateMetadata: (state, action) => {
      state.metadata = {
        ...state.metadata,
        ...action.payload,
        lastUpdated: new Date().toISOString()
      };
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
        const { data, metadata } = action.payload;
        state.data = data;
        state.metadata = {
          ...state.metadata,
          ...metadata,
          lastUpdated: new Date().toISOString()
        };
        state.status = {
          loading: false,
          error: null,
          progress: 100,
          stage: 'COMPLETE'
        };
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status = {
          loading: false,
          error: action.error.message,
          progress: 0,
          stage: 'ERROR'
        };
      });
  }
});

// Optimized selectors with memoization
export const selectSpatialState = (state) => state.spatial;

export const selectAnalysisData = createSelector(
  [selectSpatialState, (_, selectedCommodity) => selectedCommodity],
  (spatialState, selectedCommodity) => {
    const analysisKey = `${selectedCommodity}_unified`;
    return spatialState.data.analysis[analysisKey] || null;
  }
);

export const selectFlowsForPeriod = createSelector(
  [selectSpatialState, (_, period) => period],
  (spatialState, period) => {
    return spatialState.data.flows.filter(flow => flow.date === period);
  }
);

export const selectProcessingMetadata = createSelector(
  [selectSpatialState],
  (spatialState) => spatialState.metadata.processingStats
);

// Helper function for chunked data processing
async function processDataInChunks({
  geoJSON,
  weights,
  analysis,
  flows,
  selectedCommodity,
  selectedDate,
  onProgress,
  chunkSize = 100
}) {
  const chunks = [];
  let processedCount = 0;
  const totalItems = geoJSON.features.length;

  for (let i = 0; i < geoJSON.features.length; i += chunkSize) {
    const chunk = geoJSON.features.slice(i, i + chunkSize);
    
    // Process chunk
    const processedChunk = await processGeoJSON(chunk, selectedCommodity);
    chunks.push(processedChunk);
    
    // Update progress
    processedCount += chunk.length;
    onProgress(Math.round((processedCount / totalItems) * 100));

    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const processedFeatures = chunks.flat();
  const processedWeights = await processSpatialWeights(weights);
  const processedFlows = await processFlowData(flows, selectedDate);

  return {
    data: {
      geoData: {
        type: 'FeatureCollection',
        features: processedFeatures
      },
      weights: processedWeights,
      flows: processedFlows,
      analysis: analysis[`${selectedCommodity}_unified`]
    },
    metadata: {
      processingStats: {
        featuresProcessed: processedFeatures.length,
        flowsProcessed: processedFlows.length,
        processingTime: performance.now()
      }
    }
  };
}

export const {
  setLoadingStage,
  setProgress,
  updateCache,
  clearCache,
  setView,
  setSelectedRegion,
  updateMetadata
} = spatialSlice.actions;

export default spatialSlice.reducer;