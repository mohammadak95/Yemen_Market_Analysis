// src/hooks/useSpatialDataOptimized.js

import { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { fetchJson } from '../utils/utils';
import { getDataPath } from '../utils/dataPath';
import { 
  mergeGeoData, 
  extractUniqueMonths,
  processFeatureProperties 
} from '../utils/spatialDataUtils';
import { regionMapping, excludedRegions } from '../utils/utils';

const useSpatialDataOptimized = () => {
  const [state, setState] = useState({
    geoData: null,
    flowMaps: null,
    analysisResults: null,
    loading: true,
    error: null,
    uniqueMonths: [],
    loadingProgress: 0
  });

  const abortControllerRef = useRef(null);
  const dataCache = useRef(new Map());

  const loadDataChunk = useCallback(async (path, type, signal) => {
    const cacheKey = `${type}-${path}`;
    if (dataCache.current.has(cacheKey)) {
      return dataCache.current.get(cacheKey);
    }

    try {
      if (type === 'flowMaps') {
        const response = await fetch(path, { signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const csvText = await response.text();
        const { data, errors } = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        });

        if (errors.length > 0) {
          throw new Error(`CSV parsing errors: ${errors.map(e => e.message).join(', ')}`);
        }

        dataCache.current.set(cacheKey, data);
        return data;
      }

      const data = await fetchJson(path);
      
      if (type === 'geoData') {
        const processedData = {
          ...data,
          features: data.features.map(f => ({
            ...f,
            properties: processFeatureProperties(f.properties)
          }))
        };
        dataCache.current.set(cacheKey, processedData);
        return processedData;
      }

      dataCache.current.set(cacheKey, data);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error(`Error loading ${type} data:`, error);
      throw new Error(`Failed to load ${type} data: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Define data paths
        const paths = {
          geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
          unified: getDataPath('unified_data.geojson'),
          weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
          flowMaps: getDataPath('network_data/time_varying_flows.csv'),
          analysis: getDataPath('spatial_analysis_results.json')
        };

        // Load all data
        const [
          geoBoundariesData,
          unifiedData,
          weightsData,
          flowMapsData,
          analysisResultsData
        ] = await Promise.all([
          loadDataChunk(paths.geoBoundaries, 'geoBoundaries', abortControllerRef.current.signal),
          loadDataChunk(paths.unified, 'geoData', abortControllerRef.current.signal),
          loadDataChunk(paths.weights, 'weights', abortControllerRef.current.signal),
          loadDataChunk(paths.flowMaps, 'flowMaps', abortControllerRef.current.signal),
          loadDataChunk(paths.analysis, 'analysis', abortControllerRef.current.signal)
        ]);

        // Merge and process data
        const mergedData = mergeGeoData(
          geoBoundariesData,
          unifiedData,
          regionMapping,
          excludedRegions
        );

        // Extract unique months
        const uniqueMonths = extractUniqueMonths(mergedData.features);

        setState(prev => ({
          ...prev,
          geoData: mergedData,
          flowMaps: flowMapsData,
          analysisResults: analysisResultsData,
          uniqueMonths,
          loading: false,
          loadingProgress: 100
        }));

      } catch (error) {
        if (error.name === 'AbortError') return;

        console.error('Error in loadAllData:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    loadAllData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadDataChunk]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      dataCache.current.clear();
    };
  }, []);

  return state;
};

export default useSpatialDataOptimized;