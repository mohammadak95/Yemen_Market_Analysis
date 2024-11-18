// src/slices/ecmSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';

/**
 * Async thunk to fetch ECM data.
 */
export const fetchECMData = createAsyncThunk(
  'ecm/fetchECMData',
  async ({ commodity, options = {} }, { rejectWithValue }) => {
    try {
      const metric = monitoringSystem.startMetric('fetchECMData');

      const [unifiedData, northToSouthData, southToNorthData] = await unifiedDataManager.loadECMData();

      if (!unifiedData || !northToSouthData || !southToNorthData) {
        throw new Error('Incomplete ECM data received');
      }

      // Filter for selected commodity
      const filteredNorthToSouth = northToSouthData.filter(
        item => item.commodity.toLowerCase() === commodity.toLowerCase()
      );
      const filteredSouthToNorth = southToNorthData.filter(
        item => item.commodity.toLowerCase() === commodity.toLowerCase()
      );

      // Process ECM results
      const processedData = {
        northToSouth: filteredNorthToSouth.map(result => ({
          alpha: result.alpha,
          direction: 'north-to-south',
          diagnostics: result.diagnostics || {},
          irf: {
            impulse_response: result.irf?.impulse_response || [],
            periods: result.irf?.periods || []
          },
          spatial_autocorrelation: {
            moran_i: result.moran_i,
            p_value: result.p_value
          }
        })),
        southToNorth: filteredSouthToNorth.map(result => ({
          alpha: result.alpha,
          direction: 'south-to-north',
          diagnostics: result.diagnostics || {},
          irf: {
            impulse_response: result.irf?.impulse_response || [],
            periods: result.irf?.periods || []
          },
          spatial_autocorrelation: {
            moran_i: result.moran_i,
            p_value: result.p_value
          }
        }))
      };

      // Calculate summary statistics
      const summary = calculateECMSummary(processedData);

      // Transform data if needed
      const transformedData = await dataTransformationSystem.transformECMData(
        processedData,
        options
      );

      const result = {
        data: transformedData,
        summary,
        metadata: {
          commodity,
          processedAt: new Date().toISOString(),
          options
        }
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (err) {
      monitoringSystem.error('Error fetching ECM data:', err);
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Initial state for ecmSlice.
 */
const initialState = {
  data: null,
  summary: null,
  metadata: null,
  status: {
    loading: false,
    error: null,
    lastUpdated: null
  },
  ui: {
    selectedDirection: null,
    significanceLevel: 0.05,
    displayOptions: {
      showIRF: true,
      showSpatialMetrics: true,
      showDiagnostics: true
    }
  }
};

/**
 * Slice for managing ECM data.
 */
const ecmSlice = createSlice({
  name: 'ecm',
  initialState,
  reducers: {
    setSelectedDirection: (state, action) => {
      state.ui.selectedDirection = action.payload;
    },
    setSignificanceLevel: (state, action) => {
      state.ui.significanceLevel = action.payload;
    },
    updateDisplayOptions: (state, action) => {
      state.ui.displayOptions = {
        ...state.ui.displayOptions,
        ...action.payload
      };
    },
    clearECMData: (state) => {
      state.data = null;
      state.summary = null;
      state.metadata = null;
      state.status.lastUpdated = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchECMData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchECMData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.data = action.payload.data;
        state.summary = action.payload.summary;
        state.metadata = action.payload.metadata;
        state.status.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchECMData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'Failed to fetch ECM data';
      });
  },
});

/**
 * Export selectors to access ECM data.
 */
export const selectUnifiedECMData = (state) => state.ecm.unifiedData;
export const selectNorthToSouthECMData = (state) => state.ecm.northToSouthData;
export const selectSouthToNorthECMData = (state) => state.ecm.southToNorthData;
export const selectECMData = (state) => state.ecm.data;
export const selectECMStatus = (state) => state.ecm.status;
export const selectECMSummary = (state) => state.ecm.summary;
export const selectECMMetadata = (state) => state.ecm.metadata;
export const selectECMUI = (state) => state.ecm.ui;
export const selectECMError = (state) => state.ecm.error;

/**
 * Export the reducer.
 */
export default ecmSlice.reducer;

/**
 * Function to calculate ECM summary statistics.
 */
const calculateECMSummary = (data) => {
  const summary = {
    northToSouth: {
      averageAlpha: 0,
      significantResults: 0,
      totalResults: 0,
      averageMoranI: 0
    },
    southToNorth: {
      averageAlpha: 0,
      significantResults: 0,
      totalResults: 0,
      averageMoranI: 0
    },
    comparison: {
      dominantDirection: null,
      alphaRatio: 0,
      significanceDifference: 0
    }
  };

  try {
    // North to South summary
    const ntsResults = data.northToSouth;
    summary.northToSouth.totalResults = ntsResults.length;
    summary.northToSouth.averageAlpha = ntsResults.reduce((acc, curr) => acc + curr.alpha, 0) / ntsResults.length;
    summary.northToSouth.significantResults = ntsResults.filter(r => r.spatial_autocorrelation.p_value < 0.05).length;
    summary.northToSouth.averageMoranI = ntsResults.reduce((acc, curr) => acc + curr.spatial_autocorrelation.moran_i, 0) / ntsResults.length;

    // South to North summary
    const stnResults = data.southToNorth;
    summary.southToNorth.totalResults = stnResults.length;
    summary.southToNorth.averageAlpha = stnResults.reduce((acc, curr) => acc + curr.alpha, 0) / stnResults.length;
    summary.southToNorth.significantResults = stnResults.filter(r => r.spatial_autocorrelation.p_value < 0.05).length;
    summary.southToNorth.averageMoranI = stnResults.reduce((acc, curr) => acc + curr.spatial_autocorrelation.moran_i, 0) / stnResults.length;

    // Comparison metrics
    summary.comparison.alphaRatio = summary.northToSouth.averageAlpha / summary.southToNorth.averageAlpha;
    summary.comparison.significanceDifference = summary.northToSouth.significantResults - summary.southToNorth.significantResults;
    summary.comparison.dominantDirection = summary.comparison.alphaRatio > 1 ? 'north-to-south' : 'south-to-north';

    return summary;
  } catch (error) {
    monitoringSystem.error('Error calculating ECM summary:', error);
    return summary;
  }
};