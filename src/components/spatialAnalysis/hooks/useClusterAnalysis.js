// src/components/spatialAnalysis/hooks/useClusterAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import {
  selectTimeSeriesData,
  selectMarketClusters,
  selectGeometryData
} from '../../../selectors/optimizedSelectors';

/**
 * Custom hook for analyzing market clusters
 * @returns {Object} Cluster analysis results
 */
export const useClusterAnalysis = () => {
  // Get data from Redux store
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const clusters = useSelector(selectMarketClusters);
  const geometry = useSelector(selectGeometryData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('cluster-analysis-hook');

    try {
      if (!clusters?.length) {
        return {
          clusters: [],
          metrics: null,
          loading: false,
          error: 'No cluster data available'
        };
      }

      // Calculate basic metrics for each cluster
      const enhancedClusters = clusters.map(cluster => {
        // Get time series data for cluster markets
        const clusterData = timeSeriesData.filter(d => 
          cluster.connected_markets.includes(d.region)
        );

        // Calculate average price and conflict intensity
        const avgPrice = clusterData.reduce((sum, d) => sum + (d.usdPrice || 0), 0) / clusterData.length;
        const avgConflict = clusterData.reduce((sum, d) => sum + (d.conflictIntensity || 0), 0) / clusterData.length;

        return {
          ...cluster,
          metrics: {
            avgPrice,
            avgConflict,
            marketCount: cluster.connected_markets.length
          }
        };
      });

      // Calculate overall metrics
      const overallMetrics = {
        totalMarkets: enhancedClusters.reduce((sum, c) => sum + c.metrics.marketCount, 0),
        avgPrice: enhancedClusters.reduce((sum, c) => sum + c.metrics.avgPrice, 0) / enhancedClusters.length,
        avgConflict: enhancedClusters.reduce((sum, c) => sum + c.metrics.avgConflict, 0) / enhancedClusters.length
      };

      metric.finish({ status: 'success' });

      return {
        clusters: enhancedClusters,
        metrics: overallMetrics,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error in useClusterAnalysis:', error);
      metric.finish({ status: 'error', error: error.message });

      return {
        clusters: [],
        metrics: null,
        loading: false,
        error: error.message
      };
    }
  }, [timeSeriesData, clusters, geometry]);
};

export default useClusterAnalysis;
