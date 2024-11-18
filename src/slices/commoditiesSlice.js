// src/slices/commoditiesSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { monitoringSystem } from '../utils/MonitoringSystem';
import Papa from 'papaparse';
import { constructDataPath } from '../utils/DataLoader';
import { COMMODITIES} from '../constants/index';

export const fetchCommoditiesData = createAsyncThunk(
  'commodities/fetchData',
  async (_, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('fetch-commodities-data');

    try {
      const filePath = constructDataPath('time_varying_flows.csv');
      
      console.debug('Fetching commodities data:', {
        filePath,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(filePath, {
        headers: {
          'Accept': 'text/csv',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch time_varying_flows.csv: ${response.status}`);
      }

      const text = await response.text();
      
      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              if (!results.data || !results.data.length) {
                throw new Error('No data found in CSV file');
              }

              // Get unique commodities with validation
              const commoditiesMap = new Map();
              results.data.forEach(row => {
                const commodity = row.commodity;
                if (!commodity || typeof commodity !== 'string') return;
                
                if (!commoditiesMap.has(commodity)) {
                  commoditiesMap.set(commodity, {
                    id: commodity,
                    name: commodity,
                    category: categorizeCommodity(commodity),
                    prices: [],
                    markets: new Set(),
                    hasConflictData: Boolean(row.conflict_intensity)
                  });
                }
                
                const commodityData = commoditiesMap.get(commodity);
                if (row.price) commodityData.prices.push(row.price);
                if (row.source) commodityData.markets.add(row.source);
                if (row.target) commodityData.markets.add(row.target);
              });

              const processedCommodities = Array.from(commoditiesMap.values())
                .filter(commodity => commodity.prices.length > 0)
                .map(commodity => ({
                  ...commodity,
                  markets: Array.from(commodity.markets)
                }));

              console.debug('Processed commodities:', {
                totalRows: results.data.length,
                uniqueCommodities: processedCommodities.length
              });

              metric.finish({ status: 'success' });
              resolve(processedCommodities);
            } catch (err) {
              reject(err);
            }
          },
          error: (error) => reject(new Error(`CSV parsing failed: ${error.message}`))
        });
      });

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

// Helper function to categorize commodities
const categorizeCommodity = (commodity) => {
  const commodityLower = commodity.toLowerCase();
  for (const [category, items] of Object.entries(COMMODITIES)) {
    if (items.some(item => commodityLower.includes(item))) {
      return category;
    }
  }
  return 'OTHER';
};

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