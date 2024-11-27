// src/utils/shockAnalysisDebug.js

import { backgroundMonitor } from './backgroundMonitor';

export const DEBUG_SHOCK_ANALYSIS = {
  initializeDebugMonitor: (componentName) => {
    return backgroundMonitor.startMetric(`shock-analysis-${componentName}`);
  },

  log: (message, data) => {
    console.log('🔍 Shock Analysis Debug:', message, data);
  },

  monitorPropagationPatterns: (patterns, spatialCorrelation) => {
    const metric = backgroundMonitor.startMetric('propagation-analysis');
    
    try {
      const metrics = {
        totalPatterns: patterns?.length || 0,
        avgStrength: patterns?.reduce((sum, p) => sum + p.magnitude, 0) / (patterns?.length || 1),
        avgPropagationTime: patterns?.reduce((sum, p) => sum + (p.propagationTime || 0), 0) / (patterns?.length || 1),
        spatialCorrelation: spatialCorrelation || 0
      };

      console.log('Propagation Pattern Analysis');
      console.table({
        'Avg Pattern Strength': metrics.avgStrength.toFixed(3),
        'Avg Propagation Time (days)': metrics.avgPropagationTime.toFixed(2),
        'Avg Spatial Correlation': metrics.spatialCorrelation.toFixed(3),
        'Total Patterns': metrics.totalPatterns
      });

      metric.finish({ status: 'success', metrics });
    } catch (error) {
      console.error('Error monitoring propagation patterns:', error);
      metric.finish({ status: 'failed', error: error.message });
    }
  },

  monitorTimeControl: (timeRange, selectedDate) => {
    const metric = backgroundMonitor.startMetric('time-control-monitoring');
    
    try {
      if (!Array.isArray(timeRange) || !timeRange.length) {
        throw new Error('Invalid time range');
      }

      const state = {
        totalDates: timeRange.length,
        currentIndex: timeRange.indexOf(selectedDate),
        selectedDate,
        isValid: timeRange.includes(selectedDate),
        timeRange: {
          start: timeRange[0],
          end: timeRange[timeRange.length - 1]
        }
      };

      console.log('Time Control State:', state);
      metric.finish({ status: 'success', state });
      return state.isValid;
    } catch (error) {
      console.error('Error monitoring time control:', error);
      metric.finish({ status: 'failed', error: error.message });
      return false;
    }
  },

  validateColorScale: (scale, maxMagnitude) => {
    const metric = backgroundMonitor.startMetric('color-scale-validation');
    
    try {
      const steps = 5;
      const values = Array.from({ length: steps }, (_, i) => maxMagnitude * i / (steps - 1));
      
      console.log('Color Scale Validation');
      const validationResults = values.map(value => ({
        value,
        color: scale(value),
        isValid: true
      }));

      validationResults.forEach(result => {
        console.log(`${result.value.toFixed(2)}: ${result.color}`, '✓');
      });

      metric.finish({ status: 'success', validationResults });
    } catch (error) {
      console.error('Error validating color scale:', error);
      metric.finish({ status: 'failed', error: error.message });
    }
  }
};

export const debugShockAnalysis = (shocks, stats, patterns) => {
  const metric = backgroundMonitor.startMetric('shock-analysis-debug');
  
  try {
    console.log('Shock Analysis Hook Debug');
    console.table({
      totalPatterns: patterns?.propagationPatterns?.length || 0,
      avgPropagationTime: patterns?.propagationMetrics?.averagePropagationTime || 0,
      spatialCorrelation: patterns?.propagationMetrics?.spatialCorrelation || 0,
      propagationMetrics: patterns?.propagationMetrics || {}
    });

    if (shocks?.length) {
      const magnitudes = shocks.map(s => s.magnitude);
      console.log('Shock Magnitude Distribution:', {
        min: Math.min(...magnitudes),
        max: Math.max(...magnitudes),
        avg: magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length
      });
    }

    metric.finish({ status: 'success', metrics: stats });
  } catch (error) {
    console.error('Error in shock analysis debug:', error);
    metric.finish({ status: 'failed', error: error.message });
  }
};

export const monitorMapPerformance = (component) => {
  const startTime = performance.now();
  return () => {
    const duration = performance.now() - startTime;
    console.log(`${component} render duration: ${duration.toFixed(2)}ms`);
  };
};
