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

// Date utilities for consistent handling
const dateUtils = {
  toFlowDate: (date) => {
    if (!date) return null;
    return date.length === 7 ? `${date}-01` : date;
  },
  
  toSpatialDate: (date) => {
    if (!date) return null;
    return date.substring(0, 7);
  },
  
  datesMatch: (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.substring(0, 7) === date2.substring(0, 7);
  }
};

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
    uniqueMarkets: 0,
    dataQuality: {
      validFlows: 0,
      invalidFlows: 0,
      processingErrors: []
    }
  },
  status: {
    loading: false,
    error: null,
    lastFetch: null,
    loadedData: {},
    processingProgress: 0
  }
};

// Validation utilities
const flowValidation = {
  isValidFlow: (flow) => {
    return flow &&
      typeof flow.source === 'string' &&
      typeof flow.target === 'string' &&
      typeof flow.flow_weight === 'number' &&
      !isNaN(flow.flow_weight) &&
      flow.flow_weight >= 0;
  },
  
  isValidDate: (date) => {
    if (!date) return false;
    const parsed = new Date(date);
    return parsed instanceof Date && !isNaN(parsed);
  },
  
  hasValidCoordinates: (flow) => {
    return flow &&
      typeof flow.source_lng === 'number' &&
      typeof flow.source_lat === 'number' &&
      typeof flow.target_lng === 'number' &&
      typeof flow.target_lat === 'number';
  }
};

// Async thunk for fetching flow data
export const fetchFlowData = createAsyncThunk(
  'flow/fetchData',
  async ({ commodity, date }, { getState, rejectWithValue, dispatch }) => {
    const metric = backgroundMonitor.startMetric('flow-data-fetch');
    const errors = [];
    
    try {
      // Ensure date is in YYYY-MM-DD format
      const flowDate = dateUtils.toFlowDate(date);
      
      if (!commodity || !flowDate) {
        throw new Error('Invalid parameters', { commodity, date });
      }

      console.debug('Fetching flow data:', { commodity, date: flowDate });

      const flowDataPath = getNetworkDataPath('time_varying_flows.csv');

      // Fetch and parse CSV data with retries
      const response = await retryWithBackoff(async () => {
        const res = await fetch(flowDataPath);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.text();
      });

      const data = await new Promise((resolve, reject) => {
        Papa.parse(response, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results),
          error: (error) => reject(error)
        });
      });

      // Filter for matching commodity and date
      const filteredData = data.data.filter(flow => {
        const commodityMatch = flow.commodity?.toLowerCase() === commodity?.toLowerCase();
        const dateMatch = dateUtils.datesMatch(flow.date, flowDate);
        return commodityMatch && dateMatch;
      });

      console.debug('Filtered data:', {
        total: data.data.length,
        filtered: filteredData.length,
        commodity,
        date: flowDate
      });

      // Process flows with validation and error handling
      const processedFlows = filteredData
        .map(flow => {
          try {
            if (!flowValidation.isValidFlow(flow)) return null;

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
            errors.push({ flow, error: error.message });
            return null;
          }
        })
        .filter(Boolean);

      // Group flows by date and region
      const byDate = _.groupBy(processedFlows, flow => 
        dateUtils.toSpatialDate(flow.date)
      );
      
      const byRegion = _.groupBy(processedFlows, 'source');

      // Calculate metadata
      const uniqueMarkets = new Set([
        ...processedFlows.map(f => f.source),
        ...processedFlows.map(f => f.target)
      ]);

      const result = {
        flows: processedFlows,
        byDate,
        byRegion,
        metadata: {
          lastUpdated: new Date().toISOString(),
          dateRange: {
            start: dateUtils.toSpatialDate(flowDate),
            end: dateUtils.toSpatialDate(flowDate)
          },
          commodity,
          totalFlows: processedFlows.length,
          uniqueMarkets: uniqueMarkets.size,
          dataQuality: {
            validFlows: processedFlows.length,
            invalidFlows: filteredData.length - processedFlows.length,
            processingErrors: errors
          }
        }
      };

      metric.finish({ 
        status: 'success',
        flowCount: processedFlows.length,
        commodity,
        date: flowDate
      });

      return result;

    } catch (error) {
      console.error('Error fetching flow data:', error);
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

// Create the slice
const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    clearFlowData: () => initialState,
    updateFlowMetrics: (state, action) => {
      state.metadata = {
        ...state.metadata,
        ...action.payload
      };
    },
    resetFlowError: (state) => {
      state.status.error = null;
    },
    updateProgress: (state, action) => {
      state.status.processingProgress = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFlowData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.processingProgress = 0;
      })
      .addCase(fetchFlowData.fulfilled, (state, action) => {
        const { flows, byDate, byRegion, metadata } = action.payload;
        state.flows = flows;
        state.byDate = byDate;
        state.byRegion = byRegion;
        state.metadata = {
          ...metadata,
          lastUpdated: new Date().toISOString()
        };
        state.status = {
          loading: false,
          error: null,
          lastFetch: new Date().toISOString(),
          loadedData: {
            ...state.status.loadedData,
            [`${metadata.commodity}-${metadata.dateRange.start}`]: true
          },
          processingProgress: 1
        };
      })
      .addCase(fetchFlowData.rejected, (state, action) => {
        state.status = {
          ...state.status,
          loading: false,
          error: action.payload,
          lastFetch: new Date().toISOString(),
          processingProgress: 0
        };
      });
  }
});

