// src/utils/shockAnalysisDebug.js

import { backgroundMonitor } from './backgroundMonitor';
import { validateNumber, calculateSafeMean } from './numberValidation';
import { getFeatureStyle } from '../components/analysis/spatial-analysis/utils/shockMapUtils';

/**
 * Debug utilities for shock analysis
 */
export const DEBUG_SHOCK_ANALYSIS = {
  /**
   * Initialize debug monitoring for a component
   * @param {string} component - Component name
   * @returns {Object} Monitor object with finish method
   */
  initializeDebugMonitor: (component) => {
    const monitorId = `${component}-${Date.now()}`;
    console.group(`🔍 Shock Analysis Debug: ${component}`);
    
    const startTime = performance.now();
    const metric = backgroundMonitor.startMetric(`shock-analysis-${component}`, { monitorId });

    return {
      finish: () => {
        const duration = performance.now() - startTime;
        console.log(`${component} render duration: ${duration.toFixed(2)}ms`);
        console.groupEnd();
        metric.finish({
          duration,
          component
        });
      }
    };
  },

  /**
   * Validate shock data structure and content
   * @param {Array} shocks - Array of shock objects
   * @returns {boolean} Validation result
   */
  validateShockData: (shocks) => {
    const metric = backgroundMonitor.startMetric('shock-data-validation');

    try {
      if (!Array.isArray(shocks)) {
        throw new Error('Invalid shock data structure: not an array');
      }

      const requiredFields = ['region', 'date', 'magnitude', 'shock_type', 'direction'];
      const validations = {
        totalShocks: shocks.length,
        validShocks: 0,
        invalidShocks: []
      };

      shocks.forEach((shock, index) => {
        const missingFields = requiredFields.filter(field => !shock?.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          validations.invalidShocks.push({
            index,
            missingFields,
            shock
          });
        } else {
          // Validate field types and values
          const isValid = (
            typeof shock.region === 'string' &&
            validateNumber(shock.magnitude, null, { allowNegative: false }) !== null &&
            !isNaN(new Date(shock.date).getTime())
          );

          if (isValid) {
            validations.validShocks++;
          } else {
            validations.invalidShocks.push({
              index,
              reason: 'Invalid field values',
              shock
            });
          }
        }
      });

      console.group('Shock Data Validation');
      console.log('Validation Results:', {
        totalShocks: validations.totalShocks,
        validShocks: validations.validShocks,
        invalidCount: validations.invalidShocks.length,
        passRate: `${((validations.validShocks / validations.totalShocks) * 100).toFixed(1)}%`
      });

      if (validations.invalidShocks.length > 0) {
        console.warn('Invalid Shocks:', validations.invalidShocks);
      }

      console.groupEnd();

      metric.finish({
        status: 'success',
        validationResults: validations
      });

      return validations.invalidShocks.length === 0;

    } catch (error) {
      console.error('Error during shock data validation:', error);
      metric.finish({ status: 'failed', error: error.message });
      return false;
    }
  },

  /**
   * Monitor propagation pattern analysis
   * @param {Array} patterns - Array of propagation patterns
   * @returns {Object} Analysis metrics
   */
  monitorPropagationPatterns: (patterns) => {
    const metric = backgroundMonitor.startMetric('propagation-analysis');

    try {
      if (!Array.isArray(patterns)) {
        throw new Error('Invalid patterns data structure');
      }

      const metrics = {
        totalPatterns: patterns.length,
        averagePropagationTime: calculateSafeMean(
          patterns.map(p => validateNumber(p.propagationTime))
        ),
        spatialCorrelations: patterns.map(p => validateNumber(p.spatialWeight)),
        propagationDistribution: {},
        averageStrength: calculateSafeMean(
          patterns.map(p => validateNumber(p.strengthIndex))
        )
      };

      // Calculate propagation time distribution
      patterns.forEach(pattern => {
        const timeRange = Math.floor(pattern.propagationTime);
        metrics.propagationDistribution[timeRange] = 
          (metrics.propagationDistribution[timeRange] || 0) + 1;
      });

      console.group('Propagation Pattern Analysis');
      console.table({
        'Total Patterns': metrics.totalPatterns,
        'Avg Propagation Time (days)': metrics.averagePropagationTime.toFixed(2),
        'Avg Spatial Correlation': calculateSafeMean(metrics.spatialCorrelations).toFixed(3),
        'Avg Pattern Strength': metrics.averageStrength.toFixed(3)
      });

      if (metrics.totalPatterns > 0) {
        console.log('Propagation Time Distribution:', metrics.propagationDistribution);
      }

      console.groupEnd();

      metric.finish({
        status: 'success',
        metrics
      });

      return metrics;

    } catch (error) {
      console.error('Error during propagation analysis:', error);
      metric.finish({ status: 'failed', error: error.message });
      return {
        totalPatterns: 0,
        averagePropagationTime: 0,
        spatialCorrelations: [],
        propagationDistribution: {},
        averageStrength: 0
      };
    }
  },

  /**
   * Validate color scale generation
   * @param {Function} scale - Color scale function
   * @param {number} magnitude - Maximum magnitude
   * @returns {boolean} Validation result
   */
  validateColorScale: (scale, magnitude) => {
    const metric = backgroundMonitor.startMetric('color-scale-validation');

    try {
      if (typeof scale !== 'function') {
        throw new Error('Invalid color scale: not a function');
      }

      magnitude = validateNumber(magnitude, 1, { allowNegative: false });
      const testPoints = [0, magnitude / 4, magnitude / 2, magnitude * 0.75, magnitude];
      
      const validations = testPoints.map(value => {
        const color = scale(value);
        return {
          value,
          color,
          isValid: typeof color === 'string' && /^#|rgb|hsl/.test(color)
        };
      });

      console.group('Color Scale Validation');
      validations.forEach(({ value, color, isValid }) => {
        console.log(
          `${value.toFixed(2)}: ${color}`,
          isValid ? '✓' : '❌'
        );
      });
      console.groupEnd();

      metric.finish({
        status: 'success',
        validationResults: validations
      });

      return validations.every(v => v.isValid);

    } catch (error) {
      console.error('Error validating color scale:', error);
      metric.finish({ status: 'failed', error: error.message });
      return false;
    }
  },

  /**
   * Monitor time control state
   * @param {Array} timeRange - Array of dates
   * @param {string} selectedDate - Currently selected date
   * @returns {boolean} Validation result
   */
  monitorTimeControl: (timeRange, selectedDate) => {
    const metric = backgroundMonitor.startMetric('time-control-monitoring');

    try {
      if (!Array.isArray(timeRange) || !selectedDate) {
        throw new Error('Invalid time control parameters');
      }

      const currentIndex = timeRange.indexOf(selectedDate);
      const state = {
        totalDates: timeRange.length,
        currentIndex,
        selectedDate,
        isValid: currentIndex !== -1,
        timeRange: {
          start: timeRange[0],
          end: timeRange[timeRange.length - 1]
        }
      };

      console.log('Time Control State:', state);

      metric.finish({
        status: 'success',
        state
      });

      return state.isValid;

    } catch (error) {
      console.error('Error monitoring time control:', error);
      metric.finish({ status: 'failed', error: error.message });
      return false;
    }
  }
};

