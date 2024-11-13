import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { SpatialDataMerger } from '../utils/spatialDataMerger';
import { processSpatialData } from '../utils/spatialProcessors';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { fetchGeometries } from './geometriesSlice';
import { MAP_SETTINGS } from '../constants';
import { normalizeRegionId } from '../utils/appUtils';
import SpatialDataMerger from '../utils/spatialDataMerger';


export const initialState = {
  data: {
    geoData: null,
    marketClusters: [], 
    detectedShocks: [], 
    timeSeriesData: [],
    flowMaps: [],
    analysisMetrics: {},
    spatialAutocorrelation: null,
    flowAnalysis: [],
    spatialWeights: null,  // New field for weights
    metadata: null,
    uniqueMonths: []
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    view: {
      center: MAP_SETTINGS.DEFAULT_CENTER,
      zoom: MAP_SETTINGS.DEFAULT_ZOOM,
    },
  },
  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: null,
  }
};

// Create async thunk for fetching and merging spatial data
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ selectedCommodity, selectedDate }, { dispatch, getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    const dataMerger = new SpatialDataMerger();

    try {
      if (!selectedCommodity) {
        throw new Error('Commodity parameter is required');
      }

      const state = getState();
      let geometries = state.geometries.data;

      if (!geometries) {
        const geometriesResult = await dispatch(fetchGeometries()).unwrap();
        if (!geometriesResult) {
          throw new Error('Failed to load geometries');
        }
        geometries = geometriesResult;
      }

      if (!geometries || typeof geometries !== 'object') {
        throw new Error('Invalid geometries data structure');
      }

      const geometriesFeatures = Object.entries(geometries).map(([regionId, data]) => ({
        type: 'Feature',
        properties: {
          region_id: regionId,
          ...data.properties
        },
        geometry: data.geometry
      }));

      const result = await precomputedDataManager.processSpatialData(
        selectedCommodity,
        selectedDate,
        { 
          geometries: {
            type: 'FeatureCollection',
            features: geometriesFeatures
          }
        }
      );

      const uniqueMonths = Array.isArray(result.timeSeriesData) 
        ? [...new Set(result.timeSeriesData.map(d => d.month))].sort()
        : [];
      
      const effectiveDate = selectedDate || uniqueMonths[uniqueMonths.length - 1];

      metric.finish({ status: 'success' });
      
      // Load precomputed data for the selected commodity and date
      const precomputedData = await dataMerger.mergeData(
        await dataMerger.loadPrecomputedData(selectedCommodity), 
        selectedCommodity, 
        selectedDate
      );

      // Process the data with spatial processors
      const processedData = processSpatialData(precomputedData, precomputedData.geoData, selectedDate);

      // Extract unique months from the time series data
      const uniqueMonths = [...new Set(processedData.timeSeriesData.map(d => d.month))].sort();
      
      metric.finish({ 
        status: 'success',
        dataSize: JSON.stringify(processedData).length,
        commodity: selectedCommodity
      });

      return {
        ...processedData,
        uniqueMonths,
        selectedCommodity,
        selectedDate: effectiveDate
      };

    } catch (error) {
      console.error('Error in fetchSpatialData:', error);
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

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
      state.ui.selectedRegion = normalizeRegionId(action.payload);
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
        state.status.error = null;
        state.status.progress = 100;
        state.data = action.payload;
        state.ui.selectedCommodity = action.payload.selectedCommodity;
        state.ui.selectedDate = action.payload.selectedDate;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.progress = 0;
      });
  },
});

export const {
  setProgress,
  setLoadingStage,
  setSelectedRegion,
  setView,
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegimes,
  resetState
} = spatialSlice.actions;

export default spatialSlice.reducer;
