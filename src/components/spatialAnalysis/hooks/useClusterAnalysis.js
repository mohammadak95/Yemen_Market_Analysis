// src/hooks/useClusterAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { calculateClusterMetrics } from '../features/clusters/utils/clusterCalculations';

export const useClusterAnalysis = (selectedClusterId = null) => {
  const clusters = useSelector(state => state.spatial.data.marketClusters);
  const flows = useSelector(state => state.spatial.data.flowMaps);
  const timeSeriesData = useSelector(state => state.spatial.data.timeSeriesData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('cluster-analysis');

    try {
      if (!clusters?.length) {
        console.debug('No clusters available for analysis');
        return { clusters: [], selectedCluster: null };
      }

      // Debug data before calculation
      console.debug('Cluster Analysis Input:', {
        clustersCount: clusters.length,
        flowsCount: flows?.length,
        timeSeriesCount: timeSeriesData?.length,
        sampleCluster: clusters[0],
        sampleFlow: flows?.[0],
        sampleTimeSeries: timeSeriesData?.[0]
      });

      // Validate input data
      if (!Array.isArray(flows) || !flows.length) {
        console.warn('No flow data available for cluster analysis');
      }
      if (!Array.isArray(timeSeriesData) || !timeSeriesData.length) {
        console.warn('No time series data available for cluster analysis');
      }

      // Calculate metrics using centralized function
      const { clusters: processedClusters, metrics: overallMetrics } = 
        calculateClusterMetrics(clusters, timeSeriesData, flows);

      // Debug processed results
      console.debug('Processed Clusters:', {
        count: processedClusters.length,
        sampleMetrics: processedClusters[0]?.metrics,
        overallMetrics
      });

      // Find selected cluster if ID provided
      const selectedCluster = selectedClusterId ? 
        processedClusters.find(c => c.cluster_id === selectedClusterId) : 
        null;

      if (selectedCluster) {
        console.debug('Selected Cluster Metrics:', {
          clusterId: selectedCluster.cluster_id,
          metrics: selectedCluster.metrics,
          marketCount: selectedCluster.connected_markets?.length
        });
      }

      metric.finish({ status: 'success' });

      return {
        clusters: processedClusters,
        selectedCluster,
        metrics: overallMetrics
      };

    } catch (error) {
      console.error('Error in cluster analysis:', error);
      metric.finish({ status: 'error', error: error.message });
      return { clusters: [], selectedCluster: null, metrics: null };
    }
  }, [clusters, flows, timeSeriesData, selectedClusterId]);
};

export default useClusterAnalysis;