/**
 * Debug wrapper for shock analysis hook
 */
export const debugShockAnalysis = (shocks, shockStats, propagationPatterns) => {
  const metric = backgroundMonitor.startMetric('shock-analysis-debug');

  try {
    const metrics = {
      totalShocks: validateNumber(shocks?.length),
      maxMagnitude: validateNumber(shockStats?.maxMagnitude),
      avgMagnitude: validateNumber(shockStats?.avgMagnitude),
      propagationMetrics: {
        totalPatterns: validateNumber(propagationPatterns?.propagationPatterns?.length),
        avgPropagationTime: validateNumber(propagationPatterns?.propagationMetrics?.averagePropagationTime),
        spatialCorrelation: validateNumber(propagationPatterns?.propagationMetrics?.spatialCorrelation)
      }
    };

    console.group('Shock Analysis Hook Debug');
    console.table(metrics);
    
    if (metrics.totalShocks > 0) {
      console.log('Shock Magnitude Distribution:', {
        min: Math.min(...shocks.map(s => s.magnitude)),
        max: metrics.maxMagnitude,
        avg: metrics.avgMagnitude
      });
    }

    console.groupEnd();

    metric.finish({
      status: 'success',
      metrics
    });

    return metrics;

  } catch (error) {
    console.error('Error in shock analysis debug:', error);
    metric.finish({ status: 'failed', error: error.message });
    return {
      totalShocks: 0,
      maxMagnitude: 0,
      avgMagnitude: 0,
      propagationMetrics: {
        totalPatterns: 0,
        avgPropagationTime: 0,
        spatialCorrelation: 0
      }
    };
  }
};

/**
 * Monitor map rendering performance
 */
export const monitorMapPerformance = (feature, magnitude) => {
  const metric = backgroundMonitor.startMetric('map-style-calculation');
  const start = performance.now();

  try {
    const style = getFeatureStyle(magnitude);
    const duration = performance.now() - start;

    if (duration > 5) {
      console.warn('Slow style calculation:', {
        feature: feature.properties.region_id,
        duration: `${duration.toFixed(2)}ms`
      });
    }

    metric.finish({
      status: 'success',
      duration,
      feature: feature.properties.region_id
    });

    return style;

  } catch (error) {
    console.error('Error calculating map style:', error);
    metric.finish({ status: 'failed', error: error.message });
    return getFeatureStyle(0); // Fallback style
  }
};

/**
 * Validate feature data for tooltips
 */
