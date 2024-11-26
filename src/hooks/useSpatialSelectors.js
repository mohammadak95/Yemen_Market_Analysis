// src/hooks/useSpatialSelectors.js

import { useSelector } from 'react-redux';
import {
  selectSpatialDataOptimized,
  selectMarketClusters,
  selectMarketFlows,
  selectTimeSeriesData,
  selectVisualizationMode,
  selectMarketIntegration,
  selectGeometryData,
  selectLoadingStatus,
  selectSpatialAutocorrelation,
  selectRegressionAnalysis,
  selectSeasonalAnalysis,
  selectMarketShocks,
  selectSelectedCommodity,
  selectSelectedDate,
  selectVisualizationData,
  selectFeatureDataWithMetrics,
  selectClustersWithCoordinates,
  selectFlowsWithCoordinates
} from '../selectors/optimizedSelectors';

// Centralized hooks for accessing spatial state
export const useSpatialData = () => useSelector(selectSpatialDataOptimized);
export const useMarketClusters = () => useSelector(selectMarketClusters);
export const useMarketFlows = () => useSelector(selectMarketFlows);
export const useTimeSeriesData = () => useSelector(selectTimeSeriesData);
export const useVisualizationMode = () => useSelector(selectVisualizationMode);
export const useMarketIntegration = () => useSelector(selectMarketIntegration);
export const useGeometryData = () => useSelector(selectGeometryData);
export const useLoadingStatus = () => useSelector(selectLoadingStatus);
export const useSpatialAutocorrelation = () => useSelector(selectSpatialAutocorrelation);
export const useRegressionAnalysis = () => useSelector(selectRegressionAnalysis);
export const useSeasonalAnalysis = () => useSelector(selectSeasonalAnalysis);
export const useMarketShocks = () => useSelector(selectMarketShocks);
export const useSelectedCommodity = () => useSelector(selectSelectedCommodity);
export const useSelectedDate = () => useSelector(selectSelectedDate);
export const useVisualizationData = () => useSelector(selectVisualizationData);
export const useFeatureDataWithMetrics = () => useSelector(selectFeatureDataWithMetrics);
export const useClustersWithCoordinates = () => useSelector(selectClustersWithCoordinates);
export const useFlowsWithCoordinates = () => useSelector(selectFlowsWithCoordinates);

// Combined hooks for common data needs
export const useSpatialAnalysisData = () => {
  const spatialData = useSpatialData();
  const loadingStatus = useLoadingStatus();
  const geometryData = useGeometryData();

  return {
    spatialData,
    loadingStatus,
    geometryData,
    isLoading: loadingStatus.loading,
    error: loadingStatus.error,
    progress: loadingStatus.progress
  };
};

export const useMarketAnalysisData = () => {
  const marketClusters = useMarketClusters();
  const marketFlows = useMarketFlows();
  const marketIntegration = useMarketIntegration();
  const timeSeriesData = useTimeSeriesData();

  return {
    marketClusters,
    marketFlows,
    marketIntegration,
    timeSeriesData
  };
};

export const useVisualizationState = () => {
  const mode = useVisualizationMode();
  const selectedCommodity = useSelectedCommodity();
  const selectedDate = useSelectedDate();
  const visualizationData = useVisualizationData();

  return {
    mode,
    selectedCommodity,
    selectedDate,
    visualizationData
  };
};

// Helper hook for checking data availability
export const useDataAvailability = () => {
  const { spatialData, loadingStatus } = useSpatialAnalysisData();
  
  return {
    isLoading: loadingStatus.loading,
    hasData: Boolean(spatialData),
    isError: Boolean(loadingStatus.error),
    errorMessage: loadingStatus.error
  };
};
