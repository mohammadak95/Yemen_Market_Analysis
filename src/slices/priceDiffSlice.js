// src/slices/priceDiffSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';

export const fetchPriceDiffData = createAsyncThunk(
  'priceDiff/fetchData',
  async ({ commodity, options = {} }, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('fetch-price-differentials');

    try {
      // Ensure unified data manager is initialized
      if (!unifiedDataManager._isInitialized) {
        await unifiedDataManager.init();
      }

      // Load price differential data
      const response = await fetch('path/to/price_differential_results.json');
      const rawData = await response.json();

      // Process price differentials for the selected commodity
      const processedData = {};
      Object.entries(rawData.markets || {}).forEach(([market, marketData]) => {
        const commodityResults = marketData.commodity_results[commodity];
        if (commodityResults) {
          processedData[market] = {
            commodity_results: {
              [commodity]: commodityResults.map(result => ({
                price_differential: {
                  dates: result.price_differential.dates,
                  values: result.price_differential.values
                },
                diagnostics: {
                  common_dates: result.diagnostics.common_dates,
                  conflict_correlation: result.diagnostics.conflict_correlation,
                  distance_km: result.diagnostics.distance_km
                },
                regression_results: {
                  aic: result.regression_results.aic,
                  bic: result.regression_results.bic,
                  r_squared: result.regression_results.r_squared
                }
              }))
            }
          };
        }
      });

      // Transform data for analysis
      const transformedData = await dataTransformationSystem.transformPriceDiffData(processedData, {
        timeUnit: options.timeUnit || 'month',
        aggregationType: options.aggregationType || 'mean',
        smoothing: options.smoothing || false
      });

      const result = {
        data: transformedData,
        metadata: {
          commodity,
          processedAt: new Date().toISOString(),
          options
        },
        summary: calculatePriceDiffSummary(transformedData)
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to fetch price differential data:', error);
      return rejectWithValue(error.message);
    }
  }
);

const calculatePriceDiffSummary = (data) => {
  const summary = {
    marketCount: 0,
    averageDifferential: 0,
    maxDifferential: 0,
    minDifferential: 0,
    significantPairs: 0,
    totalPairs: 0
  };

  try {
    const markets = Object.keys(data);
    summary.marketCount = markets.length;
    
    let allDifferentials = [];
    let significantCount = 0;
    let totalCount = 0;

    markets.forEach(market => {
      const results = data[market].commodity_results;
      Object.values(results).forEach(commodityResults => {
        commodityResults.forEach(result => {
          const values = result.price_differential.values;
          allDifferentials = allDifferentials.concat(values);
          
          if (result.regression_results.r_squared > 0.3) {
            significantCount++;
          }
          totalCount++;
        });
      });
    });

    if (allDifferentials.length > 0) {
      summary.averageDifferential = allDifferentials.reduce((a, b) => a + b, 0) / allDifferentials.length;
      summary.maxDifferential = Math.max(...allDifferentials);
      summary.minDifferential = Math.min(...allDifferentials);
    }

    summary.significantPairs = significantCount;
    summary.totalPairs = totalCount;

    return summary;
  } catch (error) {
    monitoringSystem.error('Error calculating price differential summary:', error);
    return summary;
  }
};

const initialState = {
  data: null,
  metadata: null,
  summary: null,
  status: {
    loading: false,
    error: null,
    lastUpdated: null
  },
  ui: {
    selectedMarkets: [],
    timeRange: null,
    significanceThreshold: 0.3
  }
};

const priceDiffSlice = createSlice({
  name: 'priceDiff',
  initialState,
  reducers: {
    setSelectedMarkets: (state, action) => {
      state.ui.selectedMarkets = action.payload;
    },
    setTimeRange: (state, action) => {
      state.ui.timeRange = action.payload;
    },
    setSignificanceThreshold: (state, action) => {
      state.ui.significanceThreshold = action.payload;
    },
    clearPriceDiffData: (state) => {
      state.data = null;
      state.metadata = null;
      state.summary = null;
      state.status.lastUpdated = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPriceDiffData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchPriceDiffData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.data = action.payload.data;
        state.metadata = action.payload.metadata;
        state.summary = action.payload.summary;
        state.status.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchPriceDiffData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'Failed to fetch price differential data';
      });
  }
});

export const {
  setSelectedMarkets,
  setTimeRange,
  setSignificanceThreshold,
  clearPriceDiffData
} = priceDiffSlice.actions;

// Selectors
export const selectPriceDiffData = state => state.priceDiff.data;
export const selectPriceDiffStatus = state => state.priceDiff.status;
export const selectPriceDiffMetadata = state => state.priceDiff.metadata;
export const selectPriceDiffSummary = state => state.priceDiff.summary;
export const selectPriceDiffUI = state => state.priceDiff.ui;

export default priceDiffSlice.reducer;