// src/hooks/useSpatialDataOptimized.js
import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import { selectSpatialDataOptimized, selectActiveViewData } from '../selectors/optimizedSelectors';
import { fetchAllSpatialData } from '../slices/spatialSlice';

export const useSpatialDataOptimized = () => {
  const dispatch = useDispatch();
  const dataCache = useRef(new Map());
  const loadingRef = useRef(null);
  
  const spatialData = useSelector(selectSpatialDataOptimized);
  const activeViewData = useSelector(selectActiveViewData);

  const fetchData = useCallback(async (commodity, date) => {
    // Cancel any pending loads
    if (loadingRef.current) {
      loadingRef.current.abort();
    }

    const cacheKey = `${commodity}_${date}`;
    if (dataCache.current.has(cacheKey)) {
      return dataCache.current.get(cacheKey);
    }

    loadingRef.current = new AbortController();
    
    try {
      const result = await dispatch(fetchAllSpatialData({ 
        commodity, 
        date,
        signal: loadingRef.current.signal 
      })).unwrap();

      // Cache the result with a 5-minute TTL
      dataCache.current.set(cacheKey, result);
      setTimeout(() => dataCache.current.delete(cacheKey), 300000);

      return result;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    } finally {
      loadingRef.current = null;
    }
  }, [dispatch]);

  // Preload next likely data
  const preloadData = useCallback((commodity, date) => {
    const cacheKey = `${commodity}_${date}`;
    if (!dataCache.current.has(cacheKey) && !loadingRef.current) {
      fetchData(commodity, date).catch(() => {}); // Silently handle preload errors
    }
  }, [fetchData]);

  return {
    data: spatialData,
    activeViewData,
    fetchData,
    preloadData,
    clearCache: useCallback(() => {
      dataCache.current.clear();
    }, [])
  };
};