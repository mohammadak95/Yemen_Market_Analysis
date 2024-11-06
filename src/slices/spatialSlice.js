//src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { getDataPath } from '../utils/dataUtils';
import {
  normalizeRegionName,
  mergeSpatialDataWithMapping,
  extractUniqueMonths,
} from '../utils/spatialUtils';
import { transformCoordinates } from '../utils/coordinateTransforms';

const initialState = {
  geoData: null,
  spatialWeights: null,
  flowMaps: null,
  analysisResults: null,
  uniqueMonths: [],
  status: 'idle',
  error: null,
  lastUpdated: null,
  loadingProgress: 0,
};

// Helper function to normalize dates
const normalizeDate = (dateString) => {
  if (!dateString) return null;
  try {
    // Handle different date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    // Return ISO string but truncate to just the date portion
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`Invalid date format: ${dateString}`);
    return null;
  }
};

// Helper function to safely monitor async operations
const monitoredFetch = async (path, description) => {
  const metric = {
    startTime: Date.now(),
    path,
    description
  };
  
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${description}: ${response.statusText}`);
    }
    
    // Handle different response types
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    backgroundMonitor.logMetric('data-fetch', {
      path,
      description,
      duration: Date.now() - metric.startTime,
      success: true,
      contentType
    });
    
    return data;
  } catch (error) {
    backgroundMonitor.logError('data-fetch', {
      path,
      description,
      error: error.message,
      duration: Date.now() - metric.startTime
    });
    throw error;
  }
};

// Helper for progress updates
const updateProgressWithLog = (dispatch, progress, description) => {
  backgroundMonitor.logMetric('progress-update', { 
    progress, 
    description,
    timestamp: new Date().toISOString()
  });
  dispatch(updateLoadingProgress(progress));
};

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (_, { dispatch, rejectWithValue }) => {
    const mainMetric = {
      startTime: Date.now(),
      commodity: 'beans (kidney red)'
    };

    try {
      updateProgressWithLog(dispatch, 10, 'Starting data fetch');
      
      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unifiedData: getDataPath('enhanced_unified_data_with_residual.geojson'),
        spatialWeights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysisResults: getDataPath('spatial_analysis_results.json'),
      };

      // Fetch geoBoundaries data
      const geoBoundariesData = await monitoredFetch(paths.geoBoundaries, 'geoBoundaries');
      if (!geoBoundariesData.features || !Array.isArray(geoBoundariesData.features)) {
        throw new Error('Invalid geoBoundaries data structure');
      }
      updateProgressWithLog(dispatch, 30, 'GeoBoundaries data loaded');

      // Fetch unified data
      const unifiedData = await monitoredFetch(paths.unifiedData, 'unifiedData');
      if (!unifiedData.features || !Array.isArray(unifiedData.features)) {
        throw new Error('Invalid unified data structure');
      }
      updateProgressWithLog(dispatch, 50, 'Unified data loaded');

      // Fetch spatial weights
      const spatialWeightsData = await monitoredFetch(paths.spatialWeights, 'spatialWeights');
      if (!spatialWeightsData || typeof spatialWeightsData !== 'object') {
        throw new Error('Invalid spatial weights data structure');
      }
      updateProgressWithLog(dispatch, 60, 'Spatial weights loaded');

      // Fetch analysis results
      const analysisResultsData = await monitoredFetch(paths.analysisResults, 'analysisResults');
      updateProgressWithLog(dispatch, 70, 'Analysis results loaded');

      // Fetch and parse flow maps CSV
      const flowMapsText = await monitoredFetch(paths.flowMaps, 'flowMaps');
      updateProgressWithLog(dispatch, 80, 'Flow maps loaded');

      const flowMapsResult = Papa.parse(flowMapsText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        transform: (value) => {
          if (typeof value === 'string') {
            return value.trim();
          }
          return value;
        }
      });

      if (flowMapsResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', flowMapsResult.errors);
      }

      // Process unified data features
      unifiedData.features = unifiedData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          region_id: normalizeRegionName(feature.properties.region_id || feature.properties.admin1),
          date: normalizeDate(feature.properties.date),
          usdprice: parseFloat(feature.properties.usdprice) || 0,
          price: parseFloat(feature.properties.price) || 0,
          conflict_intensity: parseFloat(feature.properties.conflict_intensity) || 0
        }
      })).filter(feature => feature.properties.date && !isNaN(feature.properties.usdprice));

      // Process flow maps data
      const processedFlowMaps = flowMapsResult.data
        .map(row => {
          try {
            const sourceLng = parseFloat(row.source_lng);
            const sourceLat = parseFloat(row.source_lat);
            const targetLng = parseFloat(row.target_lng);
            const targetLat = parseFloat(row.target_lat);

            if (isNaN(sourceLng) || isNaN(sourceLat) || isNaN(targetLng) || isNaN(targetLat)) {
              console.warn('Invalid coordinates in flow map row:', row);
              return null;
            }

            return {
              ...row,
              source: normalizeRegionName(row.source),
              target: normalizeRegionName(row.target),
              date: normalizeDate(row.date),
              price_differential: parseFloat(row.price_differential) || 0,
              source_price: parseFloat(row.source_price) || 0,
              target_price: parseFloat(row.target_price) || 0,
              flow_weight: parseFloat(row.flow_weight) || 0,
              sourceCoordinates: transformCoordinates.toWGS84(sourceLng, sourceLat, 'EPSG:32638'),
              targetCoordinates: transformCoordinates.toWGS84(targetLng, targetLat, 'EPSG:32638')
            };
          } catch (error) {
            console.warn('Error processing flow map row:', error);
            return null;
          }
        })
        .filter(Boolean); // Remove null entries

      // Process and merge the data
      const processedData = {
        geoData: await mergeSpatialDataWithMapping(
          geoBoundariesData,
          unifiedData,
          {},
          [],
          1000
        ),
        spatialWeights: spatialWeightsData,
        flowMaps: processedFlowMaps,
        analysisResults: analysisResultsData,
      };

      // Extract unique months after data is processed
      processedData.uniqueMonths = extractUniqueMonths(processedData.geoData.features)
        .sort((a, b) => new Date(a) - new Date(b));
      
      updateProgressWithLog(dispatch, 90, 'Data processing complete');

      backgroundMonitor.logMetric('spatial-fetch-complete', {
        duration: Date.now() - mainMetric.startTime,
        dataSize: JSON.stringify(processedData).length,
        featureCount: processedData.geoData.features.length,
        flowCount: processedData.flowMaps.length,
        monthCount: processedData.uniqueMonths.length
      });

      if (monitoring && monitoring.finish) {
        monitoring.finish();
      }

      return processedData;

    } catch (error) {
      backgroundMonitor.logError('spatial-fetch-error', {
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        duration: Date.now() - mainMetric.startTime
      });
      if (monitoring && monitoring.finish) {
        monitoring.finish('spatial-fetch-error', { error: error.message });
      }
      return rejectWithValue({
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      });
    }
  }
);

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    updateLoadingProgress: (state, action) => {
      state.loadingProgress = action.payload;
    },
    resetSpatialState: () => initialState,
    updateMetadata: (state, action) => {
      state.metadata = {
        ...(state.metadata || {}),
        ...action.payload,
        lastUpdated: new Date().toISOString(),
      };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.loadingProgress = 0;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.geoData = action.payload.geoData;
        state.spatialWeights = action.payload.spatialWeights;
        state.flowMaps = action.payload.flowMaps;
        state.analysisResults = action.payload.analysisResults;
        state.uniqueMonths = action.payload.uniqueMonths;
        state.loadingProgress = 100;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error?.message || 'An unknown error occurred';
        state.loadingProgress = 0;
      });
  },
});

export const {
  updateLoadingProgress,
  resetSpatialState,
  updateMetadata,
  clearError,
} = spatialSlice.actions;

export const selectSpatialData = (state) => ({
  geoData: state.spatial.geoData,
  spatialWeights: state.spatial.spatialWeights,
  flowMaps: state.spatial.flowMaps,
  analysisResults: state.spatial.analysisResults,
  uniqueMonths: state.spatial.uniqueMonths,
});

export const selectSpatialStatus = (state) => ({
  status: state.spatial.status,
  error: state.spatial.error,
  loadingProgress: state.spatial.loadingProgress,
  lastUpdated: state.lastUpdated,
});

export const selectAnalysisResults = (state) => state.spatial.analysisResults;

export default spatialSlice.reducer;