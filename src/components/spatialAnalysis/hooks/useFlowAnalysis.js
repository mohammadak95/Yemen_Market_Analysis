// src/components/spatialAnalysis/hooks/useFlowAnalysis.js

import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { 
  selectFlowState,
  selectFlowMetrics,
  selectFlowMetadata,
  selectFlowsByDate
} from '../../../slices/flowSlice';
import { flowValidation } from '../features/flows/types';

// Custom error types for better error handling
class FlowAnalysisError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'FlowAnalysisError';
    this.details = details;
  }
}

class FlowValidationError extends FlowAnalysisError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = 'FlowValidationError';
  }
}

// Type validation helpers
const isValidFlowData = (flow) => {
  if (!flow || typeof flow !== 'object') return false;
  return (
    typeof flow.source === 'string' &&
    typeof flow.target === 'string' &&
    typeof flow.flow_weight === 'number' &&
    !isNaN(flow.flow_weight) &&
    flow.metadata?.valid === true
  );
};

// Performance-optimized data processing
const processFlowData = (flows, maxFlow, avgFlow) => {
  if (!Array.isArray(flows) || flows.length === 0) return [];
  
  return flows.map(flow => ({
    source: flow.source,
    target: flow.target,
    value: flow.flow_weight,
    average: flow.flow_weight,
    count: 1,
    priceDiff: flow.price_differential,
    normalizedValue: maxFlow > 0 ? flow.flow_weight / maxFlow : 0,
    intensity: avgFlow > 0 ? flow.flow_weight / avgFlow : 0,
    metadata: flow.metadata,
    source_coordinates: flow.source_coordinates,
    target_coordinates: flow.target_coordinates
  }));
};

// Memoized calculation functions
const calculateFlowStats = (validFlows) => {
  if (!validFlows?.length) return { maxFlow: 0, avgFlow: 0 };
  
  const maxFlow = Math.max(...validFlows.map(flow => flow.flow_weight), 0);
  const avgFlow = validFlows.reduce((sum, flow) => sum + flow.flow_weight, 0) / validFlows.length || 0;
  
  return { maxFlow, avgFlow };
};

/**
 * Custom hook for analyzing market flow data
 * Includes enhanced error handling, performance optimization, and data validation
 * @returns {Object} Flow analysis results and error handling
 */
export const useFlowAnalysis = () => {
  const { status } = useSelector(selectFlowState);
  const metrics = useSelector(selectFlowMetrics);
  const metadata = useSelector(selectFlowMetadata);
  const selectedCommodity = useSelector(state => state.ecm.ui.selectedCommodity);
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);
  const currentFlows = useSelector(state => selectFlowsByDate(state, selectedDate));

  // Memoized flow validation
  const validateFlows = useCallback((flows) => {
    if (!Array.isArray(flows)) {
      throw new FlowValidationError('Invalid flow data format', { 
        received: typeof flows 
      });
    }

    return flows.filter(flow => {
      try {
        return isValidFlowData(flow) && flowValidation.isValidFlow(flow);
      } catch (error) {
        console.debug('Flow validation failed:', { flow, error });
        return false;
      }
    });
  }, []);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('flow-analysis-hook');
    const context = { 
      commodity: selectedCommodity, 
      date: selectedDate 
    };

    try {
      // Input validation
      if (!selectedCommodity || !selectedDate) {
        throw new FlowAnalysisError('Missing required parameters', context);
      }

      if (!currentFlows?.length) {
        console.debug('No flow data available:', context);
        return {
          data: null,
          loading: status.loading,
          error: `No flow data available for ${selectedCommodity} in ${selectedDate}`
        };
      }

      // Validate and filter flows
      const validFlows = validateFlows(currentFlows);

      if (!validFlows.length) {
        console.debug('No valid flows found:', context);
        return {
          data: null,
          loading: status.loading,
          error: `No valid flow data for ${selectedCommodity} in ${selectedDate}`
        };
      }

      // Calculate flow statistics
      const { maxFlow, avgFlow } = calculateFlowStats(validFlows);

      // Process and format data
      const formattedData = {
        flows: processFlowData(validFlows, maxFlow, avgFlow),
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
        ...context
      });

      return {
        data: formattedData,
        loading: status.loading,
        error: null,
        // Add metadata for debugging and monitoring
        metadata: {
          processedAt: new Date().toISOString(),
          validFlowCount: validFlows.length,
          totalFlowCount: currentFlows.length,
          ...context
        }
      };

    } catch (error) {
      console.error('Error in useFlowAnalysis:', error);
      
      // Enhanced error reporting
      const errorDetails = {
        type: error.name || 'Unknown',
        message: error.message,
        details: error.details || {},
        ...context
      };

      metric.finish({ 
        status: 'error',
        ...errorDetails
      });

      return {
        data: null,
        loading: false,
        error: error.message,
        errorDetails
      };
    }
  }, [
    currentFlows,
    selectedDate,
    selectedCommodity,
    metrics,
    metadata,
    status,
    validateFlows // Include memoized validator in dependencies
  ]);
};

export default useFlowAnalysis;
