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
import { debugSpatialData, trackCommodityData, validateFeatureData } from '../utils/spatialDebugUtils';

const useSpatialDataOptimized = (selectedCommodity) => {
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
      console.log(`Using cached data for ${type}`);
      return dataCache.current.get(cacheKey);
    }

    try {
      console.log(`Loading ${type} data from ${path}`);
      
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

        console.log(`Successfully parsed ${data.length} flow map records`);
        dataCache.current.set(cacheKey, data);
        return data;
      }

      const data = await fetchJson(path);
      
      if (type === 'geoData') {
        console.log('Processing geo data features');
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
        console.log('Data loading aborted');
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
        console.group('Loading Spatial Data');
        console.log('Starting data load for commodity:', selectedCommodity);
        
        setState(prev => ({ ...prev, loading: true, error: null }));

        const paths = {
          geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
          unified: getDataPath('unified_data.geojson'),
          weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
          flowMaps: getDataPath('network_data/time_varying_flows.csv'),
          analysis: getDataPath('spatial_analysis_results.json')
        };

        // Load all data with progress tracking
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

        console.log('All data chunks loaded successfully');

        // Debug spatial data processing
        const debugResults = debugSpatialData(geoBoundariesData, unifiedData, selectedCommodity);
        console.log('Debug Results:', debugResults);

        // Merge and process data
        console.log('Merging geo data');
        const mergedData = mergeGeoData(
          geoBoundariesData,
          unifiedData,
          regionMapping,
          excludedRegions
        );

        // Track commodity-specific data
        const commodityData = trackCommodityData(selectedCommodity, mergedData);
        
        if (commodityData?.length > 0) {
          console.log('Validating feature data');
          validateFeatureData(commodityData[0], selectedCommodity);
        }

        // Extract unique months
        console.log('Extracting unique months');
        const uniqueMonths = extractUniqueMonths(mergedData.features);
        
        console.log('Setting final state', {
          featuresCount: mergedData.features.length,
          uniqueMonthsCount: uniqueMonths.length
        });

        setState(prev => ({
          ...prev,
          geoData: mergedData,
          flowMaps: flowMapsData,
          analysisResults: analysisResultsData,
          uniqueMonths,
          loading: false,
          loadingProgress: 100
        }));

        console.log('Data loading completed successfully');

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Data loading aborted');
          return;
        }

        console.error('Error in loadAllData:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      } finally {
        console.groupEnd();
      }
    };

    loadAllData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadDataChunk, selectedCommodity]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      console.log('Clearing data cache');
      dataCache.current.clear();
    };
  }, []);

  return state;
};

export default useSpatialDataOptimized;