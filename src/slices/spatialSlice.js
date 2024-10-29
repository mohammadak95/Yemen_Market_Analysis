// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { parseISO, isValid } from 'date-fns';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';
import {
  fetchJson,
  mergeSpatialDataWithMapping,
  processData,
  regionMapping,
  excludedRegions,
  mergeResidualsIntoGeoData,
} from '../utils/utils';

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (selectedCommodity, { rejectWithValue }) => {
    try {
      // Fetch data paths
      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unified: getDataPath('unified_data.geojson'),
        weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysis: getDataPath('spatial_analysis_results.json')
      };

      // Fetch JSON data
      const [geoBoundariesData, unifiedData, weightsData, analysisResultsData] = 
        await Promise.all([
          fetchJson(paths.geoBoundaries),
          fetchJson(paths.unified),
          fetchJson(paths.weights),
          fetchJson(paths.analysis)
        ]);

      // Fetch and parse CSV data
      const flowMapsResponse = await fetch(paths.flowMaps);
      if (!flowMapsResponse.ok) {
        throw new Error(`Failed to fetch flow maps data: ${flowMapsResponse.statusText}`);
      }
      const flowMapsText = await flowMapsResponse.text();

      const { data: flowMapsData, errors } = Papa.parse(flowMapsText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      if (errors.length > 0) {
        throw new Error(`Error parsing flow maps CSV: ${errors[0].message}`);
      }

      // Process spatial data
      const mergedData = mergeSpatialDataWithMapping(
        geoBoundariesData,
        unifiedData,
        regionMapping,
        excludedRegions
      );

      const mergedDataWithResiduals = mergeResidualsIntoGeoData(
        mergedData,
        analysisResultsData
      );

      // Extract dates
      const dates = mergedDataWithResiduals.features
        .map(feature => feature.properties.date)
        .filter(dateStr => {
          if (!dateStr) return false;
          const parsedDate = parseISO(dateStr);
          return isValid(parsedDate);
        });

      // Create unique months set
      const uniqueMonthSet = new Set(
        dates.map(dateStr => {
          const parsedDate = parseISO(dateStr);
          return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
        })
      );

      const uniqueMonthDates = Array.from(uniqueMonthSet)
        .map(monthStr => new Date(`${monthStr}-01`))
        .sort((a, b) => a - b);

      const processedGeoData = processData(
        mergedDataWithResiduals,
        unifiedData,
        selectedCommodity
      );

      return {
        geoData: processedGeoData,
        geoBoundaries: geoBoundariesData,
        spatialWeights: weightsData,
        flowMaps: flowMapsData,
        networkData: [],
        analysisResults: analysisResultsData,
        uniqueMonths: uniqueMonthDates,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  geoData: null,
  geoBoundaries: null,
  spatialWeights: null,
  flowMaps: null,
  networkData: null,
  analysisResults: null,
  uniqueMonths: [],
  status: 'idle',
  error: null,
};

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
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
        state.error = action.payload || action.error.message;
      });
  },
});

export default spatialSlice.reducer;