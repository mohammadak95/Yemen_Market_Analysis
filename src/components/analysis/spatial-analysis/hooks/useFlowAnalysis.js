// src/components/analysis/spatial-analysis/hooks/useFlowAnalysis.js
import { useMemo } from 'react';
import _ from 'lodash';
import { calculateNetworkStats, processFlowMetrics, aggregateTimeSeriesFlows } from '../utils/flowAnalysis';

export const useFlowAnalysis = (flows, marketIntegration, flowThreshold = 0) => {
  return useMemo(() => {
    // Filter flows based on threshold
    const filteredFlows = flows.filter(flow => flow.total_flow >= flowThreshold);
    
    // Calculate network statistics
    const networkStats = calculateNetworkStats(filteredFlows);

    // Process flow metrics by region
    const flowMetrics = processFlowMetrics(filteredFlows, marketIntegration);

    // Aggregate time series data
    const timeSeriesFlows = aggregateTimeSeriesFlows(filteredFlows);

    // Calculate market connectivity matrix
    const marketConnectivity = calculateMarketConnectivity(filteredFlows);

    return {
      flowMetrics,
      networkStats,
      timeSeriesFlows,
      marketConnectivity
    };
  }, [flows, marketIntegration, flowThreshold]);
};

// Helper function to calculate market connectivity
const calculateMarketConnectivity = (flows) => {
  const markets = _.uniq([
    ...flows.map(f => f.source),
    ...flows.map(f => f.target)
  ]);

  const matrix = {};
  markets.forEach(market => {
    matrix[market] = {};
    markets.forEach(otherMarket => {
      const directFlow = flows.find(f => 
        (f.source === market && f.target === otherMarket) ||
        (f.source === otherMarket && f.target === market)
      );
      matrix[market][otherMarket] = directFlow ? directFlow.total_flow : 0;
    });
  });

  return matrix;
};

