// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';

// Define the initial state
const initialState = {
  status: {
    loading: false,
    error: null,
    isInitialized: false,
  },
  data: {
    geoData: null,
    flowMaps: [],
    marketClusters: [],
    detectedShocks: [],
    timeSeriesData: [],
    analysisResults: null,
    analysisMetrics: null,
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegion: null,
  },
};

// Async thunk to load precomputed data using precomputedDataManager
export const loadSpatialData = createAsyncThunk(
  'spatial/loadSpatialData',
  async ({ selectedCommodity, selectedDate }, { rejectWithValue }) => {
    try {
      const data = await precomputedDataManager.processSpatialData(
        selectedCommodity, 
        selectedDate
      );

      // If no date provided, use the latest available
      const effectiveDate = selectedDate || data.availableMonths[data.availableMonths.length - 1];

      return {
        data,
        selectedDate: effectiveDate
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Selector function to select spatial data from the state
export const selectSpatialData = (state) => state.spatial;

// Create the slice
const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    setSelectedCommodity(state, action) {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedDate(state, action) {
      state.ui.selectedDate = action.payload;
    },
    setSelectedRegion(state, action) {
      state.ui.selectedRegion = action.payload;
    },
    resetError(state) {
      state.status.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(loadSpatialData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.isInitialized = true;
        state.data = action.payload.data;
        state.ui.selectedDate = action.payload.selectedDate; // Update selectedDate
      })
      .addCase(loadSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
      });
  },
});

// Export actions and reducer
export const {
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegion,
  resetError,
} = spatialSlice.actions;

export default spatialSlice.reducer;