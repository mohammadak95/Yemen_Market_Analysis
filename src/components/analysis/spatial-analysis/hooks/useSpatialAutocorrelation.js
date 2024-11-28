// src/components/analysis/spatial-analysis/hooks/useSpatialAutocorrelation.js

import { useMemo } from 'react';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

export const useSpatialAutocorrelation = (spatialData) => {
  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('spatial-autocorrelation-hook');
    
    try {
      console.log('Spatial Autocorrelation Data:', {
        spatialAutocorrelation: spatialData?.spatialAutocorrelation,
        geometry: spatialData?.geometry,
        timeSeriesData: spatialData?.timeSeriesData
      });

      if (!spatialData?.spatialAutocorrelation) {
        return {
          loading: false,
          error: 'No spatial autocorrelation data available',
          moranI: 0,
          pValue: 1,
          zScore: 0,
          clusterCounts: null,
          localMorans: null
        };
      }

      const { global, local } = spatialData.spatialAutocorrelation;

      // Calculate cluster counts
      const clusterCounts = {
        highHigh: 0,
        lowLow: 0,
        highLow: 0,
        lowHigh: 0,
        total: 0
      };

      if (local) {
        Object.values(local).forEach(cluster => {
          if (!cluster?.cluster_type) return;
          
          switch (cluster.cluster_type) {
            case 'high-high':
              clusterCounts.highHigh++;
              break;
            case 'low-low':
              clusterCounts.lowLow++;
              break;
            case 'high-low':
              clusterCounts.highLow++;
              break;
            case 'low-high':
              clusterCounts.lowHigh++;
              break;
            default:
              break;
          }
        });

        clusterCounts.total = clusterCounts.highHigh + 
                            clusterCounts.lowLow + 
                            clusterCounts.highLow + 
                            clusterCounts.lowHigh;
      }

      metric.finish({ status: 'success' });

      return {
        loading: false,
        error: null,
        moranI: global?.moran_i || 0,
        pValue: global?.p_value || 1,
        zScore: global?.z_score || 0,
        clusterCounts,
        localMorans: local || null
      };

    } catch (error) {
      console.error('Error in useSpatialAutocorrelation:', error);
      metric.finish({ status: 'error', error: error.message });
      
      return {
        loading: false,
        error: error.message,
        moranI: 0,
        pValue: 1,
        zScore: 0,
        clusterCounts: null,
        localMorans: null
      };
    }
  }, [spatialData]);
};