// Optimized selectors
const selectFlowDomain = state => state.flow || initialState;
const selectFlowsArray = state => selectFlowDomain(state).flows;
const selectFlowsByDateMap = state => selectFlowDomain(state).byDate;
const selectFlowsByRegionMap = state => selectFlowDomain(state).byRegion;
const selectFlowMetadataState = state => selectFlowDomain(state).metadata;
const selectFlowStatusState = state => selectFlowDomain(state).status;

export const selectFlowState = createSelector(
  [selectFlowDomain],
  flowState => ({
    ...flowState,
    metadata: {
      ...flowState.metadata,
      lastChecked: new Date().toISOString()
    }
  })
);

export const selectFlowStatus = createSelector(
  [selectFlowStatusState],
  status => ({
    loading: status.loading,
    error: status.error,
    progress: status.processingProgress
  })
);

export const selectFlowMetadata = createSelector(
  [selectFlowMetadataState],
  metadata => ({
    ...metadata,
    lastChecked: new Date().toISOString()
  })
);

export const selectFlowsByDate = createSelector(
  [selectFlowsByDateMap, (_, date) => date],
  (byDate, date) => {
    if (!date) return [];
    const spatialDate = dateUtils.toSpatialDate(date);
    return byDate[spatialDate] || [];
  }
);

export const selectFlowsByRegion = createSelector(
  [selectFlowsByRegionMap, (_, region) => region],
  (byRegion, region) => byRegion[region] || []
);

export const selectFlowMetrics = createSelector(
  [selectFlowsArray, selectFlowMetadataState],
  (flows, metadata) => {
    if (!flows.length) return null;

    const validFlows = flows.filter(flow => flow.flow_weight > 0);
    const totalWeight = validFlows.reduce((sum, flow) => sum + flow.flow_weight, 0);
    const avgWeight = validFlows.length > 0 ? totalWeight / validFlows.length : 0;

    return {
      totalFlows: validFlows.length,
      averageFlowWeight: avgWeight,
      maxPriceDifferential: Math.max(...validFlows.map(f => f.price_differential || 0)),
      averagePriceDifferential: validFlows.reduce((sum, f) => 
        sum + (f.price_differential || 0), 0) / validFlows.length,
      marketConnectivity: metadata.uniqueMarkets > 0
        ? validFlows.length / metadata.uniqueMarkets
        : 0,
      dataQuality: metadata.dataQuality
    };
  }
);

export const { 
  clearFlowData, 
  updateFlowMetrics, 
  resetFlowError,
  updateProgress 
} = flowSlice.actions;

export default flowSlice.reducer;