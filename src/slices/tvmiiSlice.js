// src/slices/tvmiiSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';
import Papa from 'papaparse';

/**
 * Async thunk to fetch TV-MII data.
 */
export const fetchTVMIIData = createAsyncThunk(
  'tvmii/fetchTVMIIData',
  async (_, { rejectWithValue }) => {
    try {
      const metric = monitoringSystem.startMetric('fetchTVMIIData');

      const csvPath = '/data/tv_mii_results.csv'; // Adjust the path as needed
      const response = await fetch(csvPath);

      if (!response.ok) {
        throw new Error(`Failed to fetch CSV data: ${response.statusText}`);
      }

      const csvText = await response.text();

      // Parse CSV data
      const parsedData = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      }).data;

      // Structure the data as per requirements
      const structuredData = parsedData.map(row => ({
        date: row.date,
        tv_mii: parseFloat(row.tv_mii),
        commodity: row.commodity,
        market_pair: row.market_pair
      }));

      // Calculate summary statistics
      const summary = calculateTVMIISummary(structuredData);

      const result = {
        tvmiiData: structuredData,
        summary,
        metadata: {
          processedAt: new Date().toISOString(),
          dataSource: 'tv_mii_results.csv'
        }
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to fetch TV-MII data:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Calculates summary statistics for TV-MII data.
 */
const calculateTVMIISummary = (data) => {
  const summary = {
    totalRecords: data.length,
    averageTVMII: 0,
    commodityCounts: {},
    marketPairCounts: {}
  };

  try {
    if (data.length === 0) return summary;

    // Calculate average TV-MII
    const totalTVMII = data.reduce((acc, row) => acc + row.tv_mii, 0);
    summary.averageTVMII = totalTVMII / data.length;

    // Count commodities
    data.forEach(row => {
      summary.commodityCounts[row.commodity] = (summary.commodityCounts[row.commodity] || 0) + 1;
    });

    // Count market pairs
    data.forEach(row => {
      summary.marketPairCounts[row.market_pair] = (summary.marketPairCounts[row.market_pair] || 0) + 1;
    });

    return summary;
  } catch (error) {
    monitoringSystem.error('Error calculating TV-MII summary:', error);
    return summary;
  }
};

/**
 * Initial state for tvmiiSlice.
 */
const initialState = {
  tvmiiData: [],
  summary: null,
  metadata: null,
  status: 'idle',
  error: null,
  ui: {
    selectedMarketPairs: [],
    timeRange: {
      start: null,
      end: null
    },
    significanceLevel: 0.05,
    displayOptions: {
      showTrendLines: true,
      showConfidenceIntervals: true
    }
  }
};

/**
 * Slice for managing TV-MII data.
 */
const tvmiiSlice = createSlice({
  name: 'tvmii',
  initialState,
  reducers: {
    /**
     * Set selected market pairs for analysis.
     */
    setSelectedMarketPairs: (state, action) => {
      state.ui.selectedMarketPairs = action.payload;
    },
    /**
     * Set the time range for TV-MII analysis.
     */
    setTimeRange: (state, action) => {
      state.ui.timeRange = action.payload;
    },
    /**
     * Set the significance level for statistical analysis.
     */
    setSignificanceLevel: (state, action) => {
      state.ui.significanceLevel = action.payload;
    },
    /**
     * Update display options for TV-MII visualization.
     */
    updateDisplayOptions: (state, action) => {
      state.ui.displayOptions = {
        ...state.ui.displayOptions,
        ...action.payload
      };
    },
    /**
     * Clear TV-MII data.
     */
    clearTVMIIData: (state) => {
      state.tvmiiData = [];
      state.summary = null;
      state.metadata = null;
      state.status = 'idle';
      state.error = null;
      state.ui = {
        selectedMarketPairs: [],
        timeRange: {
          start: null,
          end: null
        },
        significanceLevel: 0.05,
        displayOptions: {
          showTrendLines: true,
          showConfidenceIntervals: true
        }
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTVMIIData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTVMIIData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tvmiiData = action.payload.tvmiiData;
        state.summary = action.payload.summary;
        state.metadata = action.payload.metadata;
      })
      .addCase(fetchTVMIIData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch TV-MII data';
      });
  }
});

/**
 * Export actions and selectors.
 */
export const {
  setSelectedMarketPairs,
  setTimeRange,
  setSignificanceLevel,
  updateDisplayOptions,
  clearTVMIIData
} = tvmiiSlice.actions;

export const selectTVMIIData = (state) => state.tvmii.tvmiiData;
export const selectTVMIISummary = (state) => state.tvmii.summary;
export const selectTVMIIMetadata = (state) => state.tvmii.metadata;
export const selectTVMIIStatus = (state) => state.tvmii.status;
export const selectTVMIIError = (state) => state.tvmii.error;
export const selectTVMIIUI = (state) => state.tvmii.ui;

/**
 * Export the reducer.
 */
export default tvmiiSlice.reducer;
