// src/hooks/useDashboardData.js

import { useRef, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllSpatialData, initialState as spatialInitialState } from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import _ from 'lodash';

export const useDashboardData = () => {
  const dispatch = useDispatch();
  
  // Use safe selectors with initial state fallbacks
  const data = useSelector(
    state => state.spatial?.data ?? spatialInitialState.data,
    _.isEqual
  );
  
  const loading = useSelector(
    state => state.spatial?.status?.loading ?? spatialInitialState.status.loading,
    _.isEqual
  );
  
  const status = useSelector(
    state => state.spatial?.status ?? spatialInitialState.status,
    _.isEqual
  );

  const loadingRef = useRef(false);
  const dataCache = useRef(new Map());
  const abortControllerRef = useRef(null);

  // Cleanup function to handle component unmount or re-fetch
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    loadingRef.current = false;
  }, []);

  // Ensure cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const fetchData = useCallback(async (commodity, date) => {
    // Prevent concurrent fetches
    if (loadingRef.current) {
      console.debug('Fetch already in progress, skipping');
      return;
    }
    
    const cacheKey = `${commodity}_${date}`;
    if (dataCache.current.has(cacheKey)) {
      console.debug('Using cached data for', cacheKey);
      return dataCache.current.get(cacheKey);
    }

    // Clean up any existing fetch
    cleanup();

    try {
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      loadingRef.current = true;
      
      const metric = backgroundMonitor.startMetric('data-fetch', {
        commodity,
        date,
        timestamp: Date.now()
      });

      // Only include signal if abortControllerRef.current exists
      const fetchOptions = {
        commodity,
        date,
        ...(abortControllerRef.current ? { signal: abortControllerRef.current.signal } : {})
      };

      const result = await dispatch(fetchAllSpatialData(fetchOptions)).unwrap();

      if (!result) {
        console.warn('Fetch returned no data');
        metric.finish({ 
          status: 'warning',
          message: 'No data returned'
        });
        return spatialInitialState.data;
      }

      dataCache.current.set(cacheKey, result);
      metric.finish({ 
        status: 'success',
        dataPoints: result.spatialData?.timeSeriesData?.length ?? 0
      });
      
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.debug('Fetch aborted:', commodity, date);
        return;
      }
      
      console.error('Error fetching data:', error);
      backgroundMonitor.startMetric('data-fetch-error', {
        status: 'error', 
        error: error.message,
        commodity,
        date
      }).finish();
      
      // Return initial state on error to prevent undefined data
      return spatialInitialState.data;
    } finally {
      loadingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  }, [dispatch, cleanup]);

  return {
    data,
    loading,
    status,
    fetchData,
    cleanup
  };
};
