// src/components/analysis/spatial-analysis/hooks/useSpatialAutocorrelation.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  selectSpatialAutocorrelation, 
  selectTimeSeriesData,
  selectGeometryData
} from '../../../../selectors/optimizedSelectors';
import { calculateLocalMorans } from '../utils/spatialAnalysis';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

export const useSpatialAutocorrelation = () => {
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const geometryData = useSelector(selectGeometryData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('spatial-autocorrelation-processing');

    try {
      if (!timeSeriesData?.length || !geometryData?.unified) {
        return {
          global: null,
          local: null,
          loading: false,
          error: 'Missing required data'
        };
      }

      // If we already have processed autocorrelation data, use it
      if (spatialAutocorrelation?.global && spatialAutocorrelation?.local) {
        metric.finish({ status: 'success', source: 'cache' });
        return {
          ...spatialAutocorrelation,
          loading: false,
          error: null
        };
      }

      // Calculate local Moran's I if not available
      const localResults = calculateLocalMorans(timeSeriesData, geometryData.unified);
      
      const results = {
        global: {
          moran_i: localResults.globalI,
          z_score: localResults.zScore,
          p_value: localResults.pValue
        },
        local: localResults.clusters,
        loading: false,
        error: null
      };

      metric.finish({ status: 'success', source: 'calculation' });
      return results;

    } catch (error) {
      console.error('Error in spatial autocorrelation processing:', error);
      metric.finish({ status: 'error', error: error.message });
      return {
        global: null,
        local: null,
        loading: false,
        error: error.message
      };
    }
  }, [spatialAutocorrelation, timeSeriesData, geometryData]);
};