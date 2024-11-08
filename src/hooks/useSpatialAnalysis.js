// src/hooks/useSpatialAnalysis.js

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSpatialData, fetchSpatialData } from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { workerManager, useWorkerManager } from '../workers/enhancedWorkerSystem';

export const useSpatialAnalysis = (selectedCommodity, selectedDate) => {
  const dispatch = useDispatch();
  const spatialData = useSelector(selectSpatialData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  
  // Get worker processing functions using the hook
  const { processSpatialData } = useWorkerManager();
  
  // Keep track of active processing
  const activeProcessingRef = useRef(false);

  // Process data using worker
  const processData = useCallback(async () => {
    if (!selectedCommodity || !selectedDate || activeProcessingRef.current) return;

    activeProcessingRef.current = true;
    setIsProcessing(true);
    setLocalError(null);

    const metric = backgroundMonitor.startMetric('spatial-analysis', {
      commodity: selectedCommodity,
      date: selectedDate
    });

    try {
      // First fetch the data through Redux
      const fetchedData = await dispatch(fetchSpatialData({ 
        selectedCommodity, 
        selectedDate 
      })).unwrap();

      if (fetchedData) {
        // Process the fetched data using the worker
        const result = await processSpatialData({
          type: 'PROCESS_SPATIAL_DATA',
          data: {
            ...fetchedData,
            selectedCommodity,
            selectedDate
          }
        });

        setProcessedData(result);
        metric.finish({ 
          status: 'success',
          dataSize: JSON.stringify(result).length 
        });
      }
    } catch (error) {
      console.error('Error in spatial analysis:', error);
      setLocalError(error.message);
      metric.finish({ 
        status: 'error', 
        error: error.message 
      });
      
      // Log the error for monitoring
      backgroundMonitor.logError('spatial-analysis-error', {
        error: error.message,
        commodity: selectedCommodity,
        date: selectedDate
      });
    } finally {
      setIsProcessing(false);
      activeProcessingRef.current = false;
    }
  }, [
    dispatch,
    selectedCommodity,
    selectedDate,
    processSpatialData
  ]);

  // Auto-fetch data when parameters change
  useEffect(() => {
    if (selectedCommodity && selectedDate) {
      processData();
    }
    
    // Cleanup function
    return () => {
      // Mark any ongoing processing as inactive
      activeProcessingRef.current = false;
      
      // Log cleanup
      backgroundMonitor.logMetric('spatial-analysis-cleanup', {
        commodity: selectedCommodity,
        date: selectedDate
      });
    };
  }, [selectedCommodity, selectedDate, processData]);

  // Handler for worker status updates
  useEffect(() => {
    const handleWorkerStatus = ({ type, data }) => {
      switch (type) {
        case 'progress':
          backgroundMonitor.logMetric('spatial-analysis-progress', {
            progress: data.progress,
            commodity: selectedCommodity
          });
          break;
          
        case 'error':
          setLocalError(data.error);
          backgroundMonitor.logError('spatial-worker-error', data.error);
          break;
          
        default:
          break;
      }
    };

    // Subscribe to worker status updates
    workerManager.subscribeToStatus(handleWorkerStatus);

    return () => {
      workerManager.unsubscribeFromStatus(handleWorkerStatus);
    };
  }, [selectedCommodity]);

  return {
    ...spatialData,
    processedData,
    isProcessing,
    error: localError || spatialData.error,
    processData,
    // Add progress tracking
    progress: isProcessing ? workerManager.getProgress() : 100,
    // Add retry functionality
    retry: () => {
      setLocalError(null);
      return processData();
    }
  };
};