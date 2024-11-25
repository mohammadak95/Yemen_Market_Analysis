// src/hooks/useSpatialData.js

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllSpatialData,
  selectSpatialData,
  selectLoadingStatus,
  selectVisualizationMode,
  selectSelectedCommodity,
  selectSelectedDate,
} from '../slices/spatialSlice';
import {
  selectClustersWithCoordinates,
  selectFlowDataWithCoordinates,
  selectGeometryPoints,
} from '../selectors/spatialSelectors';

export function useSpatialData() {
  const dispatch = useDispatch();
  const commodity = useSelector(selectSelectedCommodity);
  const date = useSelector(selectSelectedDate);

  // Fetch spatial data when commodity or date changes
  useEffect(() => {
    if (commodity && date) {
      dispatch(fetchAllSpatialData({ commodity, date }));
    }
  }, [commodity, date, dispatch]);

  const isLoading = useSelector(selectLoadingStatus);
  const spatialData = useSelector(selectSpatialData);
  const visualizationMode = useSelector(selectVisualizationMode);

  // Use memoized selectors for performance
  const clusters = useSelector(selectClustersWithCoordinates);
  const flows = useSelector(selectFlowDataWithCoordinates);
  const points = useSelector(selectGeometryPoints);

  return {
    isLoading,
    spatialData,
    visualizationMode,
    clusters: clusters || [],
    flows: flows || [],
    points: points || [],
  };
}