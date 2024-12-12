// src/slices/flowSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import Papa from 'papaparse';
import _ from 'lodash';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { convertUTMtoLatLng } from '../utils/coordinateUtils';
import { 
  getNetworkDataPath, 
  enhancedFetchJson, 
  retryWithBackoff 
} from '../utils/dataUtils';

// Initial state
const initialState = {
  flows: [],
  byDate: {},
  byRegion: {},
  metadata: {
    lastUpdated: null,
    dateRange: {
      start: null,
      end: null
    },
    commodity: null,
    totalFlows: 0,
    uniqueMarkets: 0
  },
  status: {
    loading: false,
    error: null,
    lastFetch: null,
    loadedData: {} // Track what data has been loaded
  }
};

// Helper function to check if data is already loaded
const isDataLoaded = (state, commodity, date) => {
  const key = `${commodity}-${date}`;
  return state.status.loadedData[key] && state.byDate[date];
};

// Async thunk for loading flow data
export const fetchFlowData = createAsyncThunk(
  'flow/fetchData',
  async ({ commodity, date }, { getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('flow-data-fetch');
    
    try {
      // Check if we already have this data
      const state = getState().flow;
      if (isDataLoaded(state, commodity, date)) {
        console.debug('Data already loaded:', { commodity, date });
        metric.finish({ status: 'cached', commodity, date });
        return null; // Return null to skip processing
      }

      // Get the proper path for flow data
      const flowDataPath = getNetworkDataPath('time_varying_flows.csv');

      // Fetch the data with retry capability
      const response = await retryWithBackoff(async () => {
        const res = await fetch(flowDataPath);
        if (!res.ok) throw new Error(`Failed to fetch flow data: ${res.statusText}`);
        return res.text();
      }, {
        onRetry: (attempt, delay, error) => {
          console.warn(`Retry ${attempt + 1} for flow data fetch after ${delay}ms:`, error);
        }
      });

      // Parse CSV data
      const parsedData = await new Promise((resolve, reject) => {
        Papa.parse(response, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimitersToGuess: [',', '\t', '|', ';'],
          complete: (results) => resolve(results),
          error: (error) => reject(error)
        });
      });

      // Process the flows
      const processedData = processFlowData(parsedData.data, commodity, date);
      
      metric.finish({ 
        status: 'success',
        flowCount: processedData.flows.length,
        commodity,
        date
      });

      return processedData;

    } catch (error) {
      metric.finish({ 
        status: 'error',
        error: error.message,
        commodity,
        date
      });
      return rejectWithValue(error.message);
    }
  },
  {
    condition: ({ commodity, date }, { getState }) => {
      const state = getState().flow;
      // Only fetch if not already loading and not already loaded
      return !state.status.loading && !isDataLoaded(state, commodity, date);
    }
  }
);

// Helper function to process flow data
const processFlowData = (data, commodity, date) => {
  // Filter for commodity and date
  const filteredData = data.filter(flow => 
    flow.commodity?.toLowerCase() === commodity?.toLowerCase() &&
    flow.date?.startsWith(date?.substring(0, 7))
  );

  // Process each flow
  const processedFlows = filteredData.map(flow => {
    try {
      // Convert UTM coordinates
      const sourceCoords = convertUTMtoLatLng(flow.source_lng, flow.source_lat);
      const targetCoords = convertUTMtoLatLng(flow.target_lng, flow.target_lat);

      return {
        id: `${flow.source}-${flow.target}-${flow.date}`,
        date: flow.date,
        source: flow.source,
        target: flow.target,
        source_coordinates: sourceCoords,
        target_coordinates: targetCoords,
        price_differential: Number(flow.price_differential) || 0,
        source_price: Number(flow.source_price) || 0,
        target_price: Number(flow.target_price) || 0,
        flow_weight: Number(flow.flow_weight) || 0,
        metadata: {
          processed_at: new Date().toISOString(),
          valid: true
        }
      };
    } catch (error) {
      console.warn('Error processing flow:', error);
      return null;
    }
  }).filter(Boolean);

  // Group flows by date and region
  const byDate = _.groupBy(processedFlows, 'date');
  const byRegion = _.groupBy(processedFlows, 'source');

  // Calculate metadata
  const uniqueMarkets = new Set([
    ...processedFlows.map(f => f.source),
    ...processedFlows.map(f => f.target)
  ]);

  const dates = Object.keys(byDate).sort();

  return {
    flows: processedFlows,
    byDate,
    byRegion,
    metadata: {
      lastUpdated: new Date().toISOString(),
      dateRange: {
        start: dates[0] || null,
        end: dates[dates.length - 1] || null
      },
      commodity,
      totalFlows: processedFlows.length,
      uniqueMarkets: uniqueMarkets.size,
      dateCount: dates.length
    }
  };
};

