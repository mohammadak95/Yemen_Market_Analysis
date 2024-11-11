// src/hooks/useSpatialData.js

import React from 'react';
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
import { useWorkerSystem } from '../workers/enhancedWorkerSystem';
import { workerSystem } from '../workers/enhancedWorkerSystem';

/**
 * Custom hook to handle spatial data fetching, processing, and state management.
 */
const useSpatialData = (selectedCommodity, selectedDate) => {
  const dispatch = useDispatch();
  const { processData, isInitialized } = useWorkerSystem();
  
  const spatialData = useSelector(selectSpatialData);
  const uiState = useSelector(selectUIState);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Process data using new worker system
  const processSpatialData = useCallback(async (commodity, date) => {
    if (!commodity) return;

    setIsProcessing(true);
    setLocalError(null);

    try {
      // Ensure worker system is initialized
      if (!isInitialized) {
        await initialize();
      }

      const result = await processData(
        'PROCESS_SPATIAL',
        {
          selectedCommodity: commodity,
          selectedDate: date,
        },
        (progress) => {
          console.log(`Processing progress: ${progress}%`);
        }
      );

      await dispatch(fetchSpatialData({
        selectedCommodity: commodity,
        selectedDate: date,
      })).unwrap();

    } catch (error) {
      console.error('Error processing spatial data:', error);
      setLocalError(error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, processData, isInitialized]);
  

  /**
   * Update market clusters using the worker manager.
   */
  const updateClusters = useCallback(async () => {
    const { geoData, flows, weights } = spatialData;
    if (!geoData || !flows || !weights) return;

    try {
      const clusters = await workerSystem.processData('PROCESS_CLUSTERS', {
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
      const shocks = await workerSystem.processData('PROCESS_SHOCKS', {
        features: geoData.features,
        date: selectedDate,
      });
      dispatch(updateDetectedShocks(shocks));
    } catch (error) {
      console.error('Error updating market shocks:', error);
    }
  }, [dispatch, spatialData, uiState]);

  const refreshData = useCallback(() => {
    const { selectedCommodity, selectedDate } = uiState;
    if (!selectedCommodity) return;

    dispatch(fetchSpatialData({ 
      selectedCommodity, 
      selectedDate 
    }));
  }, [dispatch, uiState]);

  // Effect to update clusters and shocks when data changes
  useEffect(() => {
    if (spatialData.geoData) {
      updateClusters();
      updateShocks();
    }
    refreshData();
  }, [spatialData.geoData, updateClusters, updateShocks, refreshData]);

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
