// src/hooks/useSpatialDataOptimized.js

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateLoadingProgress } from '../store/spatialSlice';

const generateCacheKey = (commodity) => `spatial_data_${commodity?.toLowerCase()}`;

const dataCache = new Map();
const CACHE_LIMIT = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useSpatialDataOptimized = (selectedCommodity) => {
  const dispatch = useDispatch();
  const {
    geoData,
    spatialWeights,
    flowMaps,
    analysisResults,
    uniqueMonths,
    status,
    error,
  } = useSelector((state) => state.spatial);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const lastCommodityRef = useRef(selectedCommodity);
  const cleanupIntervalRef = useRef(null);

  // Cache cleanup function
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const keys = Array.from(dataCache.keys());
    
    // Remove expired entries
    keys.forEach(key => {
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
        
      oldestKeys.forEach(key => dataCache.delete(key));
    }
  }, []);

  // Process and cache data
  const processedData = useMemo(() => {
    if (!geoData?.features) return null;

    const cacheKey = generateCacheKey(selectedCommodity);
    const cached = dataCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const selectedAnalysisResult = analysisResults?.find(
      (result) => result?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    );

    const processed = {
      geoData,
      spatialWeights,
      flowMaps: flowMaps?.filter(
        (flow) => flow?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
      ) || [],
      analysisResults: selectedAnalysisResult,
      uniqueMonths,
    };

    dataCache.set(cacheKey, {
      data: processed,
      timestamp: Date.now()
    });

    return processed;
  }, [geoData, spatialWeights, flowMaps, analysisResults, uniqueMonths, selectedCommodity]);

  // Status effect
  useEffect(() => {
    if (status === 'loading') {
      setLoadingProgress(50);
      dispatch(updateLoadingProgress(50));
    } else if (status === 'succeeded') {
      setLoadingProgress(100);
      dispatch(updateLoadingProgress(100));
    } else if (status === 'failed') {
      setLoadingProgress(0);
      dispatch(updateLoadingProgress(0));
    }
  }, [status, dispatch]);

  // Cache cleanup interval
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(cleanupCache, CACHE_DURATION / 2);
    
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [cleanupCache]);

  // Update commodity ref
  useEffect(() => {
    lastCommodityRef.current = selectedCommodity;
  }, [selectedCommodity]);

  // Component cleanup
  useEffect(() => {
    return () => {
      cleanupCache();
    };
  }, [cleanupCache]);

  return {
    ...processedData,
    status,
    error,
    loadingProgress,
  };
};