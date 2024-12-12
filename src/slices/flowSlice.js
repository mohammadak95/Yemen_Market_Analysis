// src/slices/flowSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
    lastFetch: null
  }
};

// Async thunk for loading flow data
export const fetchFlowData = createAsyncThunk(
  'flow/fetchData',
  async ({ commodity, date }, { rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('flow-data-fetch');
    
    try {
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
      state.flows = [];
      state.byDate = {};
      state.byRegion = {};
      state.metadata = { ...initialState.metadata };
    },
    updateFlowMetrics: (state, action) => {
      state.metadata = {
        ...state.metadata,
        ...action.payload
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFlowData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchFlowData.fulfilled, (state, action) => {
        state.flows = action.payload.flows;
        state.byDate = action.payload.byDate;
        state.byRegion = action.payload.byRegion;
        state.metadata = action.payload.metadata;
        state.status = {
          loading: false,
          error: null,
          lastFetch: new Date().toISOString()
        };
      })
      .addCase(fetchFlowData.rejected, (state, action) => {
        state.status = {
          loading: false,
          error: action.payload,
          lastFetch: new Date().toISOString()
        };
      });
  }
});

// Export actions and reducer
export const { clearFlowData, updateFlowMetrics } = flowSlice.actions;
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

// Hook for flow data management
export const useFlowData = (commodity, date) => {
  const dispatch = useDispatch();
  const flowState = useSelector(selectFlowState);
  const { loading, error } = useSelector(selectFlowStatus);

  useEffect(() => {
    if (!commodity || !date) return;

    const loadData = async () => {
      await dispatch(fetchFlowData({ commodity, date }));
    };

    loadData();
  }, [commodity, date, dispatch]);

  return {
    flows: flowState.flows,
    byDate: flowState.byDate,
    byRegion: flowState.byRegion,
    metadata: flowState.metadata,
    loading,
    error
  };
};
