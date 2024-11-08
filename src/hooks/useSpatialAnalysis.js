//src/hooks/useSpatialAnalysis.js

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSpatialData, fetchSpatialData } from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';

export const useSpatialAnalysis = (selectedCommodity, selectedDate) => {
  const dispatch = useDispatch();
  const spatialData = useSelector(selectSpatialData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Create worker instance
  const worker = useMemo(() => {
    if (typeof Worker !== 'undefined') {
      try {
        return new Worker(new URL('../workers/spatialAnalysisWorker.js', import.meta.url));
      } catch (error) {
        console.error('Failed to create worker:', error);
        return null;
      }
    }
    return null;
  }, []);

  // Process data using worker
  const processData = useCallback(async () => {
    if (!selectedCommodity || !selectedDate) return;

    setIsProcessing(true);
    setLocalError(null);

    const metric = backgroundMonitor.startMetric('spatial-analysis', {
      commodity: selectedCommodity,
      date: selectedDate
    });

    try {
      await dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));

      if (worker && spatialData) {
        worker.postMessage({
          type: 'PROCESS_SPATIAL_DATA',
          data: spatialData
        });
      }

      metric.finish({ status: 'success' });
    } catch (error) {
      setLocalError(error.message);
      metric.finish({ status: 'error', error: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, selectedCommodity, selectedDate, worker, spatialData]);

  // Handle worker messages
  useEffect(() => {
    if (!worker) return;

    const handleMessage = (event) => {
      const { result, error } = event.data;
      if (error) {
        setLocalError(error);
        backgroundMonitor.logError('spatial-worker-error', error);
      } else {
        // Handle processed data
        backgroundMonitor.logMetric('spatial-worker-success', {
          dataSize: JSON.stringify(result).length
        });
      }
    };

    worker.addEventListener('message', handleMessage);
    return () => worker.removeEventListener('message', handleMessage);
  }, [worker]);

  // Cleanup worker
  useEffect(() => {
    return () => {
      if (worker) {
        worker.terminate();
        backgroundMonitor.logMetric('spatial-worker-terminated');
      }
    };
  }, [worker]);

  // Auto-fetch data when parameters change
  useEffect(() => {
    if (selectedCommodity && selectedDate) {
      processData();
    }
  }, [selectedCommodity, selectedDate, processData]);

  return {
    ...spatialData,
    isProcessing,
    error: localError || spatialData.error,
    processData
  };
};