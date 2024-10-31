//src/hooks/spatialHooks.js

import { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import {
  fetchJson,
  getDataPath,
  regionMapping,
  excludedRegions,
} from '../utils/appUtils';
import {
  mergeGeoData,
  extractUniqueMonths,
  processFeatureProperties,
  debugSpatialData,
  trackCommodityData,
  validateFeatureData,
} from '../utils/spatialUtils';

/**
 * Custom hook to load and manage spatial data optimally.
 *
 * @param {string} selectedCommodity - The commodity selected by the user.
 * @returns {object} - The state containing spatial data, loading status, errors, etc.
 */
const useSpatialDataOptimized = (selectedCommodity) => {
  const [state, setState] = useState({
    geoData: null,
    flowMaps: null,
    analysisResults: null,
    loading: true,
    error: null,
    uniqueMonths: [],
    loadingProgress: 0,
  });

  const abortControllerRef = useRef(null);
  const dataCache = useRef(new Map());

  /**
   * Loads a data chunk from a given path and type, utilizing caching to optimize performance.
   *
   * @param {string} path - The URL path to fetch the data from.
   * @param {string} type - The type/category of the data being fetched.
   * @param {AbortSignal} signal - The AbortSignal to handle request cancellation.
   * @returns {Promise<any>} - The fetched and processed data.
   */
  const loadDataChunk = useCallback(async (path, type, signal) => {
    const cacheKey = `${type}-${path}`;

    // Return cached data if available
    if (dataCache.current.has(cacheKey)) {
      console.log(`Using cached data for ${type}`);
      return dataCache.current.get(cacheKey);
    }

    try {
      console.log(`Loading ${type} data from ${path}`);

      if (type === 'flowMaps') {
        const response = await fetch(path, { signal });
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const csvText = await response.text();
        const { data, errors } = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        if (errors.length > 0) {
          throw new Error(
            `CSV parsing errors: ${errors.map((e) => e.message).join(', ')}`
          );
        }

        console.log(`Successfully parsed ${data.length} flow map records`);
        dataCache.current.set(cacheKey, data);
        return data;
      }

      // For non-CSV data types
      const data = await fetchJson(path);

      if (type === 'geoData') {
        console.log('Processing geo data features');
        const processedData = {
          ...data,
          features: data.features.map((f) => ({
            ...f,
            properties: processFeatureProperties(f.properties),
          })),
        };
        dataCache.current.set(cacheKey, processedData);
        return processedData;
      }

      dataCache.current.set(cacheKey, data);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Data loading aborted');
        throw error;
      }
      console.error(`Error loading ${type} data:`, error);
      throw new Error(`Failed to load ${type} data: ${error.message}`);
    }
  }, []);

  /**
   * Effect to load all necessary spatial data when the selected commodity changes.
   */
  useEffect(() => {
    const loadAllData = async () => {
      // Abort any ongoing fetch requests before starting new ones
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        console.group('Loading Spatial Data');
        console.log('Starting data load for commodity:', selectedCommodity);

        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
          loadingProgress: 0,
        }));

        // Define paths to various data sources
        const paths = {
          geoBoundaries: getDataPath(
            'choropleth_data/geoBoundaries-YEM-ADM1.geojson'
          ),
          unified: getDataPath('unified_data.geojson'),
          weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
          flowMaps: getDataPath('network_data/time_varying_flows.csv'),
          analysis: getDataPath('spatial_analysis_results.json'),
        };

        // Load all data chunks in parallel
        const dataChunks = await Promise.all([
          loadDataChunk(paths.geoBoundaries, 'geoBoundaries', abortControllerRef.current.signal),
          loadDataChunk(paths.unified, 'geoData', abortControllerRef.current.signal),
          loadDataChunk(paths.weights, 'weights', abortControllerRef.current.signal),
          loadDataChunk(paths.flowMaps, 'flowMaps', abortControllerRef.current.signal),
          loadDataChunk(paths.analysis, 'analysis', abortControllerRef.current.signal),
        ]);

        const [
          geoBoundariesData,
          unifiedData,
          flowMapsData,
          analysisResultsData,
        ] = dataChunks;

        console.log('All data chunks loaded successfully');

        // Debug spatial data processing
        const debugResults = debugSpatialData(
          geoBoundariesData,
          unifiedData,
          selectedCommodity
        );
        console.log('Debug Results:', debugResults);

        // Merge and process geo data
        const mergedData = mergeGeoData(
          geoBoundariesData,
          unifiedData,
          regionMapping,
          excludedRegions
        );

        // Track commodity-specific data
        const commodityData = trackCommodityData(selectedCommodity, mergedData);

        // Validate feature data if available
        if (commodityData?.length > 0) {
          console.log('Validating feature data');
          validateFeatureData(commodityData[0], selectedCommodity);
        }

        // Extract unique months from the merged data
        const uniqueMonths = extractUniqueMonths(mergedData.features);

        console.log('Setting final state', {
          featuresCount: mergedData.features.length,
          uniqueMonthsCount: uniqueMonths.length,
        });

        // Update state with the loaded and processed data
        setState((prev) => ({
          ...prev,
          geoData: mergedData,
          flowMaps: flowMapsData,
          analysisResults: analysisResultsData,
          uniqueMonths,
          loading: false,
          loadingProgress: 100, // Data loaded completely
        }));

        console.log('Data loading completed successfully');
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Data loading aborted');
          return;
        }

        console.error('Error in loadAllData:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      } finally {
        console.groupEnd();
      }
    };

    loadAllData();

    // Cleanup: Abort fetch requests when the component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadDataChunk, selectedCommodity]);

  /**
   * Effect to clear the data cache when the component unmounts.
   */
  useEffect(() => {
    return () => {
      console.log('Clearing data cache');
      dataCache.current.clear();
    };
  }, []);

  return state;
};

