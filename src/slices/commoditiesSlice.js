// src/slices/commoditiesSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { monitoringSystem } from '../utils/MonitoringSystem';
import Papa from 'papaparse';
import { constructDataPath } from '../utils/DataLoader';

export const fetchCommoditiesData = createAsyncThunk(
  'commodities/fetchData',
  async (_, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('fetch-commodities-data');
    try {
      const response = await fetch(constructDataPath('time_varying_flows.csv'));
      const text = await response.text();
      
      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Extract unique commodities
            const commoditiesSet = new Set(
              results.data.map(row => row.commodity?.toLowerCase())
            );
            
            const processedCommodities = Array.from(commoditiesSet)
              .filter(Boolean)
              .map(commodity => ({
                id: commodity,
                name: commodity.replace(/_/g, ' ')
              }));

            metric.finish({ status: 'success' });
            resolve(processedCommodities);
          },
          error: (error) => reject(error)
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
    status: 'idle',
    error: null
  },
  reducers: {
    clearCommoditiesData: (state) => {
      state.commodities = [];
      state.status = 'idle';
      state.error = null;
    }
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
        state.error = action.payload;
      });
  }
});

export const { clearCommoditiesData } = commoditiesSlice.actions;
export default commoditiesSlice.reducer;