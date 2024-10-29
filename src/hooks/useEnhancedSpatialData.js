//src/hooks/useEnhancedSpatialData.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDataPath } from '../utils/dataPath';
import { 
  mergeGeoData, 
  extractUniqueMonths,
  validateFeatureData,
} from '../utils/spatialDataUtils';
import { regionMapping, excludedRegions } from '../utils/utils';
import Papa from 'papaparse';

export const useEnhancedSpatialData = (selectedCommodity) => {
  const [state, setState] = useState({
    geoData: null,
    flowMaps: [],
    analysisResults: null,
    loading: true,
    error: null,
    uniqueMonths: [],
    loadingProgress: 0
  });

  const abortControllerRef = useRef(null);
  const lastFetchRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchTimestamp = Date.now();
    lastFetchRef.current = fetchTimestamp;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch all required data
      const [geoBoundariesResponse, unifiedResponse, weightsResponse, analysisResponse] = 
        await Promise.all([
          fetch(getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson')),
          fetch(getDataPath('unified_data.geojson')),
          fetch(getDataPath('spatial_weights/transformed_spatial_weights.json')),
          fetch(getDataPath('spatial_analysis_results.json'))
        ]);

      // Handle CSV data separately
      const flowMapsResponse = await fetch(getDataPath('network_data/time_varying_flows.csv'));
      const flowMapsText = await flowMapsResponse.text();

      // Check if fetch is still relevant
      if (lastFetchRef.current !== fetchTimestamp) {
        console.debug('Outdated fetch, ignoring results');
        return;
      }

      // Parse all responses
      const [geoBoundariesData, unifiedData, weightsData, analysisResultsData] = 
        await Promise.all([
          geoBoundariesResponse.json(),
          unifiedResponse.json(),
          weightsResponse.json(),
          analysisResponse.json()
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
          error: (error) => reject(new Error(`CSV parsing failed: ${error}`))
        });
      });

      // Merge and process geo data using utility functions
      const mergedGeoData = mergeGeoData(
        geoBoundariesData,
        unifiedData,
        regionMapping,
        excludedRegions
      );

      // Process flow maps
      const processedFlowMaps = processFlowMapsData(flowMapsData);

      // Extract unique months using utility function
      const uniqueMonths = extractUniqueMonths(mergedGeoData.features);

      // Validate final data structure
      const validationResult = validateFeatureData(
        mergedGeoData.features[0],
        selectedCommodity,
        regionMapping
      );

      if (!validationResult.isValid) {
        console.warn('Validation warnings:', validationResult.errors);
      }

      setState(prev => ({
        ...prev,
        geoData: mergedGeoData,
        flowMaps: processedFlowMaps,
        analysisResults: analysisResultsData,
        uniqueMonths,
        loading: false,
        error: null,
        loadingProgress: 100
      }));

    } catch (error) {
      if (error.name === 'AbortError') {
        console.debug('Data fetch aborted');
        return;
      }

      console.error('Error fetching data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        loadingProgress: 0
      }));
    }
  }, [selectedCommodity]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refreshData
  };
};

/**
 * Process flow maps data with validation
 * @param {Array} flowMapsData - Raw flow maps data from CSV
 * @returns {Array} - Processed and validated flow maps
 */
function processFlowMapsData(flowMapsData) {
  if (!Array.isArray(flowMapsData)) {
    console.warn('Flow maps data is not an array');
    return [];
  }

  return flowMapsData
    .map(flow => {
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
          date: flow.date ? new Date(flow.date).toISOString() : null
        };
      } catch (error) {
        console.warn('Error processing flow:', error);
        return null;
      }
    })
    .filter(Boolean);
}

export default useEnhancedSpatialData;