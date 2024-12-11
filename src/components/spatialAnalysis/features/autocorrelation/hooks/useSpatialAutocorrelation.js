//src/components/spatialAnalysis/features/autocorrelation/hooks/useSpatialAutocorrelation.js

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
 * Hook for managing spatial autocorrelation analysis with improved statistical inference
 */
export const useSpatialAutocorrelation = () => {
  // Get data and loading status from Redux
  const spatialData = useSelector(selectSpatialAutocorrelation);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const geometryData = useSelector(selectGeometryData);
  const metrics = useSelector(selectAutocorrelationMetrics);
  const status = useSelector(selectStatus);
  const flowData = useSelector(selectMarketFlows);

  // Transform geometry data into GeoJSON format with improved error handling
  const geometry = useMemo(() => {
    if (!geometryData) return null;

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

  // Calculate global Moran's I with improved statistical inference
  const global = useMemo(() => {
    if (!timeSeriesData?.length || !flowData?.length) {
      return {
        moran_i: 0,
        p_value: 1,
        z_score: 0,
        significance: false
      };
    }

    try {
      // Get latest time period data for each region with improved date handling
      const latestData = new Map();
      timeSeriesData.forEach(d => {
        const currentDate = new Date(d.month);
        if (!latestData.has(d.region) || 
            currentDate > new Date(latestData.get(d.region).month)) {
          latestData.set(d.region, d);
        }
      });

      const currentData = Array.from(latestData.values());
      return calculateGlobalMoranI(currentData, flowData);
    } catch (error) {
      console.error('Error calculating global Moran\'s I:', error);
      return {
        moran_i: 0,
        p_value: 1,
        z_score: 0,
        significance: false
      };
    }
  }, [timeSeriesData, flowData]);

  // Calculate local Moran's I statistics with improved precision
  const local = useMemo(() => {
    if (!timeSeriesData?.length || !flowData?.length) {
      return {};
    }

    try {
      // Get latest time period data with improved date handling
      const latestData = new Map();
      timeSeriesData.forEach(d => {
        const currentDate = new Date(d.month);
        if (!latestData.has(d.region) || 
            currentDate > new Date(latestData.get(d.region).month)) {
          latestData.set(d.region, d);
        }
      });

      const currentData = Array.from(latestData.values());
      return calculateLocalMoranI(currentData, flowData);
    } catch (error) {
      console.error('Error calculating local Moran\'s I:', error);
      return {};
    }
  }, [timeSeriesData, flowData]);

  // Calculate clusters with improved classification
  const clusters = useMemo(() => {
    const defaultClusters = {
      [CLUSTER_TYPES.HIGH_HIGH]: [],
      [CLUSTER_TYPES.LOW_LOW]: [],
      [CLUSTER_TYPES.HIGH_LOW]: [],
      [CLUSTER_TYPES.LOW_HIGH]: [],
      [CLUSTER_TYPES.NOT_SIGNIFICANT]: []
    };

    if (!local || Object.keys(local).length === 0) return defaultClusters;

    try {
      // Calculate clusters with improved significance testing
      return Object.entries(local).reduce((acc, [region, stats]) => {
        if (!stats) return acc;
        const type = stats.cluster_type || CLUSTER_TYPES.NOT_SIGNIFICANT;
        
        // Include additional statistical information
        acc[type].push({
          region,
          ...stats,
          standardizedValue: stats.z_score,
          significanceLevel: stats.p_value <= 0.01 ? 'Highly Significant' :
                           stats.p_value <= 0.05 ? 'Significant' :
                           'Not Significant'
        });
        return acc;
      }, { ...defaultClusters });
    } catch (error) {
      console.error('Error calculating clusters:', error);
      return defaultClusters;
    }
  }, [local]);

  // Calculate cluster analysis metrics with improved statistical measures
  const clusterAnalysis = useMemo(() => {
    if (!clusters || Object.values(clusters).every(arr => arr.length === 0)) {
      return DEFAULT_CLUSTER_SUMMARY;
    }

    try {
      const totals = {
        [CLUSTER_TYPES.HIGH_HIGH]: clusters[CLUSTER_TYPES.HIGH_HIGH].length,
        [CLUSTER_TYPES.LOW_LOW]: clusters[CLUSTER_TYPES.LOW_LOW].length,
        [CLUSTER_TYPES.HIGH_LOW]: clusters[CLUSTER_TYPES.HIGH_LOW].length,
        [CLUSTER_TYPES.LOW_HIGH]: clusters[CLUSTER_TYPES.LOW_HIGH].length,
        [CLUSTER_TYPES.NOT_SIGNIFICANT]: clusters[CLUSTER_TYPES.NOT_SIGNIFICANT].length
      };

      const totalRegions = Object.values(totals).reduce((sum, count) => sum + count, 0);
      const significantCount = totalRegions - totals[CLUSTER_TYPES.NOT_SIGNIFICANT];

      // Calculate improved metrics
      return {
        totals,
        significantCount,
        totalRegions,
        significanceRate: totalRegions > 0 ? (significantCount / totalRegions) * 100 : 0,
        hotspotRate: totalRegions > 0 ? (totals[CLUSTER_TYPES.HIGH_HIGH] / totalRegions) * 100 : 0,
        coldspotRate: totalRegions > 0 ? (totals[CLUSTER_TYPES.LOW_LOW] / totalRegions) * 100 : 0,
        outlierRate: totalRegions > 0 ? 
          ((totals[CLUSTER_TYPES.HIGH_LOW] + totals[CLUSTER_TYPES.LOW_HIGH]) / totalRegions) * 100 : 0,
        clusterStrength: calculateClusterStrength(clusters)
      };
    } catch (error) {
      console.error('Error calculating cluster analysis:', error);
      return DEFAULT_CLUSTER_SUMMARY;
    }
  }, [clusters]);

  // Calculate spatial metrics with improved statistical measures
  const spatialMetrics = useMemo(() => {
    if (!metrics || !global) return DEFAULT_SPATIAL_METRICS;

    try {
      const localValues = Object.values(local);
      const maxLocalI = localValues.length > 0 
        ? Math.max(...localValues.map(l => Math.abs(l.local_i || 0)))
        : 0;

      // Calculate improved spatial association measure
      const spatialAssociation = calculateSpatialAssociation(global, localValues);

      return {
        globalMoranI: global.moran_i,
        pValue: global.p_value,
        zScore: global.z_score,
        avgLocalI: metrics.globalIndex ?? 0,
        maxLocalI,
        spatialAssociation,
        significanceLevels: calculateSignificanceLevels(localValues)
      };
    } catch (error) {
      console.error('Error calculating spatial metrics:', error);
      return DEFAULT_SPATIAL_METRICS;
    }
  }, [metrics, global, local]);

  // Get region-specific metrics with improved statistical inference
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
        standardizedValue: stats.z_score,
        clusterStrength: Math.abs(stats.local_i) * (isSignificant ? 1 : 0.5)
      };
    } catch (error) {
      console.error('Error getting region metrics:', error);
      return null;
    }
  };

  // Helper function to calculate cluster strength
  const calculateClusterStrength = (clusters) => {
    const significantClusters = [
      ...clusters[CLUSTER_TYPES.HIGH_HIGH],
      ...clusters[CLUSTER_TYPES.LOW_LOW]
    ];
    
    if (significantClusters.length === 0) return 0;
    
    return significantClusters.reduce((sum, cluster) => 
      sum + Math.abs(cluster.local_i || 0), 0) / significantClusters.length;
  };

  // Helper function to calculate spatial association
  const calculateSpatialAssociation = (global, localValues) => {
    if (!global || !localValues.length) return 0;
    
    const significantLocal = localValues.filter(v => v.p_value <= 0.05);
    const localStrength = significantLocal.length > 0 
      ? significantLocal.reduce((sum, v) => sum + Math.abs(v.local_i || 0), 0) / significantLocal.length
      : 0;
    
    return Math.abs(global.moran_i) * (global.significance ? 1 : 0.5) * (1 + localStrength) / 2;
  };

  // Helper function to calculate significance levels
  const calculateSignificanceLevels = (localValues) => {
    return localValues.reduce((acc, value) => ({
      highlySignificant: acc.highlySignificant + (value.p_value <= 0.01 ? 1 : 0),
      significant: acc.significant + (value.p_value <= 0.05 && value.p_value > 0.01 ? 1 : 0),
      marginal: acc.marginal + (value.p_value <= 0.1 && value.p_value > 0.05 ? 1 : 0),
      notSignificant: acc.notSignificant + (value.p_value > 0.1 ? 1 : 0)
    }), {
      highlySignificant: 0,
      significant: 0,
      marginal: 0,
      notSignificant: 0
    });
  };

  // Loading and error states
  const isLoading = status.loading || 
    (!spatialData && !status.error) || 
    (!timeSeriesData && !status.error) || 
    (!geometryData && !status.error) ||
    (!flowData && !status.error);
    
  const hasError = status.error !== null;

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
