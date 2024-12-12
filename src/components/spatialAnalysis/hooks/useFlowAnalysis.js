// src/components/spatialAnalysis/hooks/useFlowAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { 
  selectFlowState,
  selectFlowMetrics,
  selectFlowMetadata 
} from '../../../slices/flowSlice';
import { flowValidation } from '../features/flows/types';

/**
 * Custom hook for analyzing market flow data
 * @returns {Object} Flow analysis results
 */
export const useFlowAnalysis = () => {
  const { byDate, status } = useSelector(selectFlowState);
  const metrics = useSelector(selectFlowMetrics);
  const metadata = useSelector(selectFlowMetadata);
  const selectedCommodity = useSelector(state => state.ecm.ui.selectedCommodity);
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('flow-analysis-hook');

    try {
      // Get flows for the selected date
      const flows = selectedDate ? byDate[selectedDate] : [];

      if (!flows?.length) {
        return {
          data: null,
          loading: status.loading,
          error: `No flow data available for ${selectedCommodity} in ${selectedDate}`
        };
      }

      // Filter valid flows and calculate max flow
      const validFlows = flows.filter(flow => 
        flowValidation.isValidFlow(flow) && 
        flow.metadata.valid
      );

      if (!validFlows.length) {
        return {
          data: null,
          loading: status.loading,
          error: `No valid flow data for ${selectedCommodity} in ${selectedDate}`
        };
      }

      const maxFlow = Math.max(...validFlows.map(flow => flow.flow_weight), 0);
      const avgFlow = validFlows.reduce((sum, flow) => sum + flow.flow_weight, 0) / validFlows.length || 0;

      // Format data for visualization
      const formattedData = {
        flows: validFlows.map(flow => ({
          source: flow.source,
          target: flow.target,
          value: flow.flow_weight,
          average: flow.flow_weight,
          count: 1,
          priceDiff: flow.price_differential,
          // Add normalized values for visualization
          normalizedValue: maxFlow > 0 ? flow.flow_weight / maxFlow : 0,
          intensity: avgFlow > 0 ? flow.flow_weight / avgFlow : 0,
          metadata: flow.metadata,
          // Add coordinates
          source_coordinates: flow.source_coordinates,
          target_coordinates: flow.target_coordinates
        })),
        summary: {
          totalFlows: validFlows.length,
          maxFlow,
          averageFlowStrength: avgFlow,
          flowDensity: metrics?.marketConnectivity || 0,
          averageIntensity: maxFlow > 0 ? avgFlow / maxFlow : 0,
          uniqueMarkets: metadata?.uniqueMarkets || 0,
          dateRange: metadata?.dateRange || { start: null, end: null },
          commodity: selectedCommodity
        }
      };

      metric.finish({ 
        status: 'success',
        flowCount: validFlows.length,
        marketCount: metadata?.uniqueMarkets || 0,
        date: selectedDate,
        commodity: selectedCommodity
      });

      return {
        data: formattedData,
        loading: status.loading,
        error: null
      };

    } catch (error) {
      console.error('Error in useFlowAnalysis:', error);
      metric.finish({ 
        status: 'error', 
        error: error.message,
        date: selectedDate,
        commodity: selectedCommodity
      });

      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [byDate, selectedDate, metrics, metadata, selectedCommodity, status]);
};

export default useFlowAnalysis;