export const validateTooltipData = (feature, regionShocks) => {
  const metric = backgroundMonitor.startMetric('tooltip-validation');

  try {
    // Basic structure validation
    const validation = {
      hasValidFeature: !!feature?.type && feature.type === 'Feature',
      hasProperties: !!feature?.properties,
      hasRegionId: !!feature?.properties?.region_id,
      hasValidShocks: Array.isArray(regionShocks),
      hasValidGeometry: !!feature?.geometry?.type,
      shockCount: validateNumber(regionShocks?.length)
    };

    // Extended shock data validation if shocks exist
    if (validation.hasValidShocks && regionShocks.length > 0) {
      const shockValidation = validateShockMetrics(regionShocks);
      Object.assign(validation, {
        hasValidMagnitudes: shockValidation.validMagnitudes,
        hasValidDates: shockValidation.validDates,
        shockMetrics: shockValidation.metrics
      });
    }

    // Log validation results in development
    if (process.env.NODE_ENV === 'development') {
      console.group('Tooltip Data Validation');
      console.table(validation);
      if (validation.shockMetrics) {
        console.log('Shock Metrics:', validation.shockMetrics);
      }
      console.groupEnd();
    }

    // Track validation results
    const isValid = Object.entries(validation)
      .filter(([key]) => !key.startsWith('shock'))
      .every(([_, value]) => Boolean(value));

    if (!isValid) {
      console.warn('Invalid tooltip data:', validation);
    }

    metric.finish({
      status: isValid ? 'success' : 'failed',
      validation
    });

    return {
      isValid,
      validation,
      processedData: isValid ? processTooltipData(feature, regionShocks) : null
    };

  } catch (error) {
    console.error('Error validating tooltip data:', error);
    backgroundMonitor.logError('tooltip-validation', {
      error: error.message,
      feature: feature?.properties?.region_id
    });
    
    metric.finish({ 
      status: 'failed', 
      error: error.message 
    });
    
    return {
      isValid: false,
      validation: null,
      processedData: null,
      error: error.message
    };
  }
};

/**
 * Validate shock metrics for tooltip display
 * @param {Array} shocks - Array of shocks
 * @returns {Object} Validation results and metrics
 */
const validateShockMetrics = (shocks) => {
  try {
    const magnitudes = shocks
      .map(shock => shock.magnitude)
      .filter(mag => typeof mag === 'number' && !isNaN(mag));

    const dates = shocks
      .map(shock => new Date(shock.date))
      .filter(date => !isNaN(date.getTime()));

    const metrics = {
      totalShocks: shocks.length,
      validMagnitudes: magnitudes.length,
      validDates: dates.length,
      avgMagnitude: calculateSafeMean(magnitudes),
      latestShock: dates.length > 0 ? 
        new Date(Math.max(...dates.map(d => d.getTime()))) : null,
      shockTypes: countShockTypes(shocks)
    };

    return {
      validMagnitudes: magnitudes.length === shocks.length,
      validDates: dates.length === shocks.length,
      metrics
    };

  } catch (error) {
    console.error('Error validating shock metrics:', error);
    return {
      validMagnitudes: false,
      validDates: false,
      metrics: {
        totalShocks: 0,
        validMagnitudes: 0,
        validDates: 0,
        avgMagnitude: 0,
        latestShock: null,
        shockTypes: {}
      }
    };
  }
};

/**
 * Count shock types for summary
 * @param {Array} shocks - Array of shocks
 * @returns {Object} Shock type counts
 */
const countShockTypes = (shocks) => {
  const counts = {};
  shocks.forEach(shock => {
    if (shock.shock_type) {
      counts[shock.shock_type] = (counts[shock.shock_type] || 0) + 1;
    }
  });
  return counts;
};

/**
 * Process tooltip data for display
 * @param {Object} feature - GeoJSON feature
 * @param {Array} regionShocks - Array of shocks
 * @returns {Object} Processed tooltip data
 */
const processTooltipData = (feature, regionShocks) => {
  try {
    const totalMagnitude = regionShocks.reduce(
      (sum, shock) => sum + validateNumber(shock.magnitude, 0),
      0
    );

    const latestShock = regionShocks.reduce((latest, shock) => {
      if (!latest || new Date(shock.date) > new Date(latest.date)) {
        return shock;
      }
      return latest;
    }, null);

    return {
      regionId: feature.properties.region_id,
      originalName: feature.properties.originalName || feature.properties.name,
      shockCount: regionShocks.length,
      avgMagnitude: totalMagnitude / regionShocks.length || 0,
      totalImpact: totalMagnitude,
      latestShock: latestShock ? {
        date: new Date(latestShock.date),
        type: latestShock.shock_type,
        magnitude: latestShock.magnitude
      } : null,
      shockTypes: countShockTypes(regionShocks)
    };

  } catch (error) {
    console.error('Error processing tooltip data:', error);
    return null;
  }
};
