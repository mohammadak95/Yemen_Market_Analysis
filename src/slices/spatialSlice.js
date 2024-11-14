// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';

const initialState = {
  status: {
    loading: false,
    error: null,
    isInitialized: false,
  },
  data: null,
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegion: null,
    selectedAnalysis: '',
    selectedRegimes: [],
  },
};

export const loadSpatialData = createAsyncThunk(
  'spatial/loadSpatialData',
  async ({ selectedCommodity, selectedDate }, { rejectWithValue }) => {
    try {
      const data = await precomputedDataManager.processSpatialData(
        selectedCommodity,
        selectedDate
      );

      const effectiveDate =
        selectedDate ||
        (data.availableMonths && data.availableMonths[data.availableMonths.length - 1]);

      // Extract unique regimes from data
      const regimes = Array.from(new Set(data.timeSeriesData.map((d) => d.regime)));

      return {
        data: {
          ...data,
          regimes,
        },
        selectedDate: effectiveDate,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

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
    setSelectedAnalysis(state, action) {
      state.ui.selectedAnalysis = action.payload;
    },
    setSelectedRegimes(state, action) {
      state.ui.selectedRegimes = action.payload;
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
        state.ui.selectedDate = action.payload.selectedDate;

        // Only update selectedRegimes if they have changed
        if (
          JSON.stringify(state.ui.selectedRegimes) !==
          JSON.stringify(action.payload.data.regimes)
        ) {
          state.ui.selectedRegimes = action.payload.data.regimes;
        }
      })
      .addCase(loadSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
      });
  },
});

export const {
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegion,
  setSelectedAnalysis,
  setSelectedRegimes,
  resetError,
} = spatialSlice.actions;

export default spatialSlice.reducer;