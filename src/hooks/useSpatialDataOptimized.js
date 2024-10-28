//src/hooks/useSpatialDataOptimized.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { parseISO, format, isValid } from 'date-fns';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';

export const useSpatialDataOptimized = () => {
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

  const parseDates = useCallback((data) => {
    if (!data?.features) return data;

    return {
      ...data,
      features: data.features.map(feature => {
        if (!feature.properties?.date) return feature;

        try {
          const dateStr = feature.properties.date;
          let dateObj;

          if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
            dateObj = dateStr;
          } else if (typeof dateStr === 'string') {
            dateObj = parseISO(dateStr);
            if (isNaN(dateObj.getTime())) {
              throw new Error(`Invalid date string: ${dateStr}`);
            }
          } else {
            throw new Error(`Unsupported date format: ${typeof dateStr}`);
          }

          return {
            ...feature,
            properties: {
              ...feature.properties,
              date: dateObj
            }
          };
        } catch (error) {
          console.error('Error parsing feature date:', error, 'Feature:', feature);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              date: null
            }
          };
        }
      })
    };
  }, []);

  const loadDataChunk = useCallback(async (path, type, signal) => {
    // Check cache first
    const cacheKey = `${type}-${path}`;
    if (dataCache.current.has(cacheKey)) {
      console.log(`Cache hit for ${cacheKey}`);
      return dataCache.current.get(cacheKey);
    }

    console.log(`Fetching ${type} data from:`, path);

    const response = await fetch(path, { signal });
    if (!response.ok) throw new Error(`Failed to load ${type} data`);

    let data;

    try {
      if (type === 'flowMaps') {
        // Parse CSV data
        const csvText = await response.text();
        data = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });

        if (data.errors.length) {
          console.error(`Error parsing ${type} CSV:`, data.errors);
          throw new Error(`Failed to parse ${type} CSV data.`);
        }

        data = data.data; // Extract parsed data
        console.log(`${type} CSV parsed successfully. Records count:`, data.length);
      } else {
        // For geoData and analysisResults, parse as JSON
        const contentLength = response.headers.get('content-length');
        if (contentLength && +contentLength > 1000000) {
          // Stream large JSON files
          const reader = response.body.getReader();
          const chunks = [];
          let receivedLength = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;

            // Update loading progress
            setState(prev => ({
              ...prev,
              loadingProgress: Math.min((receivedLength / +contentLength) * 100, 100)
            }));
          }

          const chunksAll = new Uint8Array(receivedLength);
          let position = 0;
          for (let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
          }

          const jsonString = new TextDecoder().decode(chunksAll);
          data = JSON.parse(jsonString);

          // Parse dates for geoData
          if (type === 'geoData') {
            data = parseDates(data);
          }
          
          console.log(`${type} JSON parsed successfully.`);
        } else {
          // Small JSON files
          data = await response.json();
          if (type === 'geoData') {
            data = parseDates(data);
          }
          console.log(`${type} JSON parsed successfully.`);
        }
      }

      // Cache the result
      dataCache.current.set(cacheKey, data);
      return data;
    } catch (parseError) {
      console.error(`Error loading or parsing ${type} data:`, parseError);
      throw parseError;
    }
  }, [parseDates]);

  useEffect(() => {
    const loadData = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Load critical geoData first
        const geoData = await loadDataChunk(
          getDataPath('unified_data.geojson'),
          'geoData',
          abortControllerRef.current.signal
        );

        // Extract unique months early
        const months = new Set();
        geoData.features.forEach(feature => {
          if (feature.properties.date) {
            const yearMonth = format(feature.properties.date, 'yyyy-MM');
            months.add(yearMonth);
          }
        });

        const uniqueMonthsArray = Array.from(months)
          .map(monthStr => {
            const date = parseISO(`${monthStr}-01`);
            if (!isNaN(date.getTime())) {
              return date;
            } else {
              console.error('Invalid month string:', monthStr);
              return null;
            }
          })
          .filter(date => date !== null)
          .sort((a, b) => a - b);

        setState(prev => ({
          ...prev,
          geoData,
          uniqueMonths: uniqueMonthsArray,
          loadingProgress: 40
        }));

        // Load remaining data in parallel
        const [flowMaps, analysisResults] = await Promise.all([
          loadDataChunk(
            getDataPath('network_data/flow_maps.csv'),
            'flowMaps',
            abortControllerRef.current.signal
          ),
          loadDataChunk(
            getDataPath('spatial_analysis_results.json'),
            'analysisResults',
            abortControllerRef.current.signal
          )
        ]);

        setState(prev => ({
          ...prev,
          flowMaps,
          analysisResults,
          loading: false,
          loadingProgress: 100
        }));

        console.log('All spatial data loaded successfully.');
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error loading spatial data:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    const loadDataWithTimeout = async () => {
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          console.error('Data loading aborted due to timeout.');
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Data loading timeout exceeded'
          }));
        }
      }, 60000); // 60 seconds timeout

      await loadData();
      clearTimeout(timeoutId);
    };

    loadDataWithTimeout();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadDataChunk]);

  // Clean up cache when component unmounts
  useEffect(() => {
    return () => {
      dataCache.current.clear();
      console.log('Data cache cleared.');
    };
  }, []);

  return state;
};

export default useSpatialDataOptimized;
