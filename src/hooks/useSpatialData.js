// src/hooks/useSpatialData.js

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { spatialDataManager } from '../utils/SpatialDataManager';

// Cache settings
const CACHE_LIMIT = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const dataCache = new Map();

// Generate unique cache keys based on commodity
const generateCacheKey = (commodity) => `spatial_data_${commodity?.toLowerCase()}`;

const useSpatialData = (selectedCommodity) => {
  const [geoData, setGeoData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const lastCommodityRef = useRef(selectedCommodity);

  // Cache cleanup function
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const keys = Array.from(dataCache.keys());

    // Remove expired entries
    keys.forEach((key) => {
      const entry = dataCache.get(key);
      if (now - entry.timestamp > CACHE_DURATION) {
        dataCache.delete(key);
      }
    });

    // Remove oldest entries if cache is too large
    if (dataCache.size > CACHE_LIMIT) {
      const oldestKeys = Array.from(dataCache.keys())
        .sort((a, b) => dataCache.get(a).timestamp - dataCache.get(b).timestamp)
        .slice(0, dataCache.size - CACHE_LIMIT);
      
      oldestKeys.forEach((key) => dataCache.delete(key));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      setLoadingProgress(0);
      setError(null);

      try {
        const cacheKey = generateCacheKey(selectedCommodity);
        const cachedData = dataCache.get(cacheKey) || spatialDataManager.getCachedData(cacheKey);

        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          setGeoData(cachedData);
          setLoadingProgress(100);
          setStatus('succeeded');
        } else {
          setLoadingProgress(50);
          const mergedData = await spatialDataManager.processSpatialData(selectedCommodity);

          // Cache and update data
          spatialDataManager.setCachedData(cacheKey, mergedData);
          dataCache.set(cacheKey, { data: mergedData, timestamp: Date.now() });
          
          setGeoData(mergedData);
          setLoadingProgress(100);
          setStatus('succeeded');
        }
      } catch (err) {
        setError('Failed to fetch spatial data');
        console.error(err);
        setStatus('failed');
      } finally {
        cleanupCache();
      }
    };

    if (selectedCommodity && selectedCommodity !== lastCommodityRef.current) {
      lastCommodityRef.current = selectedCommodity;
      fetchData();
    }
  }, [selectedCommodity, cleanupCache]);

  // Process and memoize the geoData when it changes
  const processedData = useMemo(() => {
    if (!geoData) return null;

    const selectedAnalysis = geoData.analysisResults?.find(
      (analysis) => analysis?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase() && analysis?.regime === 'unified'
    );

    return {
      geoData: geoData.geoData?.features || null,
      analysis: selectedAnalysis,
      flows: geoData.flowMaps?.filter(
        (flow) => flow.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
      ) || [],
      weights: geoData.spatialWeights,
      uniqueMonths: geoData.uniqueMonths,
    };
  }, [geoData, selectedCommodity]);

  return {
    ...processedData,
    status,
    error,
    loadingProgress,
  };
};

export default useSpatialData;