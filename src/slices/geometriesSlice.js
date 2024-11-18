// src/slices/geometriesSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { spatialSystem } from '../utils/SpatialSystem';

export const fetchGeometries = createAsyncThunk(
  'geometries/fetchGeometries',
  async (_, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('fetch-geometries');

    try {
      // Ensure systems are initialized
      if (!unifiedDataManager._isInitialized) {
        await unifiedDataManager.init();
      }
      if (!spatialSystem._isInitialized) {
        await spatialSystem.initialize();
      }

      // Load GeoJSON data
      const geojsonPath = 'geoBoundaries-YEM-ADM1.geojson';
      const response = await fetch(geojsonPath);
      const geojsonData = await response.json();

      // Process and validate geometries
      const processedGeometries = await spatialSystem.processSpatialData(geojsonData, {
        includeGeometry: true,
        simplifyGeometry: true,
        toleranceLevel: 0.01
      });

      metric.finish({ status: 'success' });
      return processedGeometries;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to fetch geometries:', error);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  data: null,
  metadata: {
    lastUpdated: null,
    source: null,
    version: null
  },
  status: {
    loading: false,
    error: null,
    isInitialized: false
  },
  validation: {
    warnings: [],
    missingRegions: [],
    topologyErrors: []
  }
};

const geometriesSlice = createSlice({
  name: 'geometries',
  initialState,
  reducers: {
    clearGeometries: (state) => {
      state.data = null;
      state.status.isInitialized = false;
    },
    updateMetadata: (state, action) => {
      state.metadata = {
        ...state.metadata,
        ...action.payload
      };
    },
    clearValidationWarnings: (state) => {
      state.validation = {
        warnings: [],
        missingRegions: [],
        topologyErrors: []
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeometries.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchGeometries.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.isInitialized = true;
        state.status.error = null;
        state.data = action.payload;
        state.metadata = {
          ...state.metadata,
          lastUpdated: new Date().toISOString(),
          source: 'geoBoundaries-YEM-ADM1.geojson',
          version: '1.0.0'
        };
      })
      .addCase(fetchGeometries.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'Failed to fetch geometries';
      });
  }
});

export const {
  clearGeometries,
  updateMetadata,
  clearValidationWarnings
} = geometriesSlice.actions;

// Selectors
export const selectGeometriesData = state => state.geometries.data;
export const selectGeometriesStatus = state => state.geometries.status;
export const selectGeometriesMetadata = state => state.geometries.metadata;
export const selectGeometriesValidation = state => state.geometries.validation;

export default geometriesSlice.reducer;