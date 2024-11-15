// src/hooks/useSpatialData.js

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadSpatialData } from '../slices/spatialSlice';
import { spatialIntegrationSystem } from '../utils/spatialIntegrationSystem';
import { spatialDebugUtils } from '../utils/spatialDebugUtils';

export const useSpatialData = () => {
  const dispatch = useDispatch();
  const mountedRef = useRef(true);
  
  // Get state from Redux
  const status = useSelector(state => state.spatial.status);
  const data = useSelector(state => state.spatial.data);
  const validation = useSelector(state => state.spatial.validation);
  const ui = useSelector(state => state.spatial.ui);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Data fetching function
  const fetchData = useCallback(async (commodity, date, options = {}) => {
    if (!commodity || !mountedRef.current) return;

    try {
      await dispatch(loadSpatialData({
        selectedCommodity: commodity,
        selectedDate: date,
        ...options
      })).unwrap();
      
      // Get quality report after successful load
      const qualityReport = await spatialIntegrationSystem.getDataQualityReport(
        commodity,
        date
      );
      
      spatialDebugUtils.log('Data quality report:', qualityReport);
      
      return qualityReport;
    } catch (error) {
      console.error('Error fetching spatial data:', error);
      throw error;
    }
  }, [dispatch]);

  // Memoized derived data
  const processedData = useMemo(() => {
    if (!data) return null;

    return {
      timeSeriesData: data.timeSeriesData,
      marketClusters: data.marketClusters,
      flowAnalysis: data.flowAnalysis,
      spatialMetrics: data.spatialAutocorrelation,
      integrationMetrics: data.metrics
    };
  }, [data]);

  return {
    status,
    data: processedData,
    validation,
    ui,
    fetchData
  };
};

// Additional hooks for specific analysis types
export const useTimeSeriesAnalysis = () => {
  const data = useSelector(state => state.spatial.data.timeSeriesData);
  const selectedCommodity = useSelector(state => state.spatial.ui.selectedCommodity);

  return useMemo(() => {
    if (!data?.length) return null;

    const prices = data.map(d => d.avgUsdPrice);
    const volatility = data.map(d => d.volatility);
    const stability = data.map(d => d.price_stability);

    return {
      averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      averageVolatility: volatility.reduce((a, b) => a + b, 0) / volatility.length,
      averageStability: stability.reduce((a, b) => a + b, 0) / stability.length,
      observations: data.length,
      dateRange: {
        start: data[0]?.month,
        end: data[data.length - 1]?.month
      }
    };
  }, [data]);
};

export const useMarketClusters = () => {
  const clusters = useSelector(state => state.spatial.data.marketClusters);
  const flows = useSelector(state => state.spatial.data.flowAnalysis);

  return useMemo(() => {
    if (!clusters?.length) return null;

    return {
      totalClusters: clusters.length,
      averageClusterSize: clusters.reduce((acc, c) => 
        acc + c.market_count, 0) / clusters.length,
      largestCluster: Math.max(...clusters.map(c => c.market_count)),
      smallestCluster: Math.min(...clusters.map(c => c.market_count)),
      efficiency: clusters.reduce((acc, c) => 
        acc + (c.efficiency?.efficiency_score || 0), 0) / clusters.length,
      flowMetrics: flows ? {
        totalFlows: flows.length,
        averageFlow: flows.reduce((acc, f) => acc + f.avg_flow, 0) / flows.length
      } : null
    };
  }, [clusters, flows]);
};

export const useSpatialAnalysis = () => {
  const spatialData = useSelector(state => state.spatial.data.spatialAutocorrelation);
  const geoData = useSelector(state => state.spatial.data.geoData);

  return useMemo(() => {
    if (!spatialData?.global || !geoData) return null;

    const localPatterns = _.countBy(
      Object.values(spatialData.local || {}),
      'cluster_type'
    );

    const hotspots = _.countBy(
      Object.values(spatialData.hotspots || {}),
      'intensity'
    );

    return {
      globalStatistics: {
        moranI: spatialData.global.moran_i,
        significance: spatialData.global.significance,
        pValue: spatialData.global.p_value
      },
      localPatterns,
      hotspots,
      coverage: geoData.features.length
    };
  }, [spatialData, geoData]);
};