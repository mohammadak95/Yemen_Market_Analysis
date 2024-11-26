// src/components/analysis/spatial-analysis/hooks/useFlowAnalysis.js

import { useMemo } from 'react';
import { 
  calculateFlowMetrics, 
  computeNetworkStatistics, 
  aggregateTimeSeriesFlows 
} from '../utils/flowAnalysis';

/**
 * Hook to analyze market flow data and compute network metrics.
 * @param {Array} flows - Array of flow data between markets.
 * @param {Object} marketIntegration - Market integration data.
 * @param {number} threshold - Flow threshold value.
 * @param {string} metricType - Type of metric to filter by ('total_flow', 'avg_price_differential', 'flow_count').
 * @returns {Object} Processed flow metrics, network statistics, and filtered flows.
 */
export const useFlowAnalysis = (flows = [], marketIntegration = {}, threshold = 0, metricType = 'total_flow') => {
  return useMemo(() => {
    if (!flows.length) {
      return {
        flowMetrics: {
          totalFlows: 0,
          averageFlow: 0,
          maxFlow: 0,
          flowCount: 0,
          flowDensity: 0,
          uniqueMarkets: 0,
          topFlows: []
        },
        networkStats: {
          networkDensity: 0,
          averageConnectivity: 0,
          marketCount: 0,
          activeMarkets: 0,
          totalVolume: 0,
          avgFlowSize: 0,
          flowDensity: 0,
          integrationScore: 0,
          centralityMetrics: {}
        },
        timeSeriesFlows: {
          daily: [],
          weekly: [],
          monthly: []
        },
        filteredFlows: []
      };
    }

    // Filter flows based on the selected metric type and threshold
    const filteredFlows = flows.filter(flow => flow[metricType] >= threshold);

    // Calculate flow metrics using filtered flows
    const flowMetrics = calculateFlowMetrics(filteredFlows, 0); // threshold is 0 since we've already filtered

    // Compute network statistics using filtered flows
    const networkStats = computeNetworkStatistics(filteredFlows, marketIntegration);

    // Aggregate time series flows using filtered flows
    const timeSeriesFlows = aggregateTimeSeriesFlows(filteredFlows);

    return {
      flowMetrics,
      networkStats,
      timeSeriesFlows,
      filteredFlows
    };
  }, [flows, marketIntegration, threshold, metricType]);
};
