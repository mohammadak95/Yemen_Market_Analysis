// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { spatialDataManager } from '../utils/SpatialDataManager';

// Initial state
const initialState = {
  geoData: null,
  spatialWeights: null,
  flowMaps: null,
  analysisResults: null,
  uniqueMonths: [],
  status: 'idle',
  error: null,
  lastUpdated: null,
  loadingProgress: 0,
};

// Date normalization helper
const normalizeDate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) throw new Error('Invalid date');
    return date.toISOString().split('T')[0];
  } catch {
    console.warn(`Invalid date format: ${dateString}`);
    return null;
  }
};

// Fetch spatial data as a thunk
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (_, { dispatch, rejectWithValue }) => {
    const mainMetric = { startTime: Date.now(), commodity: 'beans (kidney red)' };

    try {
      // Track and log progress
      dispatch(updateLoadingProgress(10));

      const processedData = await spatialDataManager.processSpatialData(mainMetric.commodity);

      // Unique months extraction after data is processed
      processedData.uniqueMonths = Array.from(new Set(
        processedData.geoData.features.map(f => f.properties.date.slice(0, 7))
      )).sort((a, b) => new Date(a) - new Date(b));

      dispatch(updateLoadingProgress(100));
      return processedData;

    } catch (error) {
      console.error('Spatial fetch error:', error);
      return rejectWithValue({ message: error.message || 'An error occurred' });
    }
  }
);

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    updateLoadingProgress: (state, action) => {
      state.loadingProgress = action.payload;
    },
    resetSpatialState: () => initialState,
    updateMetadata: (state, action) => {
      state.metadata = {
        ...(state.metadata || {}),
        ...action.payload,
        lastUpdated: new Date().toISOString(),
      };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.loadingProgress = 0;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.geoData = action.payload.geoData;
        state.spatialWeights = action.payload.spatialWeights;
        state.flowMaps = action.payload.flowMaps;
        state.analysisResults = action.payload.analysisResults;
        state.uniqueMonths = action.payload.uniqueMonths;
        state.loadingProgress = 100;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'An unknown error occurred';
        state.loadingProgress = 0;
      });
  },
});

export const {
  updateLoadingProgress,
  resetSpatialState,
  updateMetadata,
  clearError,
} = spatialSlice.actions;

export const selectSpatialData = (state) => ({
  geoData: state.spatial.geoData,
  spatialWeights: state.spatial.spatialWeights,
  flowMaps: state.spatial.flowMaps,
  analysisResults: state.spatial.analysisResults,
  uniqueMonths: state.spatial.uniqueMonths,
});

export const selectSpatialStatus = (state) => ({
  status: state.spatial.status,
  error: state.spatial.error,
  loadingProgress: state.spatial.loadingProgress,
  lastUpdated: state.spatial.lastUpdated,
});

export const selectAnalysisResults = (state) => state.spatial.analysisResults;

export default spatialSlice.reducer;