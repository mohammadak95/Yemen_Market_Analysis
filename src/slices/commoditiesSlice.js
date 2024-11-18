// src/slices/commoditiesSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { monitoringSystem } from '../utils/MonitoringSystem';
import Papa from 'papaparse';
import { constructDataPath } from '../utils/DataLoader';

// Utility function for normalization
const normalizeCommodityId = (value) => {
  return value?.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_');
};

export const fetchCommoditiesData = createAsyncThunk(
  'commodities/fetchData',
  async (_, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('fetch-commodities-data');
    try {
      const response = await fetch(constructDataPath('time_varying_flows.csv'));
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const text = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              // Extract unique commodities
              const commoditiesSet = new Set(
                results.data.map((row) => row.commodity?.toLowerCase())
              );

              const processedCommodities = Array.from(commoditiesSet)
                .filter(Boolean)
                .map((commodity) => ({
                  id: normalizeCommodityId(commodity),
                  name: commodity,
                }));

              metric.finish({ status: 'success' });
              resolve(processedCommodities);
            } catch (parseError) {
              metric.finish({ status: 'error', error: parseError.message });
              reject(parseError);
            }
          },
          error: (error) => {
            metric.finish({ status: 'error', error: error.message });
            reject(error);
          },
        });
      });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

const commoditiesSlice = createSlice({
  name: 'commodities',
  initialState: {
    commodities: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearCommoditiesData: (state) => {
      state.commodities = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommoditiesData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCommoditiesData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.commodities = action.payload;
        state.error = null;
      })
      .addCase(fetchCommoditiesData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  },
});

// Selectors for consistent state access
export const selectCommodities = (state) => state.commodities.commodities;
export const selectCommoditiesStatus = (state) => state.commodities.status;

export const { clearCommoditiesData } = commoditiesSlice.actions;
export default commoditiesSlice.reducer;