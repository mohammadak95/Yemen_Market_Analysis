// src/components/spatialAnalysis/hooks/useFlowAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { selectFlowAnalysisData } from '../../../selectors/spatialAnalysisSelectors';

/**
 * Custom hook for analyzing market flow data
 * @returns {Object} Flow analysis results
 */
export const useFlowAnalysis = () => {
  const flowData = useSelector(selectFlowAnalysisData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('flow-analysis-hook');

    try {
      if (!flowData) {
        return {
          data: null,
          loading: false,
          error: 'No flow data available'
        };
      }

      const { flows, geometry, summary } = flowData;

      // Format data for visualization
      const formattedData = {
        flows: flows.map(flow => ({
          source: flow.source,
          target: flow.target,
          value: flow.totalFlow,
          average: flow.avgFlow,
          count: flow.flowCount,
          priceDiff: flow.avgPriceDifferential,
          // Add normalized values for visualization
          normalizedValue: flow.totalFlow / summary.maxFlow,
          intensity: flow.avgFlow / summary.averageFlowStrength
        })),
        geometry,
        summary: {
          ...summary,
          // Add additional derived metrics
          flowDensity: summary.totalFlows / (flows.length * (flows.length - 1) / 2),
          averageIntensity: summary.averageFlowStrength / summary.maxFlow
        }
      };

      metric.finish({ status: 'success' });

      return {
        data: formattedData,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error in useFlowAnalysis:', error);
      metric.finish({ status: 'error', error: error.message });

      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [flowData]);
};

export default useFlowAnalysis;
