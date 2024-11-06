// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { parseISO, isValid } from 'date-fns';
import { transformCoordinates } from '../utils/coordinateTransforms';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { dataLoadingMonitor, monitoredFetch, monitoredProcess } from '../utils/dataMonitoring';
import Papa from 'papaparse';

// Function to get data paths
const getDataPath = (fileName) => {
  const BASE_PATH = process.env.NODE_ENV === 'development' ? '' : process.env.PUBLIC_URL || '';
  return `${BASE_PATH}/results/${fileName.replace(/^\/+/, '')}`;
};

// Process GeoJSON features based on selected commodity
const processFeatures = (features, selectedCommodity) => {
  return features
    .filter(feature => {
      const commodity = feature.properties?.commodity?.toLowerCase();
      return commodity === selectedCommodity?.toLowerCase();
    })
    .map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        date: feature.properties.date ? 
          new Date(feature.properties.date).toISOString() : null,
        usdprice: parseFloat(feature.properties.usdprice) || 0,
        price: parseFloat(feature.properties.price) || 0,
        conflict_intensity: parseFloat(feature.properties.conflict_intensity) || 0,
      },
      geometry: transformCoordinates.transformGeometry(feature.geometry),
    }))
    .filter(feature => feature.properties.date !== null);
};

// Process flow maps data based on selected commodity
const processFlowData = (flowData, selectedCommodity) => {
  return flowData
    .filter(row => row.commodity?.toLowerCase() === selectedCommodity?.toLowerCase())
    .map(row => ({
      source_region: row.source,
      target_region: row.target,
      value: parseFloat(row.flow_weight) || 0,
      date: row.date ? new Date(row.date).toISOString() : null,
      source_price: parseFloat(row.source_price) || 0,
      target_price: parseFloat(row.target_price) || 0,
      price_differential: parseFloat(row.price_differential) || 0,
    }))
    .filter(flow => !isNaN(flow.value) && flow.date && isValid(new Date(flow.date)));
};

// Thunk to fetch spatial data
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (selectedCommodity, { dispatch, rejectWithValue }) => {
    console.log('Fetching spatial data for commodity:', selectedCommodity);
    const monitoring = backgroundMonitor.logMetric('spatial-fetch', {
      commodity: selectedCommodity,
      timestamp: new Date().toISOString(),
    });

    try {
      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unified: getDataPath('enhanced_unified_data_with_residual.geojson'),
        weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysis: getDataPath('spatial_analysis_results.json'),
      };

      console.log('Fetching from paths:', paths);
      dispatch(updateLoadingProgress(10));

      // Fetch all data using monitoredFetch
      const [
        geoBoundariesData,
        unifiedData,
        weightsData,
        flowMapsData,
        analysisData,
      ] = await Promise.all([
        monitoredFetch(paths.geoBoundaries),
        monitoredFetch(paths.unified),
        monitoredFetch(paths.weights),
        monitoredFetch(paths.flowMaps),
        monitoredFetch(paths.analysis),
      ]);

      dispatch(updateLoadingProgress(40));

      console.log('Data fetched successfully, processing...');

      // Process data using monitoredProcess
      const processedFeatures = await monitoredProcess(
        processFeatures,
        unifiedData.features,
        { type: 'process', name: 'processFeatures' }
      );

      const processedFlows = await monitoredProcess(
        processFlowData,
        flowMapsData,
        { type: 'process', name: 'processFlowData' }
      );

      // Extract unique months from processed features
      const uniqueMonths = Array.from(new Set(
        processedFeatures
          .map(f => f.properties.date.substring(0, 7))
          .filter(Boolean)
      )).sort();

      dispatch(updateLoadingProgress(70));

      const result = {
        geoData: {
          type: 'FeatureCollection',
          features: processedFeatures,
        },
        flowMaps: processedFlows,
        spatialWeights: weightsData,
        analysisResults: analysisData,
        uniqueMonths,
        metadata: {
          featureCount: processedFeatures.length,
          flowCount: processedFlows.length,
          dataTimestamp: new Date().toISOString(),
          commodity: selectedCommodity,
        },
      };

      dispatch(updateLoadingProgress(100));
      if (monitoring && monitoring.finish) {
        monitoring.finish();
      }

      console.log('Processing complete:', {
        features: result.geoData.features.length,
        flows: result.flowMaps.length,
        months: result.uniqueMonths.length,
      });

      return result;
    } catch (error) {
      console.error('Error fetching spatial data:', error);
      monitoring.logError(error);
      if (monitoring && monitoring.finish) {
        monitoring.finish('spatial-fetch-error', { error: error.message });
      }
      return rejectWithValue({
        message: 'Failed to fetch spatial data',
        details: error.message,
      });
    }
  }
);

const initialState = {
  geoData: null,
  spatialWeights: null,
  flowMaps: null,
  analysisResults: null,
  uniqueMonths: [],
  status: 'idle',
  error: null,
  metadata: null,
  loadingProgress: 0,
  lastUpdated: null,
};

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    updateLoadingProgress: (state, action) => {
      state.loadingProgress = action.payload;
      if (state.status === 'idle') {
        state.status = 'loading';
      }
    },
    resetSpatialState: () => ({
      ...initialState,
      lastUpdated: new Date().toISOString(),
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        console.log('fetchSpatialData: pending');
        state.status = 'loading';
        state.error = null;
        state.loadingProgress = 0;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        console.log('fetchSpatialData: fulfilled');
        return {
          ...state,
          ...action.payload,
          status: 'succeeded',
          error: null,
          loadingProgress: 100,
          lastUpdated: new Date().toISOString(),
        };
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        console.log('fetchSpatialData: rejected', action.payload);
        state.status = 'failed';
        state.error = action.payload;
        state.loadingProgress = 0;
      });
  },
});

// Selectors
export const selectSpatialStatus = (state) => ({
  status: state.spatial.status,
  error: state.spatial.error,
  loadingProgress: state.spatial.loadingProgress,
  lastUpdated: state.spatial.lastUpdated,
});

export const selectSpatialData = (state) => ({
  geoData: state.spatial.geoData,
  flowMaps: state.spatial.flowMaps,
  spatialWeights: state.spatial.spatialWeights,
  analysisResults: state.spatial.analysisResults,
  uniqueMonths: state.spatial.uniqueMonths,
  metadata: state.spatial.metadata,
});

// Export actions and reducer
export const { updateLoadingProgress, resetSpatialState } = spatialSlice.actions;
export default spatialSlice.reducer;
