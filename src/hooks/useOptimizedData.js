// src/hooks/useOptimizedData.js

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllSpatialData, selectSpatialData } from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';

export const useOptimizedData = () => {
  const dispatch = useDispatch();
  const spatialData = useSelector(selectSpatialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const dataCache = useRef(new Map());
  const loadingRef = useRef(null);

  // Cancel any pending loads
  const cancelPendingLoad = useCallback(() => {
    if (loadingRef.current) {
      loadingRef.current.abort();
      loadingRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async (commodity, date) => {
    try {
      setError(null);
      
      // Check cache first
      const cacheKey = `${commodity}_${date}`;
      if (dataCache.current.has(cacheKey)) {
        return dataCache.current.get(cacheKey);
      }

      // Cancel any pending loads
      cancelPendingLoad();

      // Create new abort controller
      loadingRef.current = new AbortController();
      setIsLoading(true);

      const metric = backgroundMonitor.startMetric('data-fetch');
      const result = await dispatch(fetchAllSpatialData({ 
        commodity, 
        date,
        signal: loadingRef.current.signal 
      })).unwrap();

      // Cache the result
      dataCache.current.set(cacheKey, result);
      
      // Clean up old cache entries (keep last 5)
      if (dataCache.current.size > 5) {
        const firstKey = dataCache.current.keys().next().value;
        dataCache.current.delete(firstKey);
      }

      metric.finish({ status: 'success' });
      return result;
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      loadingRef.current = null;
    }
  }, [dispatch, cancelPendingLoad]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPendingLoad();
      dataCache.current.clear();
    };
  }, [cancelPendingLoad]);

  // Expose a method to preload data
  const preloadData = useCallback((commodity, date) => {
    const cacheKey = `${commodity}_${date}`;
    if (!dataCache.current.has(cacheKey) && !isLoading) {
      fetchData(commodity, date).catch(() => {}); // Silently handle preload errors
    }
  }, [fetchData, isLoading]);

  return {
    data: spatialData,
    isLoading,
    error,
    fetchData,
    preloadData,
    clearCache: useCallback(() => {
      dataCache.current.clear();
    }, [])
  };
};