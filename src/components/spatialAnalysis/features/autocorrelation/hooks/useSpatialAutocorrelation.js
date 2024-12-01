import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectSpatialAutocorrelation,
  selectTimeSeriesData,
  selectGeometryData,
  selectAutocorrelationMetrics,
  selectStatus,
  selectMarketFlows
} from '../../../../../selectors/optimizedSelectors';
import { calculateGlobalMoranI, calculateLocalMoranI } from '../utils/spatialCalculations';
import {
  SIGNIFICANCE_LEVELS,
  CLUSTER_TYPES,
  DEFAULT_SPATIAL_METRICS,
  DEFAULT_CLUSTER_SUMMARY
} from '../types';

/**
 * Hook for managing spatial autocorrelation analysis
 */
export const useSpatialAutocorrelation = () => {
  // Get data and loading status from Redux
  const spatialData = useSelector(selectSpatialAutocorrelation);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const geometryData = useSelector(selectGeometryData);
  const metrics = useSelector(selectAutocorrelationMetrics);
  const status = useSelector(selectStatus);
  const flowData = useSelector(selectMarketFlows);

  // Transform geometry data into GeoJSON format
  const geometry = useMemo(() => {
    if (!geometryData) return null;

    // Debug log the geometry data structure
    console.debug('Geometry Data:', {
      hasGeometryData: !!geometryData,
      geometryKeys: Object.keys(geometryData),
      unifiedType: typeof geometryData.unified,
      hasUnified: !!geometryData.unified,
      unifiedKeys: geometryData.unified ? Object.keys(geometryData.unified) : []
    });

    try {
      // Check if unified is already in GeoJSON format
      if (geometryData.unified?.type === 'FeatureCollection') {
        return geometryData.unified;
      }

      // If unified is not in GeoJSON format, construct it from polygons
      if (Array.isArray(geometryData.polygons)) {
        return {
          type: 'FeatureCollection',
          features: geometryData.polygons.map(polygon => ({
            type: 'Feature',
            geometry: polygon.geometry,
            properties: {
              name: polygon.properties?.name || polygon.properties?.region_id,
              region_id: polygon.properties?.region_id || polygon.properties?.name,
              ...polygon.properties
            }
          }))
        };
      }

      console.warn('Invalid geometry data structure:', geometryData);
      return null;
    } catch (error) {
      console.error('Error transforming geometry data:', error);
      return null;
    }
  }, [geometryData]);

  // Calculate global Moran's I with flow-based weights
  const global = useMemo(() => {
    if (!timeSeriesData?.length || !flowData?.length) {
      return {
        moran_i: 0,
        p_value: 1,
        z_score: 0,
        significance: false
      };
    }

    // Get latest time period data for each region
    const latestData = new Map();
    timeSeriesData.forEach(d => {
      if (!latestData.has(d.region) || 
          new Date(d.month) > new Date(latestData.get(d.region).month)) {
        latestData.set(d.region, d);
      }
    });

    const currentData = Array.from(latestData.values());
    return calculateGlobalMoranI(currentData, flowData);
  }, [timeSeriesData, flowData]);

  // Calculate local Moran's I statistics with flow-based weights
  const local = useMemo(() => {
    if (!timeSeriesData?.length || !flowData?.length) {
      return {};
    }

    // Get latest time period data for each region
    const latestData = new Map();
    timeSeriesData.forEach(d => {
      if (!latestData.has(d.region) || 
          new Date(d.month) > new Date(latestData.get(d.region).month)) {
        latestData.set(d.region, d);
      }
    });

    const currentData = Array.from(latestData.values());
    return calculateLocalMoranI(currentData, flowData);
  }, [timeSeriesData, flowData]);

  // Calculate clusters with proper typing
  const clusters = useMemo(() => {
    const defaultClusters = {
      [CLUSTER_TYPES.HIGH_HIGH]: [],
      [CLUSTER_TYPES.LOW_LOW]: [],
      [CLUSTER_TYPES.HIGH_LOW]: [],
      [CLUSTER_TYPES.LOW_HIGH]: [],
      [CLUSTER_TYPES.NOT_SIGNIFICANT]: []
    };

    if (!local || Object.keys(local).length === 0) return defaultClusters;

    // Calculate clusters if we have local statistics
    return Object.entries(local).reduce((acc, [region, stats]) => {
      if (!stats) return acc;
      const type = stats.cluster_type || CLUSTER_TYPES.NOT_SIGNIFICANT;
      acc[type].push({ region, ...stats });
      return acc;
    }, { ...defaultClusters });
  }, [local]);

  // Calculate cluster analysis metrics
  const clusterAnalysis = useMemo(() => {
    if (!clusters || Object.values(clusters).every(arr => arr.length === 0)) {
      return DEFAULT_CLUSTER_SUMMARY;
    }

    const totals = {
      [CLUSTER_TYPES.HIGH_HIGH]: clusters[CLUSTER_TYPES.HIGH_HIGH].length,
      [CLUSTER_TYPES.LOW_LOW]: clusters[CLUSTER_TYPES.LOW_LOW].length,
      [CLUSTER_TYPES.HIGH_LOW]: clusters[CLUSTER_TYPES.HIGH_LOW].length,
      [CLUSTER_TYPES.LOW_HIGH]: clusters[CLUSTER_TYPES.LOW_HIGH].length,
      [CLUSTER_TYPES.NOT_SIGNIFICANT]: clusters[CLUSTER_TYPES.NOT_SIGNIFICANT].length
    };

    const totalRegions = Object.values(totals).reduce((sum, count) => sum + count, 0);
    const significantCount = totalRegions - totals[CLUSTER_TYPES.NOT_SIGNIFICANT];

    return {
      totals,
      significantCount,
      totalRegions,
      significanceRate: totalRegions > 0 ? (significantCount / totalRegions) * 100 : 0,
      hotspotRate: totalRegions > 0 ? (totals[CLUSTER_TYPES.HIGH_HIGH] / totalRegions) * 100 : 0,
      coldspotRate: totalRegions > 0 ? (totals[CLUSTER_TYPES.LOW_LOW] / totalRegions) * 100 : 0,
      outlierRate: totalRegions > 0 ? 
        ((totals[CLUSTER_TYPES.HIGH_LOW] + totals[CLUSTER_TYPES.LOW_HIGH]) / totalRegions) * 100 : 0
    };
  }, [clusters]);

  // Calculate spatial metrics
  const spatialMetrics = useMemo(() => {
    if (!metrics || !global) return DEFAULT_SPATIAL_METRICS;

    const localValues = Object.values(local);
    const maxLocalI = localValues.length > 0 
      ? Math.max(...localValues.map(l => Math.abs(l.local_i || 0)))
      : 0;

    return {
      globalMoranI: global.moran_i,
      pValue: global.p_value,
      zScore: global.z_score,
      avgLocalI: metrics.globalIndex ?? 0,
      maxLocalI,
      spatialAssociation: Math.abs(global.moran_i) * (global.significance ? 1 : 0.5),
      significanceLevels: {
        highlySignificant: metrics.highHigh + metrics.lowLow,
        significant: metrics.highLow + metrics.lowHigh,
        marginal: 0,
        notSignificant: metrics.notSignificant
      }
    };
  }, [metrics, global, local]);

  // Get region-specific metrics
  const getRegionMetrics = (regionId) => {
    if (!local || !local[regionId]) return null;

    try {
      const stats = local[regionId];
      const isSignificant = stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT;
      
      return {
        ...stats,
        isSignificant,
        significanceLevel: 
          stats.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? 'Highly Significant' :
          stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 'Significant' :
          stats.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? 'Marginally Significant' :
          'Not Significant',
        standardizedValue: stats.local_i / Math.sqrt(stats.variance || 1)
      };
    } catch (error) {
      console.error('Error getting region metrics:', error);
      return null;
    }
  };

  // Loading and error states
  const isLoading = status.loading || 
    (!spatialData && !status.error) || 
    (!timeSeriesData && !status.error) || 
    (!geometryData && !status.error) ||
    (!flowData && !status.error);
    
  const hasError = status.error !== null;

  // Debug information
  if (process.env.NODE_ENV === 'development') {
    console.debug('Spatial Analysis State:', {
      hasSpatialData: !!spatialData,
      hasTimeSeriesData: !!timeSeriesData,
      hasGeometry: !!geometryData,
      hasFlowData: !!flowData,
      hasMetrics: !!metrics,
      geometryFeatures: geometry?.features?.length,
      status,
      isLoading,
      hasError
    });
  }

  return {
    // Core data
    global,
    local,
    clusters,
    geometry,
    
    // Derived metrics
    clusterAnalysis,
    spatialMetrics,
    
    // Utility functions
    getRegionMetrics,
    
    // State
    isLoading,
    hasError
  };
};

export default useSpatialAutocorrelation;
