// src/components/spatialAnalysis/hooks/useSpatialAutocorrelation.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import {
  selectGlobalAutocorrelation,
  selectLocalAutocorrelation,
  selectSignificantClusters,
  selectAutocorrelationSummary
} from '../../../selectors/spatialAnalysisSelectors';
import { selectGeometryData } from '../../../selectors/optimizedSelectors';

/**
 * Custom hook for spatial autocorrelation analysis
 * @returns {Object} Spatial autocorrelation analysis results
 */
export const useSpatialAutocorrelation = () => {
  // Get data using selectors
  const global = useSelector(selectGlobalAutocorrelation);
  const local = useSelector(selectLocalAutocorrelation);
  const clusters = useSelector(selectSignificantClusters);
  const summary = useSelector(selectAutocorrelationSummary);
  const geometry = useSelector(selectGeometryData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('spatial-autocorrelation-hook');

    try {
      if (!global || !local) {
        return {
          data: null,
          loading: false,
          error: 'No spatial autocorrelation data available'
        };
      }

      // Format data for components
      const formattedData = {
        global: {
          moranI: global.moran_i,
          pValue: global.p_value,
          zScore: global.z_score,
          isSignificant: global.significance
        },
        local: Object.entries(local).map(([region, stats]) => ({
          region,
          localI: stats.local_i,
          pValue: stats.p_value,
          clusterType: stats.cluster_type,
          zScore: stats.z_score
        })),
        clusters: {
          highHigh: clusters['high-high'],
          lowLow: clusters['low-low'],
          highLow: clusters['high-low'],
          lowHigh: clusters['low-high'],
          notSignificant: clusters['not_significant']
        },
        summary: {
          globalMoranI: summary.globalMoranI,
          globalSignificance: summary.globalSignificance,
          totalRegions: summary.totalRegions,
          significantRegions: summary.significantRegions,
          significanceRate: summary.significanceRate
        },
        geometry
      };

      metric.finish({ status: 'success' });

      return {
        data: formattedData,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error in useSpatialAutocorrelation:', error);
      metric.finish({ status: 'error', error: error.message });

      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [global, local, clusters, summary, geometry]);
};

export default useSpatialAutocorrelation;
