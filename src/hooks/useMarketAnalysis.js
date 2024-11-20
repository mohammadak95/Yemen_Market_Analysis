// useMarketAnalysis.js

import { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectSpatialData,
  selectVisualizationMode,
  selectAnalysisFilters,
  selectActiveLayers,
  setVisualizationMode,
  setAnalysisFilters,
  setActiveLayers,
  fetchVisualizationData
} from '../slices/spatialSlice';
import { calculateVisualizationMetrics } from '../utils/marketAnalysisUtils';
import { VISUALIZATION_MODES } from '../constants';

export function useMarketAnalysis() {
  const dispatch = useDispatch();
  
  // Core data selectors
  const data = useSelector(selectSpatialData);
  const visualizationMode = useSelector(selectVisualizationMode);
  const analysisFilters = useSelector(selectAnalysisFilters);
  const activeLayers = useSelector(selectActiveLayers);

  // Memoized visualization data
  const visualizationData = useMemo(() => {
    if (!data) return null;

    try {
      return calculateVisualizationMetrics[visualizationMode].calculateMetrics(
        data,
        analysisFilters
      );
    } catch (error) {
      console.error('Error calculating visualization metrics:', error);
      return null;
    }
  }, [data, visualizationMode, analysisFilters]);

  // Analysis metrics calculations
  const analysisMetrics = useMemo(() => {
    if (!data) return null;

    const {
      marketMetrics,
      timeSeriesAnalysis,
      spatialAnalysis
    } = calculateVisualizationMetrics[visualizationMode].calculateAnalysisMetrics(
      data,
      analysisFilters
    );

    return {
      marketMetrics,
      timeSeriesAnalysis,
      spatialAnalysis,
      timestamp: new Date().toISOString()
    };
  }, [data, visualizationMode, analysisFilters]);

  // Handlers for UI interactions
  const handleVisualizationModeChange = useCallback(async (mode) => {
    if (!VISUALIZATION_MODES[mode]) {
      console.error(`Invalid visualization mode: ${mode}`);
      return;
    }

    dispatch(setVisualizationMode(mode));
    
    // Fetch visualization-specific data if needed
    await dispatch(fetchVisualizationData({
      mode,
      filters: analysisFilters
    }));
  }, [dispatch, analysisFilters]);

  const handleFiltersChange = useCallback((newFilters) => {
    dispatch(setAnalysisFilters(newFilters));
  }, [dispatch]);

  const handleLayerToggle = useCallback((layer) => {
    dispatch(setActiveLayers(
      activeLayers.includes(layer)
        ? activeLayers.filter(l => l !== layer)
        : [...activeLayers, layer]
    ));
  }, [dispatch, activeLayers]);

  // Time series analysis utilities
  const getTimeSeriesMetrics = useCallback((timeRange = null) => {
    if (!data?.timeSeriesData) return null;

    return calculateVisualizationMetrics.prices.processTimeSeries(
      data.timeSeriesData,
      timeRange
    );
  }, [data]);

  // Market integration analysis utilities
  const getIntegrationMetrics = useCallback((marketId = null) => {
    if (!data?.marketIntegration) return null;

    return calculateVisualizationMetrics.integration.calculateMetrics(
      data,
      marketId
    );
  }, [data]);

  // Cluster analysis utilities
  const getClusterMetrics = useCallback((clusterId = null) => {
    if (!data?.marketClusters) return null;

    return calculateVisualizationMetrics.clusters.analyzeEfficiency(
      clusterId ? [data.marketClusters.find(c => c.cluster_id === clusterId)] 
                : data.marketClusters,
      data.flowAnalysis
    );
  }, [data]);

  // Shock analysis utilities
  const getShockMetrics = useCallback((regionId = null) => {
    if (!data?.marketShocks) return null;

    return calculateVisualizationMetrics.shocks.analyzePatterns(
      regionId ? data.marketShocks.filter(s => s.region === regionId)
               : data.marketShocks,
      data.timeSeriesData
    );
  }, [data]);

  return {
    // Core state
    data,
    visualizationMode,
    visualizationData,
    analysisMetrics,
    analysisFilters,
    activeLayers,

    // UI handlers
    onVisualizationModeChange: handleVisualizationModeChange,
    onFiltersChange: handleFiltersChange,
    onLayerToggle: handleLayerToggle,

    // Analysis utilities
    getTimeSeriesMetrics,
    getIntegrationMetrics,
    getClusterMetrics,
    getShockMetrics,

    // Loading states
    loading: false, // Add loading state management if needed
    error: null, // Add error state management if needed
  };
}