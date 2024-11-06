// src/components/SpatialDataContainer.js

import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSpatialData } from '../slices/spatialSlice';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

const SpatialDataContainer = ({ selectedCommodity, children }) => {
  const dispatch = useDispatch();
  const {
    status,
    error,
    loadingProgress,
    geoData
  } = useSelector(state => state.spatial);

  const loadData = useCallback(() => {
    if (selectedCommodity && (status === 'idle' || status === 'failed')) {
      console.log('Initiating data fetch for commodity:', selectedCommodity);
      dispatch(fetchSpatialData(selectedCommodity));
    }
  }, [dispatch, selectedCommodity, status]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Monitor state changes
  useEffect(() => {
    console.log('Spatial state updated:', {
      status,
      hasData: !!geoData,
      progress: loadingProgress,
      commodity: selectedCommodity
    });
  }, [status, geoData, loadingProgress, selectedCommodity]);

  if (!selectedCommodity) {
    return <div>Please select a commodity to analyze</div>;
  }

  if (status === 'loading') {
    return (
      <LoadingSpinner 
        progress={loadingProgress}
        message={`Loading data for ${selectedCommodity}...`}
      />
    );
  }

  if (status === 'failed') {
    return (
      <ErrorMessage
        message={`Failed to load data for ${selectedCommodity}`}
        details={error?.details || error?.message}
        onRetry={loadData}
      />
    );
  }

  if (!geoData) {
    return null;
  }

  return <>{children}</>;
};

export default SpatialDataContainer;