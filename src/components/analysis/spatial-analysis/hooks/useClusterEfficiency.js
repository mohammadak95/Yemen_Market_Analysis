// src/components/analysis/spatial-analysis/hooks/useClusterEfficiency.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectMarketClusters,
  selectFlowsWithCoordinates,
  selectTimeSeriesData,
} from '../../../../selectors/optimizedSelectors';
import { calculateEfficiencyMetrics } from '../utils/clusterAnalysis';

/**
 * Hook to process cluster efficiency data.
 * @returns {Array} Processed clusters with efficiency metrics.
 */
export const useClusterEfficiency = () => {
  const clusters = useSelector(selectMarketClusters);
  const flowData = useSelector(selectFlowsWithCoordinates);
  const timeSeriesData = useSelector(selectTimeSeriesData);

  const processedClusters = useMemo(() => {
    return calculateEfficiencyMetrics(clusters, flowData, timeSeriesData);
  }, [clusters, flowData, timeSeriesData]);

  return processedClusters;
};