/**
 * Custom hook to load and manage enhanced spatial data.
 *
 * @param {string} selectedCommodity - The commodity selected by the user.
 * @returns {object} - The state containing spatial data, loading status, errors, etc., along with a refresh function.
 */
const useEnhancedSpatialData = (selectedCommodity) => {
  const [state, setState] = useState({
    geoData: null,
    flowMaps: [],
    analysisResults: null,
    loading: true,
    error: null,
    uniqueMonths: [],
    loadingProgress: 0,
  });

  const abortControllerRef = useRef(null);
  const lastFetchRef = useRef(null);

  /**
   * Fetches all necessary spatial data, ensuring that only the latest fetch is processed.
   */
  const fetchData = useCallback(async () => {
    // Abort any ongoing fetch requests before starting new ones
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchTimestamp = Date.now();
    lastFetchRef.current = fetchTimestamp;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      // Fetch all required data in parallel
      const [
        geoBoundariesResponse,
        unifiedResponse,
        weightsResponse,
        analysisResponse,
      ] = await Promise.all([
        fetch(getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'), {
          signal: abortControllerRef.current.signal,
        }),
        fetch(getDataPath('unified_data.geojson'), {
          signal: abortControllerRef.current.signal,
        }),
        fetch(getDataPath('spatial_weights/transformed_spatial_weights.json'), {
          signal: abortControllerRef.current.signal,
        }),
        fetch(getDataPath('spatial_analysis_results.json'), {
          signal: abortControllerRef.current.signal,
        }),
      ]);

      // Handle CSV data separately
      const flowMapsResponse = await fetch(
        getDataPath('network_data/time_varying_flows.csv'),
        { signal: abortControllerRef.current.signal }
      );
      const flowMapsText = await flowMapsResponse.text();

      // Check if this fetch is still relevant
      if (lastFetchRef.current !== fetchTimestamp) {
        console.debug('Outdated fetch, ignoring results');
        return;
      }

      // Parse JSON responses
      const [geoBoundariesData, unifiedData,analysisResultsData] =
        await Promise.all([
          geoBoundariesResponse.json(),
          unifiedResponse.json(),
          weightsResponse.json(),
          analysisResponse.json(),
        ]);

      // Parse CSV data
      const flowMapsData = await new Promise((resolve, reject) => {
        Papa.parse(flowMapsText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            resolve(results.data);
          },
          error: (error) => reject(new Error(`CSV parsing failed: ${error}`)),
        });
      });

      // Merge and process geo data using utility functions
      const mergedGeoData = mergeGeoData(
        geoBoundariesData,
        unifiedData,
        regionMapping,
        excludedRegions
      );

      // Process flow maps data
      const processedFlowMaps = processFlowMapsData(flowMapsData);

      // Extract unique months from the merged data
      const uniqueMonths = extractUniqueMonths(mergedGeoData.features);

      // Validate the final data structure
      const validationResult = validateFeatureData(
        mergedGeoData.features[0],
        selectedCommodity,
        regionMapping
      );

      if (!validationResult.isValid) {
        console.warn('Validation warnings:', validationResult.errors);
      }

      // Update state with the loaded and processed data
      setState((prev) => ({
        ...prev,
        geoData: mergedGeoData,
        flowMaps: processedFlowMaps,
        analysisResults: analysisResultsData,
        uniqueMonths,
        loading: false,
        error: null,
        loadingProgress: 100,
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        console.debug('Data fetch aborted');
        return;
      }

      console.error('Error fetching data:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        loadingProgress: 0,
      }));
    }
  }, [selectedCommodity]);

  /**
   * Effect to initiate data fetching when the selected commodity changes.
   */
  useEffect(() => {
    fetchData();

    // Cleanup: Abort fetch requests when the component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  /**
   * Function to manually refresh the data.
   */
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refreshData,
  };
};

