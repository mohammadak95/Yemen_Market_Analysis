// src/hooks/useDashboardData.js

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllSpatialData, selectSpatialData, selectLoadingStatus } from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';

export const useDashboardData = (defaultDate) => {
  const dispatch = useDispatch();
  const spatialData = useSelector(selectSpatialData);
  const loading = useSelector(selectLoadingStatus);
  const dataCache = useRef(new Map());
  const loadingRef = useRef(null);

  const fetchData = useCallback(async (commodity, date = defaultDate) => {
    try {
      // Check cache first
      const cacheKey = `${commodity}_${date}`;
      if (dataCache.current.has(cacheKey)) {
        return dataCache.current.get(cacheKey);
      }

      // Cancel any pending requests
      if (loadingRef.current) {
        loadingRef.current.abort();
      }

      loadingRef.current = new AbortController();
      const metric = backgroundMonitor.startMetric('data-fetch');

      const result = await dispatch(fetchAllSpatialData({
        commodity,
        date,
        signal: loadingRef.current.signal
      })).unwrap();

      // Cache the result
      dataCache.current.set(cacheKey, result);
      
      metric.finish({ status: 'success' });
      return result;
    } catch (err) {
      if (err.name === 'AbortError') return;
      throw err;
    } finally {
      loadingRef.current = null;
    }
  }, [dispatch, defaultDate]);

  const preloadCommodityData = useCallback((commodity) => {
    if (!commodity) return;
    const cacheKey = `${commodity}_${defaultDate}`;
    if (!dataCache.current.has(cacheKey) && !loadingRef.current) {
      fetchData(commodity, defaultDate).catch(() => {});
    }
  }, [fetchData, defaultDate]);

  return {
    spatialData,
    loading,
    fetchData,
    preloadCommodityData,
    clearCache: useCallback(() => {
      dataCache.current.clear();
    }, [])
  };
};