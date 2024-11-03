// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataPath } from '../utils/dataPath';
import {
  normalizeRegionName,
  validateSpatialWeights,
  mergeGeoDataChunked
} from '../utils/spatialUtils';
import { regionMapping, excludedRegions } from '../utils/spatialUtils';
import Papa from 'papaparse';

const CHUNK_SIZE = 1000;

const fetchWithHeaders = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/csv, */*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      mode: 'cors',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

// Enhanced date processing
const processDate = (dateString) => {
  if (!dateString || dateString === 'null') return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  } catch (e) {
    console.warn(`[processDate] Error processing date: "${dateString}"`, e);
    return null;
  }
};

const processFeatures = (features, selectedCommodity) => {
  if (!Array.isArray(features)) {
    console.warn('[processFeatures] Expected features array, received:', typeof features);
    return [];
  }

  return features
    .filter(feature => {
      const commodity = feature.properties?.commodity?.toLowerCase();
      return commodity === selectedCommodity?.toLowerCase();
    })
    .map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        date: processDate(feature.properties.date),
        usdprice: Number(feature.properties.usdprice) || 0,
        price: Number(feature.properties.price) || 0,
        conflict_intensity: Number(feature.properties.conflict_intensity) || 0
      }
    }))
    .filter(feature => feature.properties.date !== null);
};

export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (selectedCommodity, { rejectWithValue }) => {
    console.debug(`[fetchSpatialData] Initiated with selectedCommodity: "${selectedCommodity}"`);

    let geoBoundariesData = null;
    let unifiedData = null;
    let weightsData = null;
    let analysisResultsData = null;
    let flowMapsData = [];
    let filteredFeatures = [];
    let mergedGeoData = null;
    let normalizedGeoBoundaries = null;
    let uniqueMonthStrings = [];

    const startTime = performance.now();

    try {
      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unified: getDataPath('unified_data.geojson'),
        weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysis: getDataPath('spatial_analysis_results.json')
      };

      // Fetch all data in parallel with proper headers
      const [geoBoundariesResponse, unifiedResponse, weightsResponse, analysisResponse] = 
        await Promise.all([
          fetchWithHeaders(paths.geoBoundaries),
          fetchWithHeaders(paths.unified),
          fetchWithHeaders(paths.weights),
          fetchWithHeaders(paths.analysis)
        ]);

      // Parse JSON responses
      [geoBoundariesData, unifiedData, weightsData, analysisResultsData] = 
        await Promise.all([
          geoBoundariesResponse.json(),
          unifiedResponse.json(),
          weightsResponse.json(),
          analysisResponse.json()
        ]);

      // Validate weights data
      const weightsValidation = validateSpatialWeights(weightsData);
      if (!weightsValidation.isValid) {
        throw new Error(`Invalid spatial weights data: ${weightsValidation.errors.join(', ')}`);
      }

      // Process flow maps
      const flowMapsResponse = await fetchWithHeaders(paths.flowMaps);
      const flowMapsText = await flowMapsResponse.text();
      const result = Papa.parse(flowMapsText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });

      flowMapsData = result.data;

      if (!geoBoundariesData?.features?.length) {
        throw new Error('Invalid geoBoundaries data structure');
      }

      normalizedGeoBoundaries = {
        type: 'FeatureCollection',
        features: geoBoundariesData.features.map(feature => ({
          ...feature,
          properties: {
            ...feature.properties,
            region_id: normalizeRegionName(feature.properties.shapeName || feature.properties.region_id),
          },
        }))
      };

      if (!unifiedData?.features?.length) {
        throw new Error('Invalid unified data structure');
      }

      filteredFeatures = processFeatures(unifiedData.features, selectedCommodity);

      mergedGeoData = await mergeGeoDataChunked(
        normalizedGeoBoundaries,
        { ...unifiedData, features: filteredFeatures },
        regionMapping,
        excludedRegions,
        CHUNK_SIZE
      );

      if (!mergedGeoData?.features) {
        throw new Error('Failed to merge geodata');
      }

      uniqueMonthStrings = Array.from(new Set(
        mergedGeoData.features
          .map(f => f.properties?.date)
          .filter(Boolean)
      )).sort();

      const metadata = {
        totalFeatures: mergedGeoData.features.length,
        dataTimestamp: new Date().toISOString(),
        commodityFilter: selectedCommodity,
        processedFeatures: filteredFeatures.length,
        totalDates: uniqueMonthStrings.length,
        flowMapsCount: flowMapsData.length,
        processingTime: performance.now() - startTime
      };

      return {
        geoData: mergedGeoData,
        spatialWeights: weightsData,
        flowMaps: flowMapsData,
        analysisResults: analysisResultsData,
        uniqueMonths: uniqueMonthStrings,
        metadata
      };

    } catch (error) {
      console.error('[fetchSpatialData] Error:', error);
      return rejectWithValue({
        message: error.message,
        details: {
          availableData: {
            hasGeoBoundaries: !!geoBoundariesData,
            hasUnified: !!unifiedData,
            hasWeights: !!weightsData,
            hasAnalysis: !!analysisResultsData,
            flowMapsCount: flowMapsData?.length || 0,
            featuresCount: filteredFeatures?.length || 0
          }
        }
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
  loadingProgress: 0
};

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    updateLoadingProgress: (state, action) => {
      state.loadingProgress = action.payload;
    },
    resetSpatialState: () => initialState
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
        state.metadata = action.payload.metadata;
        state.loadingProgress = 100;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
        state.loadingProgress = 0;
      });
  },
});

export const { updateLoadingProgress, resetSpatialState } = spatialSlice.actions;

export default spatialSlice.reducer;