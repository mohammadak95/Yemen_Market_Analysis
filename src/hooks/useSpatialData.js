// src/hooks/useSpatialData.js

import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSpatialData,
  selectSpatialData,
  selectUIState,
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegion,
  updateMarketClusters,
  updateDetectedShocks,
} from '../slices/spatialSlice';
import { spatialDataManager } from '../utils/SpatialDataManager';
import { workerManager } from '../workers/enhancedWorkerSystem';
import { backgroundMonitor } from '../utils/backgroundMonitor';

/**
 * Custom hook to handle spatial data fetching, processing, and state management.
 */
const useSpatialData = () => {
  const dispatch = useDispatch();

  // Get data and UI state from Redux store
  const spatialData = useSelector(selectSpatialData);
  const uiState = useSelector(selectUIState);

  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Initialize worker manager if not already initialized
  useEffect(() => {
    if (!workerManager.isInitialized) {
      workerManager.initialize().catch((error) => {
        console.error('Worker initialization failed:', error);
      });
    }
  }, []);

  /**
   * Fetch and process spatial data based on selected commodity and date.
   */
  const processSpatialData = useCallback(
    async (commodity, date) => {
      if (!commodity) return;

      setIsProcessing(true);
      setLocalError(null);

      const metric = backgroundMonitor.startMetric('spatial-data-processing', {
        commodity,
        date,
      });

      try {
        // Dispatch action to fetch spatial data
        await dispatch(
          fetchSpatialData({
            selectedCommodity: commodity,
            selectedDate: date,
          })
        ).unwrap();

        // Update selected commodity and date in UI state
        dispatch(setSelectedCommodity(commodity));
        dispatch(setSelectedDate(date));

        metric.finish({ status: 'success' });
      } catch (error) {
        console.error('Error processing spatial data:', error);
        setLocalError(error.message);
        metric.finish({ status: 'error', error: error.message });
        backgroundMonitor.logError('spatial-data-processing-failed', {
          error: error.message,
          commodity,
          date,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [dispatch]
  );

  /**
   * Update market clusters using the worker manager.
   */
  const updateClusters = useCallback(async () => {
    const { geoData, flows, weights } = spatialData;
    if (!geoData || !flows || !weights) return;

    try {
      const clusters = await workerManager.processData('PROCESS_CLUSTERS', {
        features: geoData.features,
        flows,
        weights,
      });
      dispatch(updateMarketClusters(clusters));
    } catch (error) {
      console.error('Error updating market clusters:', error);
    }
  }, [dispatch, spatialData]);

  /**
   * Update market shocks using the worker manager.
   */
  const updateShocks = useCallback(async () => {
    const { geoData } = spatialData;
    const { selectedDate } = uiState;
    if (!geoData || !selectedDate) return;

    try {
      const shocks = await workerManager.processData('PROCESS_SHOCKS', {
        features: geoData.features,
        date: selectedDate,
      });
      dispatch(updateDetectedShocks(shocks));
    } catch (error) {
      console.error('Error updating market shocks:', error);
    }
  }, [dispatch, spatialData, uiState]);

  // Effect to update clusters and shocks when data changes
  useEffect(() => {
    if (spatialData.geoData) {
      updateClusters();
      updateShocks();
    }
  }, [spatialData.geoData, updateClusters, updateShocks]);

  /**
   * Set the selected region.
   */
  const selectRegion = (regionId) => {
    dispatch(setSelectedRegion(regionId));
  };

  return {
    spatialData,
    uiState,
    isProcessing,
    error: localError,
    processSpatialData,
    selectRegion,
  };
};

export default useSpatialData;
