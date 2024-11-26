// src/hooks/useSpatialData.js

import { useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllSpatialData,
  selectSpatialData,
  selectLoadingStatus,
  selectVisualizationMode,
  selectSelectedCommodity,
  selectSelectedDate,
  selectTimeWindow,
  selectError,
  selectDetailedMetrics,
  selectActiveRegionDataOptimized,
  selectFilteredMarketData,
  selectCommodityInfo,
  selectGeometryStatus,
  handleSpatialError
} from '../slices/spatialSlice';

import {
  selectClustersWithCoordinates,
  selectFlowDataWithCoordinates,
  selectGeometryPoints,
} from '../selectors/spatialSelectors';

/**
 * Enhanced hook for managing spatial data with improved performance and error handling
 * @returns {Object} Spatial data and related state
 */
export function useSpatialData() {
  const dispatch = useDispatch();

  // Core UI State
  const commodity = useSelector(selectSelectedCommodity);
  const date = useSelector(selectSelectedDate);
  const timeWindow = useSelector(selectTimeWindow);
  const visualizationMode = useSelector(selectVisualizationMode);

  // Status and Error States
  const isLoading = useSelector(selectLoadingStatus);
  const error = useSelector(selectError);
  const geometryStatus = useSelector(selectGeometryStatus);

  // Memoized Data Selectors
  const spatialData = useSelector(selectSpatialData);
  const detailedMetrics = useSelector(selectDetailedMetrics);
  const activeRegionData = useSelector(selectActiveRegionDataOptimized);
  const filteredMarketData = useSelector(selectFilteredMarketData);
  const commodityInfo = useSelector(selectCommodityInfo);

  // Legacy Support: Keep existing selectors for backward compatibility
  const clusters = useSelector(selectClustersWithCoordinates);
  const flows = useSelector(selectFlowDataWithCoordinates);
  const points = useSelector(selectGeometryPoints);

  // Memoized error handler
  const handleError = useCallback(async (error) => {
    if (error) {
      console.error('Spatial data error:', error);
      await dispatch(handleSpatialError(error));
    }
  }, [dispatch]);

  // Enhanced data fetching with error handling
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!commodity || !date) return;

      try {
        await dispatch(fetchAllSpatialData({ 
          commodity, 
          date, 
          timeWindow,
          visualizationMode,
          filters: filteredMarketData?.filters
        }));
      } catch (error) {
        if (isMounted) {
          handleError(error);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [commodity, date, timeWindow, visualizationMode, dispatch, handleError, filteredMarketData?.filters]);

  // Memoized return value to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    // Status
    isLoading,
    error,
    geometryStatus,

    // Core Data
    spatialData,
    detailedMetrics,
    activeRegionData,
    filteredMarketData,
    commodityInfo,

    // UI State
    visualizationMode,
    timeWindow,
    
    // Analysis Results
    metrics: {
      spatial: detailedMetrics?.spatialDependence,
      price: detailedMetrics?.priceStats,
      model: detailedMetrics?.modelFit
    },

    // Legacy Support
    clusters: clusters || [],
    flows: flows || [],
    points: points || [],

    // Helper Methods
    hasError: Boolean(error),
    isReady: Boolean(spatialData && !isLoading && !error),
    hasGeometry: geometryStatus.isComplete,
  }), [
    isLoading,
    error,
    geometryStatus,
    spatialData,
    detailedMetrics,
    activeRegionData,
    filteredMarketData,
    commodityInfo,
    visualizationMode,
    timeWindow,
    clusters,
    flows,
    points
  ]);

  return returnValue;
}
