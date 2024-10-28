// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchJson,
  mergeSpatialDataWithMapping,
  processData,
  regionMapping,
  excludedRegions,
} from '../utils/utils';
import Papa from 'papaparse';
import { parseISO, isValid } from 'date-fns';
import { getDataPath } from '../utils/dataPath.js';

const mergeResidualsIntoGeoData = (geoJsonData, residualsData) => {
  if (!geoJsonData || !residualsData) {
    console.warn('mergeResidualsIntoGeoData received invalid arguments');
    return geoJsonData;
  }

  geoJsonData.features.forEach((feature) => {
    const region = feature.properties.region_id || 
                  (feature.properties.ADM1_EN ? feature.properties.ADM1_EN.toLowerCase() : null);
    const date = feature.properties.date;
  
    if (region && date && residualsData[region] && residualsData[region][date]) {
      feature.properties.residual = residualsData[region][date];
    } else {
      feature.properties.residual = null;
    }
  
    // Ensure date is a string before calling split
    if (date && typeof date === 'string') {
      const dateParts = date.split('T');
      feature.properties.date = dateParts[0]; // Assuming you need only the date part
    } else {
      feature.properties.date = null;
    }
  });
  
  return geoJsonData;
  };

  export const fetchSpatialData = createAsyncThunk(
    'spatial/fetchSpatialData',
    async (selectedCommodity, { rejectWithValue }) => {
      try {
        const geoBoundariesPath = getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson');
        const unifiedDataPath = getDataPath('unified_data.geojson');
        const weightsPath = getDataPath('spatial_weights/transformed_spatial_weights.json');
        const flowMapsPath = getDataPath('network_data/time_varying_flows.csv');
        const analysisResultsPath = getDataPath('spatial_analysis_results.json');
  
        const [geoBoundariesData, unifiedData, weightsData, analysisResultsData] = await Promise.all([
          fetchJson(geoBoundariesPath),
          fetchJson(unifiedDataPath),
          fetchJson(weightsPath),
          fetchJson(analysisResultsPath),
        ]);

      const flowMapsResponse = await fetch(flowMapsPath);
      if (!flowMapsResponse.ok) {
        throw new Error(`Failed to fetch flow maps data: ${flowMapsResponse.statusText}`);
      }
      const flowMapsText = await flowMapsResponse.text();

      const parsedFlowMaps = Papa.parse(flowMapsText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      if (parsedFlowMaps.errors.length > 0) {
        throw new Error(`Error parsing flow maps CSV: ${parsedFlowMaps.errors[0].message}`);
      }

      const flowMapsData = parsedFlowMaps.data;

      const mergedData = mergeSpatialDataWithMapping(
        geoBoundariesData,
        unifiedData,
        regionMapping,
        excludedRegions
      );

      const mergedDataWithResiduals = mergeResidualsIntoGeoData(mergedData, analysisResultsData);

      const dates = mergedDataWithResiduals.features
        .map((feature) => feature.properties.date)
        .filter((dateStr) => {
          if (!dateStr) return false;
          const parsedDate = parseISO(dateStr);
          return isValid(parsedDate);
        });

      const uniqueMonthSet = new Set(
        dates.map((dateStr) => {
          const parsedDate = parseISO(dateStr);
          return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
        })
      );

      const uniqueMonthDates = Array.from(uniqueMonthSet)
        .map((monthStr) => new Date(`${monthStr}-01`))
        .sort((a, b) => a - b);

      const processedGeoData = processData(mergedDataWithResiduals, unifiedData, selectedCommodity);

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