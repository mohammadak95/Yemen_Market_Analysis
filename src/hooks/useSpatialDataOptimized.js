// useSpatialDataOptimized.js

import { useSelector } from 'react-redux';
import {
  getClustersWithCoordinates,
  getFlowDataWithCoordinates,
  getGeometryPoints,
  selectVisualizationMode,
  getSelectedCommodity,
  getSelectedDate,
  selectLoadingStatus,
} from './optimizedSelectors';

export function useSpatialData() {
  const clustersWithCoordinates = useSelector(getClustersWithCoordinates);
  const flowDataWithCoordinates = useSelector(getFlowDataWithCoordinates);
  const geometryPoints = useSelector(getGeometryPoints);
  const visualizationMode = useSelector(selectVisualizationMode);
  const selectedCommodity = useSelector(getSelectedCommodity);
  const selectedDate = useSelector(getSelectedDate);
  const isLoading = useSelector(selectLoadingStatus);

  // Handle missing or NaN values
  const clusters = clustersWithCoordinates || [];
  const flows = flowDataWithCoordinates || [];
  const points = geometryPoints || [];

  return {
    clusters,
    flows,
    points,
    visualizationMode,
    selectedCommodity,
    selectedDate,
    isLoading,
  };
}