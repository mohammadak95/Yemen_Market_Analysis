// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataPath } from '../utils/dataUtils';
import {
  normalizeRegionName,
  validateSpatialWeights,
  mergeGeoDataChunked,
  regionMapping,
  excludedRegions,
} from '../utils/spatialUtils';
import Papa from 'papaparse';
import { transformCoordinates, processFlowMapWithTransform } from '../utils/coordinateTransforms';

const CHUNK_SIZE = 1000;

// Enhanced fetch with comprehensive error handling
const fetchWithHeaders = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/csv, */*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      mode: 'cors',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(`HTTP error! status: ${response.status}, url: ${url}, details: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType) {
      throw new Error(`Missing content-type header for ${url}`);
    }

    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

// Enhanced date processing with validation
const processDate = (dateString) => {
  if (!dateString || dateString === 'null') return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: "${dateString}"`);
      return null;
    }
    
    // Normalize to first day of month
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  } catch (e) {
    console.warn(`Error processing date: "${dateString}"`, e);
    return null;
  }
};

// Enhanced feature processing with validation
const processFeatures = (features, selectedCommodity) => {
  if (!Array.isArray(features)) {
    console.warn('[processFeatures] Expected features array, received:', typeof features);
    return [];
  }

  return features
    .filter((feature) => {
      if (!feature?.properties || !feature?.geometry) {
        console.warn('Feature missing properties or geometry:', feature);
        return false;
      }

      const commodity = feature.properties.commodity?.toLowerCase();
      return commodity === selectedCommodity?.toLowerCase();
    })
    .map((feature) => {
      const date = processDate(feature.properties.date);
      const regionId = normalizeRegionName(feature.properties.region_id);

      // Transform geometry to Yemen TM
      const transformedGeometry = transformCoordinates.transformGeometry(feature.geometry);
      
      if (!transformedGeometry) {
        console.warn('Failed to transform geometry for feature:', feature);
        return null;
      }

      return {
        ...feature,
        geometry: transformedGeometry,
        properties: {
          ...feature.properties,
          region_id: regionId,
          date,
          usdprice: parseFloat(feature.properties.usdprice) || 0,
          price: parseFloat(feature.properties.price) || 0,
          conflict_intensity: parseFloat(feature.properties.conflict_intensity) || 0,
          // Store coordinate system information
          crs: {
            original: 'EPSG:4326',
            transformed: 'EPSG:2098'
          }
        }
      };
    })
    .filter(feature => feature !== null);
};

// Process flow maps data
const processFlowMaps = (csvData) => {
  return csvData
    .map(row => {
      const processed = processFlowMapWithTransform({
        source_lat: parseFloat(row.source_lat),
        source_lng: parseFloat(row.source_lng),
        target_lat: parseFloat(row.target_lat),
        target_lng: parseFloat(row.target_lng),
        flow_weight: parseFloat(row.flow_weight),
        date: processDate(row.date),
        commodity: row.commodity?.toLowerCase(),
        // Map the source and target columns to region fields
        source_region: normalizeRegionName(row.source),
        target_region: normalizeRegionName(row.target),
        // Add additional price information
        source_price: parseFloat(row.source_price),
        target_price: parseFloat(row.target_price),
        price_differential: parseFloat(row.price_differential)
      });

      // Validate the processed data
      if (!processed.source_region || !processed.target_region) {
        console.warn('Missing region information:', {
          source: row.source,
          target: row.target,
          processed_source: processed.source_region,
          processed_target: processed.target_region
        });
      }

      return processed;
    })
    .filter(flow => {
      // Only keep flows with valid region information
      return flow !== null && 
             flow.source_region && 
             flow.target_region && 
             !isNaN(flow.flow_weight);
    });
};

// Enhanced spatial data fetch
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
      // Define all data paths
      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unified: getDataPath('enhanced_unified_data_with_residual.geojson'),
        weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysis: getDataPath('spatial_analysis_results.json'),
      };

      // Fetch all data in parallel
      const [
        geoBoundariesResponse,
        unifiedResponse,
        weightsResponse,
        analysisResponse,
        flowMapsResponse,
      ] = await Promise.all([
        fetchWithHeaders(paths.geoBoundaries),
        fetchWithHeaders(paths.unified),
        fetchWithHeaders(paths.weights),
        fetchWithHeaders(paths.analysis),
        fetchWithHeaders(paths.flowMaps),
      ]);

      // Parse JSON responses
      [geoBoundariesData, unifiedData, weightsData, analysisResultsData] = await Promise.all([
        geoBoundariesResponse.json(),
        unifiedResponse.json(),
        weightsResponse.json(),
        analysisResponse.json(),
      ]);

      // Parse CSV flow maps data
      const flowMapsText = await flowMapsResponse.text();
      const result = Papa.parse(flowMapsText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        error: (error) => {
          throw new Error(`CSV parsing error: ${error.message}`);
        }
      });

      flowMapsData = processFlowMaps(result.data);

      // Validate spatial weights
      const weightsValidation = validateSpatialWeights(weightsData);
      if (!weightsValidation.isValid) {
        throw new Error(`Invalid spatial weights data: ${weightsValidation.errors.join(', ')}`);
      }

      // Validate geoBoundaries data
      if (!geoBoundariesData?.features?.length) {
        throw new Error('Invalid geoBoundaries data structure');
      }

      // Normalize geoBoundaries
      normalizedGeoBoundaries = {
        type: 'FeatureCollection',
        features: geoBoundariesData.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            region_id: normalizeRegionName(feature.properties.shapeName || feature.properties.region_id),
          },
        })),
      };

      // Validate unified data
      if (!unifiedData?.features?.length) {
        throw new Error('Invalid unified data structure');
      }

      // Process features
      filteredFeatures = processFeatures(unifiedData.features, selectedCommodity);

      if (filteredFeatures.length === 0) {
        throw new Error(`No valid features found for commodity: ${selectedCommodity}`);
      }

      // Merge geodata
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

      // Extract unique months
      uniqueMonthStrings = Array.from(
        new Set(mergedGeoData.features.map((f) => f.properties?.date).filter(Boolean))
      ).sort();

      // Calculate metadata
      const metadata = {
        totalFeatures: mergedGeoData.features.length,
        dataTimestamp: new Date().toISOString(),
        commodityFilter: selectedCommodity,
        processedFeatures: filteredFeatures.length,
        totalDates: uniqueMonthStrings.length,
        flowMapsCount: flowMapsData.length,
        processingTime: performance.now() - startTime,
        coverage: {
          startDate: uniqueMonthStrings[0],
          endDate: uniqueMonthStrings[uniqueMonthStrings.length - 1],
          regionCount: new Set(mergedGeoData.features.map(f => f.properties.region_id)).size
        }
      };

      return {
        geoData: mergedGeoData,
        spatialWeights: weightsData,
        flowMaps: flowMapsData,
        analysisResults: analysisResultsData,
        uniqueMonths: uniqueMonthStrings,
        metadata,
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
            featuresCount: filteredFeatures?.length || 0,
          },
        },
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
};

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    updateLoadingProgress: (state, action) => {
      state.loadingProgress = action.payload;
    },
    resetSpatialState: () => initialState,
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