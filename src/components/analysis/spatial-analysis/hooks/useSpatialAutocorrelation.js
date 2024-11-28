// src/components/analysis/spatial-analysis/hooks/useSpatialAutocorrelation.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

export const useSpatialAutocorrelation = () => {
  // Fix selector paths to match actual Redux state structure
  const spatialAutocorrelation = useSelector(state => state.spatial.data.spatialAutocorrelation);
  const geometry = useSelector(state => state.spatial.data.geometry?.unified);
  const timeSeriesData = useSelector(state => state.spatial.data.timeSeriesData);
  const status = useSelector(state => state.spatial.status);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('spatial-autocorrelation-hook');

    try {
      // Debug log to verify data
      console.log('Spatial Autocorrelation Data:', {
        spatialAutocorrelation,
        geometry,
        timeSeriesData
      });

      const { global, local } = spatialAutocorrelation || {};

      // Less strict validation - only require local data
      if (!local) {
        metric.finish({ status: 'warning', message: 'Missing local data' });
        return {
          data: null,
          loading: status.loading,
          error: 'Missing local spatial autocorrelation data'
        };
      }

      // Calculate cluster statistics with safety checks
      const clusters = Object.entries(local).reduce((acc, [region, cluster]) => {
        acc.totalClusters++;
        const clusterType = cluster.cluster_type || 'not-significant';
        acc[clusterType] = (acc[clusterType] || 0) + 1;
        return acc;
      }, { totalClusters: 0 });

      // Process time series data for visualization with better validation
      const processedTimeSeries = (timeSeriesData || [])
        .filter(d => d && typeof d.price !== 'undefined')
        .map(d => ({
          region: d.region,
          price: d.price,
          month: d.month,
          localI: local[d.region]?.local_i ?? 0,
          clusterType: local[d.region]?.cluster_type || 'not-significant'
        }));

      // Ensure global metrics exist with defaults
      const validatedGlobal = {
        moran_i: global?.moran_i ?? 0,
        p_value: global?.p_value ?? null,
        z_score: global?.z_score ?? null,
        significance: global?.significance ?? false
      };

      metric.finish({ status: 'success' });

      return {
        data: {
          global: validatedGlobal,
          local,
          geometry,
          timeSeriesData: processedTimeSeries,
          stats: clusters,
          significance: {
            // Consider clusters significant if they have a type, since p-values might be missing
            significant: Object.values(local).filter(c => c.cluster_type && c.cluster_type !== 'not-significant').length,
            total: Object.keys(local).length
          }
        },
        loading: status.loading,
        error: null
      };

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Error in spatial autocorrelation hook:', error);
      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [spatialAutocorrelation, geometry, timeSeriesData, status]);
};
