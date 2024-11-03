// src/hooks/useSpatialData.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSpatialData } from '../slices/spatialSlice';
import { retryWithBackoff } from '../utils/dataPath';
import { validateFeature } from '../utils/spatialUtils';

/**
 * Custom hook for spatial data loading with Redux integration.
 * @param {string} selectedCommodity - The commodity to filter data by.
 * @returns {Object} - Spatial data, loading states, and error information.
 */
export const useSpatialData = (selectedCommodity) => {
  const dispatch = useDispatch();
  const {
    geoData,
    spatialWeights,
    flowMaps,
    uniqueMonths,
    status,
    error,
  } = useSelector((state) => state.spatial);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(() => {
    if (status === 'idle' || status === 'failed') {
      dispatch(fetchSpatialData(selectedCommodity));
    }
  }, [dispatch, selectedCommodity, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (status === 'loading') {
      setLoadingProgress(50); // Arbitrary mid-point for loading
    } else if (status === 'succeeded') {
      setLoadingProgress(100);
    } else if (status === 'failed') {
      setLoadingProgress(0);
    }
  }, [status]);

  return {
    geoData,
    spatialWeights,
    flowMaps,
    uniqueMonths,
    loading: status === 'loading',
    error,
    loadingProgress,
  };
};
