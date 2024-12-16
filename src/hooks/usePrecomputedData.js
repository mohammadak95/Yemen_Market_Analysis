// src/hooks/usePrecomputedData.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { setProgress, setLoadingStage } from '../slices/spatialSlice';

export const usePrecomputedData = (commodity, date) => {
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const lastRequestRef = useRef({ commodity, date });

  const loadData = useCallback(async (options = {}) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const metric = backgroundMonitor.startMetric('data-load');

    try {
      setLoading(true);
      setError(null);
      dispatch(setLoadingStage('loading'));
      dispatch(setProgress(0));

      // Load data
      const result = await precomputedDataManager.loadData(
        commodity,
        date,
        {
          ...options,
          signal: abortControllerRef.current.signal,
          onProgress: (progress) => dispatch(setProgress(progress))
        }
      );

      // Update state if request wasn't cancelled
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
        dispatch(setLoadingStage('complete'));
        dispatch(setProgress(100));
        metric.finish({ status: 'success' });
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        metric.finish({ status: 'aborted' });
        return;
      }

      setError(error.message);
      dispatch(setLoadingStage('error'));
      metric.finish({ status: 'error', error: error.message });

    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [commodity, date, dispatch]);

  // Load data when inputs change
  useEffect(() => {
    const prevRequest = lastRequestRef.current;
    
    if (commodity && date && (
      commodity !== prevRequest.commodity || 
      date !== prevRequest.date
    )) {
      lastRequestRef.current = { commodity, date };
      loadData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [commodity, date, loadData]);

  // Expose reload method for manual refresh
  const reload = useCallback(() => {
    return loadData({ forceRefresh: true });
  }, [loadData]);

  return {
    data,
    loading,
    error,
    reload
  };
};