/**
 * Processes flow maps data with validation and transformation.
 *
 * @param {Array} flowMapsData - Raw flow maps data from CSV.
 * @returns {Array} - Processed and validated flow maps.
 */
function processFlowMapsData(flowMapsData) {
  if (!Array.isArray(flowMapsData)) {
    console.warn('Flow maps data is not an array');
    return [];
  }

  return flowMapsData
    .map((flow) => {
      try {
        // Validate required fields
        if (!flow.source || !flow.target) {
          console.warn('Missing required fields in flow:', flow);
          return null;
        }

        return {
          source: String(flow.source),
          target: String(flow.target),
          flow_weight: parseFloat(flow.flow_weight) || 0,
          source_lat: parseFloat(flow.source_lat) || 0,
          source_lng: parseFloat(flow.source_lng) || 0,
          target_lat: parseFloat(flow.target_lat) || 0,
          target_lng: parseFloat(flow.target_lng) || 0,
          date: flow.date ? new Date(flow.date).toISOString() : null,
        };
      } catch (error) {
        console.warn('Error processing flow:', error);
        return null;
      }
    })
    .filter(Boolean); // Remove null entries
}

/**
 * Class responsible for loading and caching spatial data.
 */
class SpatialDataLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Loads spatial data from a given path with caching and validation.
   *
   * @param {string} path - The URL path to fetch the data from.
   * @param {AbortSignal} signal - The AbortSignal to handle request cancellation.
   * @returns {Promise<object>} - The fetched and processed spatial data.
   */
  async loadData(path, signal) {
    try {
      // Return cached data if available
      if (this.cache.has(path)) {
        return this.cache.get(path);
      }

      const response = await fetch(path, {
        headers: { Accept: 'application/json' },
        signal: signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate and transform the data
      const processedData = this.processGeoJSON(data);

      // Cache the processed data
      this.cache.set(path, processedData);

      return processedData;
    } catch (error) {
      console.error('Error loading spatial data:', error);
      throw error;
    }
  }

  /**
   * Processes GeoJSON data by validating and transforming each feature.
   *
   * @param {object} data - The raw GeoJSON data.
   * @returns {object} - The processed GeoJSON data.
   */
  processGeoJSON(data) {
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid GeoJSON: missing features array');
    }

    return {
      ...data,
      features: data.features
        .map((feature) => {
          try {
            // Validate coordinates
            if (
              feature.geometry &&
              Array.isArray(feature.geometry.coordinates)
            ) {
              const [longitude, latitude] = feature.geometry.coordinates;
              const validCoordinates = this.validateCoordinates(
                latitude,
                longitude
              );

              if (!validCoordinates) {
                return null;
              }

              return {
                ...feature,
                geometry: {
                  ...feature.geometry,
                  coordinates: [longitude, latitude],
                },
                properties: {
                  ...feature.properties,
                  // Parse dates to ensure they're valid
                  date: feature.properties.date
                    ? new Date(feature.properties.date)
                    : null,
                  // Ensure numeric values are properly typed
                  price: parseFloat(feature.properties.price) || 0,
                  usdprice: parseFloat(feature.properties.usdprice) || 0,
                  conflict_intensity:
                    parseFloat(feature.properties.conflict_intensity) || 0,
                },
              };
            }
            return null;
          } catch (err) {
            console.warn('Error processing feature:', err);
            return null;
          }
        })
        .filter((feature) => feature !== null), // Remove invalid features
    };
  }

  /**
   * Validates that the provided latitude and longitude are within acceptable bounds.
   *
   * @param {number} lat - The latitude value.
   * @param {number} lng - The longitude value.
   * @returns {boolean} - True if coordinates are valid, else false.
   */
  validateCoordinates(lat, lng) {
    return !(
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    );
  }

  /**
   * Clears the cached spatial data.
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create a singleton instance of SpatialDataLoader
const spatialDataLoader = new SpatialDataLoader();

// Export all hooks and classes
export {
  useSpatialDataOptimized,
  useEnhancedSpatialData,
  SpatialDataLoader,
  spatialDataLoader,
};