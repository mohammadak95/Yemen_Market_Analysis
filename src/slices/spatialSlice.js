// src/store/spatialSlice.js

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
import {
  transformCoordinates,
  processFlowMapWithTransform,
} from '../utils/coordinateTransforms';
import { parseISO, isValid } from 'date-fns';

const CHUNK_SIZE = 1000;

// Single instance for request tracking
const requestTracker = {
  pending: new Map(),
  cache: new Map(),
  clear() {
    this.pending.clear();
    this.cache.clear();
  },
};

// Fetch with built-in deduplication
const fetchWithDeduplication = async (url, options = {}) => {
  const key = `${url}_${JSON.stringify(options)}`;

  if (requestTracker.pending.has(key)) {
    return requestTracker.pending.get(key);
  }

  const promise = fetch(url, {
    ...options,
    headers: {
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  });

  requestTracker.pending.set(key, promise);

  try {
    const response = await promise;
    return response;
  } finally {
    requestTracker.pending.delete(key);
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

// Enhanced feature processing with commodity filtering
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

      return {
        ...feature,
        properties: {
          ...feature.properties,
          region_id: regionId,
          date,
          usdprice: parseFloat(feature.properties.usdprice) || 0,
          price: parseFloat(feature.properties.price) || 0,
          conflict_intensity: parseFloat(feature.properties.conflict_intensity) || 0,
        },
      };
    })
    .filter((feature) => feature !== null);
};

// Process flow maps data with commodity filtering
const processFlowMaps = (csvData, selectedCommodity) => {
  return csvData
    .filter((row) => {
      const commodity = row.commodity?.toLowerCase();
      return commodity === selectedCommodity?.toLowerCase();
    })
    .map((row) => {
      const processed = processFlowMapWithTransform({
        source_lat: parseFloat(row.source_lat),
        source_lng: parseFloat(row.source_lng),
        target_lat: parseFloat(row.target_lat),
        target_lng: parseFloat(row.target_lng),
        flow_weight: parseFloat(row.flow_weight),
        date: processDate(row.date),
        commodity: row.commodity?.toLowerCase(),
        source_region: normalizeRegionName(row.source),
        target_region: normalizeRegionName(row.target),
        source_price: parseFloat(row.source_price),
        target_price: parseFloat(row.target_price),
        price_differential: parseFloat(row.price_differential),
      });

      if (!processed.source_region || !processed.target_region) {
        console.warn('Missing region information:', {
          source: row.source,
          target: row.target,
          processed_source: processed.source_region,
          processed_target: processed.target_region,
        });
      }

      return processed;
    })
    .filter((flow) => {
      return (
        flow !== null &&
        flow.source_region &&
        flow.target_region &&
        !isNaN(flow.flow_weight)
      );
    });
};

// Process all data in a single function to ensure consistency
const processAllData = async (
  geoBoundariesData,
  unifiedData,
  weightsData,
  flowMapsData,
  analysisData,
  selectedCommodity
) => {
  // Validate weights
  const weightsValidation = validateSpatialWeights(weightsData);
  if (!weightsValidation.isValid) {
    throw new Error(`Invalid spatial weights: ${weightsValidation.errors.join(', ')}`);
  }

  // Process features with commodity filtering
  const filteredFeatures = processFeatures(unifiedData.features, selectedCommodity);

  if (!filteredFeatures.length) {
    throw new Error(`No features found for commodity: ${selectedCommodity}`);
  }

  // Normalize boundaries
  const normalizedBoundaries = {
    type: 'FeatureCollection',
    features: geoBoundariesData.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        region_id: normalizeRegionName(
          feature.properties.shapeName || feature.properties.region_id
        ),
      },
    })),
  };

  // Merge data
  const mergedGeoData = await mergeGeoDataChunked(
    normalizedBoundaries,
    { ...unifiedData, features: filteredFeatures },
    regionMapping,
    excludedRegions,
    CHUNK_SIZE
  );

  if (!mergedGeoData?.features?.length) {
    throw new Error('Failed to merge geodata');
  }

  // Process flow maps with commodity filtering
  const processedFlowMaps = processFlowMaps(flowMapsData, selectedCommodity);

  // Extract unique months
  const uniqueMonths = Array.from(
    new Set(
      mergedGeoData.features
        .map((f) => f.properties?.date?.slice(0, 7))
        .filter(Boolean)
    )
  ).sort();

  return {
    geoData: mergedGeoData,
    spatialWeights: weightsData,
    flowMaps: processedFlowMaps,
    analysisResults: analysisData,
    uniqueMonths,
    metadata: {
      totalFeatures: mergedGeoData.features.length,
      dataTimestamp: new Date().toISOString(),
      commodityFilter: selectedCommodity,
      processedFeatures: filteredFeatures.length,
      totalDates: uniqueMonths.length,
      flowMapsCount: processedFlowMaps.length,
    },
  };
};

// Export for testing
export const __testing = {
  processAllData,
  fetchWithDeduplication,
  requestTracker,
};

// Create thunk
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async (selectedCommodity, { rejectWithValue, dispatch }) => {
    try {
      dispatch(updateLoadingProgress(10));

      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unified: getDataPath('enhanced_unified_data_with_residual.geojson'),
        weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysis: getDataPath('spatial_analysis_results.json'),
      };

      // Fetch all data
      const [
        geoBoundariesResponse,
        unifiedResponse,
        weightsResponse,
        analysisResponse,
        flowMapsResponse,
      ] = await Promise.all([
        fetchWithDeduplication(paths.geoBoundaries),
        fetchWithDeduplication(paths.unified),
        fetchWithDeduplication(paths.weights),
        fetchWithDeduplication(paths.analysis),
        fetchWithDeduplication(paths.flowMaps),
      ]);

      dispatch(updateLoadingProgress(40));

      // Parse responses
      const geoBoundariesData = await geoBoundariesResponse.json();
      const unifiedData = await unifiedResponse.json();
      const weightsData = await weightsResponse.json();
      const analysisData = await analysisResponse.json();

      dispatch(updateLoadingProgress(60));

      // Parse CSV
      const flowMapsText = await flowMapsResponse.text();
      const flowMapsData = await new Promise((resolve, reject) => {
        Papa.parse(flowMapsText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(new Error(`CSV parsing error: ${error.message}`)),
        });
      });

      dispatch(updateLoadingProgress(80));

      // Process all data
      const processed = await processAllData(
        geoBoundariesData,
        unifiedData,
        weightsData,
        flowMapsData,
        analysisData,
        selectedCommodity
      );

      dispatch(updateLoadingProgress(100));

      return processed;
    } catch (error) {
      console.error('Failed to fetch spatial data:', error);
      return rejectWithValue({
        message: error.message || 'Failed to fetch spatial data',
        details: {
          timestamp: new Date().toISOString(),
          error: error.toString(),
        },
      });
    }
  }
);

// Initial state
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

// Create slice
const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    updateLoadingProgress: (state, action) => {
      state.loadingProgress = action.payload;
    },
    resetSpatialState: () => ({
      ...initialState,
      lastUpdated: new Date().toISOString(),
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.loadingProgress = 0;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
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
        state.status = 'failed';
        state.error = action.payload;
        state.loadingProgress = 0;
      });
  },
});

export const { updateLoadingProgress, resetSpatialState } = spatialSlice.actions;
export default spatialSlice.reducer;
