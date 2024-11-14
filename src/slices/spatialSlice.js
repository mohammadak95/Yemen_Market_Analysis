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
  async ({ selectedCommodity, selectedDate }, { rejectWithValue, getState }) => {
    try {
      // Use provided parameters or fallback to state values
      const state = getState();
      const commodity = selectedCommodity || state.spatial.ui.selectedCommodity;
      let date = selectedDate || state.spatial.ui.selectedDate;

      // Ensure that commodity is provided
      if (!commodity) {
        throw new Error('Commodity must be selected to load spatial data.');
      }

      // Process data using precomputedDataManager
      const data = await precomputedDataManager.processSpatialData(commodity, date);

      // If date is not provided, determine the latest date from the processed data
      if (!date && data.timeSeriesData && data.timeSeriesData.length > 0) {
        const availableDates = data.timeSeriesData
          .map((entry) => entry.month)
          .filter((month) => !!month)
          .sort();
        date = availableDates[availableDates.length - 1]; // Pick the latest date
      }

      // Update the selectedDate in the UI state
      return { data, selectedDate: date };
    } catch (error) {
      console.error('Error in loadSpatialData:', error);
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