// Create the slice
const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    clearFlowData: (state) => {
      // Only clear if we're actually switching features
      if (state.metadata.commodity) {
        return initialState;
      }
      return state;
    },
    updateFlowMetrics: (state, action) => {
      state.metadata = {
        ...state.metadata,
        ...action.payload
      };
    },
    resetFlowError: (state) => {
      state.status.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFlowData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchFlowData.fulfilled, (state, action) => {
        // If null returned, data was already loaded
        if (!action.payload) {
          state.status.loading = false;
          return;
        }

        // Merge new flows with existing ones
        const newFlows = action.payload.flows.filter(flow => 
          !state.flows.some(existing => existing.id === flow.id)
        );

        state.flows = [...state.flows, ...newFlows];
        
        // Merge byDate data
        state.byDate = {
          ...state.byDate,
          ...action.payload.byDate
        };

        // Merge byRegion data
        state.byRegion = {
          ...state.byRegion,
          ...action.payload.byRegion
        };

        // Update metadata
        state.metadata = {
          ...state.metadata,
          ...action.payload.metadata,
          lastUpdated: new Date().toISOString()
        };

        // Mark data as loaded
        const key = `${action.payload.metadata.commodity}-${action.payload.metadata.dateRange.start}`;
        state.status = {
          loading: false,
          error: null,
          lastFetch: new Date().toISOString(),
          loadedData: {
            ...state.status.loadedData,
            [key]: true
          }
        };
      })
      .addCase(fetchFlowData.rejected, (state, action) => {
        state.status = {
          ...state.status,
          loading: false,
          error: action.payload,
          lastFetch: new Date().toISOString()
        };
      });
  }
});

// Export actions and reducer
export const { clearFlowData, updateFlowMetrics, resetFlowError } = flowSlice.actions;
export default flowSlice.reducer;

// Base selectors
const getFlowState = state => state.flow || initialState;
const getFlows = state => getFlowState(state).flows;
const getFlowsByDate = state => getFlowState(state).byDate;
const getFlowsByRegion = state => getFlowState(state).byRegion;
const getFlowMetadata = state => getFlowState(state).metadata;
const getFlowStatus = state => getFlowState(state).status;

// Memoized selectors
export const selectFlowState = createSelector(
  [getFlowState],
  flowState => flowState
);

export const selectFlowStatus = createSelector(
  [getFlowStatus],
  status => status
);

export const selectFlowMetadata = createSelector(
  [getFlowMetadata],
  metadata => metadata
);

export const selectFlowsByDate = createSelector(
  [getFlowsByDate, (_, date) => date],
  (byDate, date) => byDate[date] || []
);

export const selectFlowsByRegion = createSelector(
  [getFlowsByRegion, (_, region) => region],
  (byRegion, region) => byRegion[region] || []
);

export const selectFlowMetrics = createSelector(
  [getFlows, getFlowMetadata],
  (flows, metadata) => {
    if (!flows.length) return null;

    return {
      totalFlows: flows.length,
      averageFlowWeight: _.meanBy(flows, 'flow_weight'),
      maxPriceDifferential: _.maxBy(flows, 'price_differential')?.price_differential,
      averagePriceDifferential: _.meanBy(flows, 'price_differential'),
      marketConnectivity: metadata.uniqueMarkets / 
        (flows.length / metadata.dateCount)
    };
  }
);
