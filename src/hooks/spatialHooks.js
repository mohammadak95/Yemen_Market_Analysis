// --- src/hooks/spatialHooks.js (Refactored for Centralized Data Management) ---

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSpatialData } from '../slices/spatialSlice';
import {
  mergeGeoData,
  extractUniqueMonths,
  regionMapping,
  excludedRegions,
} from '../utils/spatialUtils';

/**
 * Custom hook for optimized spatial data loading using Redux.
 * @param {string} selectedCommodity - The commodity to filter data by.
 * @returns {Object} - Spatial data and loading states.
 */
export const useSpatialDataOptimized = (selectedCommodity) => {
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

  // Ref to track if the fetch has been initialized to prevent re-fetching
  const fetchInitializedRef = useRef(false);

  const loadAllData = useCallback(() => {
    if ((status === 'idle' || status === 'failed') && !fetchInitializedRef.current) {
      setLoadingProgress(0);
      fetchInitializedRef.current = true; // Mark as initialized
      dispatch(fetchSpatialData(selectedCommodity));
    }
  }, [dispatch, selectedCommodity, status]);

  useEffect(() => {
    loadAllData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadAllData]);

  // Monitor status and update loading progress accordingly
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
