// src/slices/geometriesSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { UnifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { normalizeRegionId } from '../utils/appUtils';

/**
 * Async thunk to fetch geometries using UnifiedDataManager.
 * @returns {Promise<Object>} - An object mapping region IDs to geometry data.
 */
export const fetchGeometries = createAsyncThunk(
  'geometries/fetchGeometries',
  async (_, { rejectWithValue }) => {
    try {
      const geometriesMap = await UnifiedDataManager.loadGeometriesData();
      
      if (!geometriesMap || geometriesMap.size === 0) {
        throw new Error('No geometry data loaded');
      }
      
      // Convert Map to a plain object with normalized region IDs
      const geometries = Array.from(geometriesMap).reduce((obj, [key, value]) => {
        const normalizedKey = normalizeRegionId(key);
        obj[normalizedKey] = value;
        return obj;
      }, {});

      return geometries;
    } catch (error) {
      monitoringSystem.error('Error loading geometries:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * @typedef {Object} GeometriesState
 * @property {Object|null} data - Geometries data as an object { regionId: geometry }.
 * @property {boolean} loading - Loading state.
 * @property {string|null} error - Error message, if any.
 */

/**
 * Initial state for geometries slice.
 * @type {GeometriesState}
 */
const initialState = {
  data: null, // Will hold geometries as an object { regionId: geometry }
  loading: false,
  error: null,
};

/**
 * Geometries slice to manage spatial geometries data.
 */
const geometriesSlice = createSlice({
  name: 'geometries',
  initialState,
  reducers: {
    /**
     * Clears geometries data.
     * @param {GeometriesState} state 
     */
    clearGeometries: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeometries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGeometries.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchGeometries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch geometries';
      });
  },
});

// Export actions
export const { clearGeometries } = geometriesSlice.actions;

// Export selectors
export const selectGeometriesData = state => state.geometries.data;
export const selectGeometriesLoading = state => state.geometries.loading;
export const selectGeometriesError = state => state.geometries.error;

export default geometriesSlice.reducer;
