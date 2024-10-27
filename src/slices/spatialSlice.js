import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';
import { parseISO } from 'date-fns';
import { processDataWithWorker } from '../workers/workerLoader';

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (_, { rejectWithValue }) => {
    try {
      // Define data paths
      const geoBoundariesPath = getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson');
      const geoJsonURL = getDataPath('enhanced_unified_data_with_residual.geojson');
      const spatialWeightsURL = getDataPath('spatial_weights/transformed_spatial_weights.json');
      const flowMapsURL = getDataPath('network_data/time_varying_flows.csv');
      const analysisResultsURL = getDataPath('spatial_analysis_results.json');

      // Fetch all data concurrently
      const [
        geoBoundariesResponse,
        geoJsonResponse,
        weightsResponse,
        flowMapsResponse,
        analysisResultsResponse,
      ] = await Promise.all([
        fetch(geoBoundariesPath, { headers: { Accept: 'application/geo+json' } }),
        fetch(geoJsonURL, { headers: { Accept: 'application/geo+json' } }),
        fetch(spatialWeightsURL, { headers: { Accept: 'application/json' } }),
        fetch(flowMapsURL, { headers: { Accept: 'text/csv' } }),
        fetch(analysisResultsURL, { headers: { Accept: 'application/json' } }),
      ]);

      // Check for successful responses
      if (!geoBoundariesResponse.ok) throw new Error('Failed to fetch GeoBoundaries data.');
      if (!geoJsonResponse.ok) throw new Error('Failed to fetch GeoJSON data.');
      if (!weightsResponse.ok) throw new Error('Failed to fetch spatial weights data.');
      if (!flowMapsResponse.ok) throw new Error('Failed to fetch flow maps data.');
      if (!analysisResultsResponse.ok) throw new Error('Failed to fetch analysis results.');

      // Parse responses
      const [
        geoBoundariesData,
        geoJsonData,
        weightsData,
        flowMapsText,
        analysisResultsData,
      ] = await Promise.all([
        geoBoundariesResponse.json(),
        geoJsonResponse.json(),
        weightsResponse.json(),
        flowMapsResponse.text(),
        analysisResultsResponse.json(),
      ]);

      // Parse Flow Maps CSV using PapaParse
      const { data: flowMapsData, errors: flowMapsErrors } = Papa.parse(flowMapsText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      if (flowMapsErrors.length > 0) {
        throw new Error(`Error parsing flow maps CSV: ${flowMapsErrors[0].message}`);
      }

      // Process data using Web Worker
      const transformedFlowMapsData = await processDataWithWorker({
        type: 'processFlowMaps',
        data: flowMapsData
      });

      const mergedData = await processDataWithWorker({
        type: 'mergeData',
        data: {
          geoBoundariesData,
          geoJsonData
        }
      });

      // Extract unique months
      const dates = mergedData.features
        .map(feature => feature.properties.date)
        .filter(dateStr => {
          if (!dateStr) return false;
          const parsedDate = parseISO(dateStr);
          return !isNaN(parsedDate.getTime());
        });

      const uniqueMonthSet = new Set(
        dates.map(dateStr => {
          const parsedDate = parseISO(dateStr);
          return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
        })
      );

      const uniqueMonthDates = Array.from(uniqueMonthSet)
        .map(monthStr => new Date(`${monthStr}-01`))
        .sort((a, b) => a - b);

      return {
        geoData: mergedData,
        geoBoundaries: geoBoundariesData,
        spatialWeights: weightsData,
        flowMaps: transformedFlowMapsData,
        networkData: [], // Assuming empty or processed similarly
        analysisResults: analysisResultsData,
        uniqueMonths: uniqueMonthDates.length > 0 ? uniqueMonthDates : [],
      };
    } catch (error) {
      console.error('Error in fetchSpatialData:', error);
      return rejectWithValue(error.message || 'An unknown error occurred.');
    }
  }
);

const spatialSlice = createSlice({
  name: 'spatial',
  initialState: {
    geoData: null,
    geoBoundaries: null,
    spatialWeights: null,
    flowMaps: null,
    networkData: null,
    analysisResults: null,
    uniqueMonths: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.geoData = action.payload.geoData;
        state.geoBoundaries = action.payload.geoBoundaries;
        state.spatialWeights = action.payload.spatialWeights;
        state.flowMaps = action.payload.flowMaps;
        state.networkData = action.payload.networkData;
        state.analysisResults = action.payload.analysisResults;
        state.uniqueMonths = action.payload.uniqueMonths;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Failed to fetch spatial data.';
      });
  },
});

export default spatialSlice.reducer;