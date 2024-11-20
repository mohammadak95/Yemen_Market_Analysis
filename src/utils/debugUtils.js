// Debugging and analysis utilities

// ===== ReduxDebugWrapper.js =====

// src/utils/ReduxDebugWrapper.js

import React, { useEffect } from 'react';
import { useStore } from 'react-redux';
import PropTypes from 'prop-types';
import { backgroundMonitor } from './backgroundMonitor';
import { isValidRegressionData, DEFAULT_REGRESSION_DATA } from '../types/dataTypes';

const ReduxDebugWrapper = ({ children }) => {
  const store = useStore();

  useEffect(() => {
    console.group('Redux Debug Info');
    console.log('Initial State:', store.getState());
    console.log('Theme State:', store.getState().theme);
    console.groupEnd();

    const unsubscribe = store.subscribe(() => {
      console.group('Redux State Update');
      console.log('New State:', store.getState());
      console.log('Theme State:', store.getState().theme);
      console.log('Action:', store.getState().lastAction);
      console.groupEnd();
    });

    return () => {
      unsubscribe();
      console.log('Redux debug wrapper unmounted');
    };
  }, [store]);

  return <>{children}</>;
};
ReduxDebugWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

const AnalysisWrapper = ({ children }) => {
  return <>{children}</>; // Simply render children without additional wrappers or transitions
};

AnalysisWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export const setupReduxDebugger = (store) => {
  if (process.env.NODE_ENV !== 'production') {
    // Expose store to window for debugging
    window.__REDUX_STORE__ = store;
    
    // Setup enhanced logging
    window.debugSpatial = {
      enableDebug: () => {
        localStorage.setItem('DEBUG_SPATIAL', 'true');
        console.log('🔍 Spatial debugging enabled');
      },
      
      monitorRedux: () => {
        console.group('🔄 Redux Spatial Actions');
        const unsubscribe = store.subscribe(() => {
          const state = store.getState();
          console.log({
            action: state.lastAction,
            spatial: state.spatial,
            timestamp: new Date().toISOString()
          });
        });
        window.__REDUX_UNSUBSCRIBE__ = unsubscribe;
        console.log('Redux monitoring started. Call debugSpatial.stopMonitoring() to end.');
      },
      
      stopMonitoring: () => {
        if (window.__REDUX_UNSUBSCRIBE__) {
          window.__REDUX_UNSUBSCRIBE__();
          console.log('Redux monitoring stopped');
        }
        console.groupEnd();
      },
      
      monitorNetwork: () => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const [url] = args;
          console.log(`🌐 Fetch Request: ${url}`);
          const startTime = performance.now();
          try {
            const response = await originalFetch(...args);
            console.log(`✅ Fetch Complete: ${url} (${(performance.now() - startTime).toFixed(2)}ms)`);
            return response;
          } catch (error) {
            console.error(`❌ Fetch Error: ${url}`, error);
            throw error;
          }
        };
        console.log('Network monitoring enabled');
      },
      
      getCurrentState: () => {
        const state = store.getState();
        console.group('Current Redux State');
        console.log('Full State:', state);
        console.log('Spatial State:', state.spatial);
        console.groupEnd();
        return state;
      },
      
      getSpatialData: () => {
        const { spatial } = store.getState();
        return {
          features: spatial.geoData?.features?.length || 0,
          flowMaps: spatial.flowMaps?.length || 0,
          uniqueMonths: spatial.uniqueMonths?.length || 0,
          status: spatial.status,
          error: spatial.error
        };
      }
    };
    
    console.log(`
    🔧 Debug tools available:
    - debugSpatial.enableDebug()     // Enable verbose logging
    - debugSpatial.monitorRedux()    // Start Redux monitoring
    - debugSpatial.stopMonitoring()  // Stop Redux monitoring
    - debugSpatial.monitorNetwork()  // Monitor network requests
    - debugSpatial.getCurrentState() // Get current Redux state
    - debugSpatial.getSpatialData()  // Get spatial data summary
    `);
  }
};

export const debugUtils = {
  isEnabled: () => process.env.NODE_ENV === 'development',
  
  log: (message, data = {}) => {
    if (debugUtils.isEnabled()) {
      console.group(`[Spatial Debug] ${message}`);
      console.log(data);
      console.groupEnd();
    }
  },

  logTransformation: (data, type) => {
    if (debugUtils.isEnabled()) {
      console.group(`Precomputed Data Transformation: ${type}`);
      console.log('Input:', data);
      console.timeEnd('transformation');
      console.groupEnd();
    }
  },

  logError: (error, context = {}) => {
    if (debugUtils.isEnabled()) {
      console.group('[Spatial Error]');
      console.error(error);
      console.log('Context:', context);
      console.groupEnd();
    }
  }
};

export const debugPrecomputedData = {
  logTransformation: (data, type) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`Precomputed Data Transformation: ${type}`);
      console.log('Input:', data);
      console.timeEnd('transformation');
      console.groupEnd();
    }
  }
};

class RegressionDebugUtils {
  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
    this.logStack = [];
    this.MAX_LOG_SIZE = 100;
  }

  // Initialize debugging tools
  initDebugTools() {
    if (!this.debugMode) return;

    // Expose debug utilities to window for console access
    window.__REGRESSION_DEBUG__ = {
      inspectData: this.inspectRegressionData.bind(this),
      validateData: this.validateRegressionData.bind(this),
      getLogs: () => this.logStack,
      clearLogs: () => this.clearLogs(),
      testDataLoad: this.testDataLoad.bind(this),
      monitorRegression: this.monitorRegression.bind(this)
    };

    console.log(`
      🔍 Regression Debug Tools Available:
      - window.__REGRESSION_DEBUG__.inspectData(data)
      - window.__REGRESSION_DEBUG__.validateData(data)
      - window.__REGRESSION_DEBUG__.getLogs()
      - window.__REGRESSION_DEBUG__.clearLogs()
      - window.__REGRESSION_DEBUG__.testDataLoad(commodity)
      - window.__REGRESSION_DEBUG__.monitorRegression()
    `);
  }

  // Log with timestamp and category
  log(category, message, data = null) {
    if (!this.debugMode) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data
    };

    console.log(`[${category}] ${message}`, data || '');
    
    this.logStack.push(logEntry);
    if (this.logStack.length > this.MAX_LOG_SIZE) {
      this.logStack.shift();
    }

    // Log to background monitor for persistence
    backgroundMonitor.logMetric('regression-debug', logEntry);
  }

  clearLogs() {
    this.logStack = [];
    this.log('System', 'Logs cleared');
  }

  // Detailed regression data inspection
  inspectRegressionData(data) {
    if (!data) {
      this.log('Inspection', 'No data provided');
      return null;
    }

    const inspection = {
      hasRequiredSections: {
        model: Boolean(data.model),
        spatial: Boolean(data.spatial),
        residuals: Boolean(data.residuals)
      },
      modelMetrics: data.model ? {
        hasCoefficients: Boolean(data.model.coefficients),
        coefficientCount: Object.keys(data.model.coefficients || {}).length,
        hasValidRSquared: typeof data.model.r_squared === 'number',
        hasValidObservations: typeof data.model.observations === 'number'
      } : null,
      spatialMetrics: data.spatial ? {
        hasMoranI: Boolean(data.spatial.moran_i),
        hasValidVIF: Array.isArray(data.spatial.vif),
        vifCount: (data.spatial.vif || []).length
      } : null,
      residualMetrics: data.residuals ? {
        rawCount: (data.residuals.raw || []).length,
        regionCount: Object.keys(data.residuals.byRegion || {}).length,
        hasValidStats: Boolean(data.residuals.stats)
      } : null,
      comparisonWithDefault: this.compareWithDefault(data)
    };

    this.log('Inspection', 'Data inspection complete', inspection);
    return inspection;
  }

  // Compare with default data structure
  compareWithDefault(data) {
    const missingKeys = [];
    const unexpectedKeys = [];
    const traverseObject = (actual, expected, path = '') => {
      // Check for missing keys
      Object.keys(expected).forEach(key => {
        if (!(key in actual)) {
          missingKeys.push(path ? `${path}.${key}` : key);
        }
      });

      // Check for unexpected keys
      Object.keys(actual).forEach(key => {
        if (!(key in expected)) {
          unexpectedKeys.push(path ? `${path}.${key}` : key);
        }
      });

      // Recurse into nested objects
      Object.keys(expected).forEach(key => {
        if (typeof expected[key] === 'object' && expected[key] !== null &&
            typeof actual[key] === 'object' && actual[key] !== null) {
          traverseObject(actual[key], expected[key], path ? `${path}.${key}` : key);
        }
      });
    };

    traverseObject(data, DEFAULT_REGRESSION_DATA);

    return {
      missingKeys,
      unexpectedKeys,
      structureMatch: missingKeys.length === 0 && unexpectedKeys.length === 0
    };
  }

  // Validate regression data structure
  validateRegressionData(data) {
    const validationResult = {
      isValid: isValidRegressionData(data),
      validationSteps: []
    };

    // Basic structure check
    validationResult.validationSteps.push({
      step: 'Basic Structure',
      passed: Boolean(data && data.model && data.spatial && data.residuals),
      details: 'Checking presence of main sections'
    });

    // Model validation
    if (data?.model) {
      validationResult.validationSteps.push({
        step: 'Model Validation',
        passed: (
          typeof data.model.r_squared === 'number' &&
          typeof data.model.adj_r_squared === 'number' &&
          typeof data.model.mse === 'number' &&
          typeof data.model.observations === 'number'
        ),
        details: 'Checking model metrics types and presence'
      });
    }

    // Spatial validation
    if (data?.spatial) {
      validationResult.validationSteps.push({
        step: 'Spatial Validation',
        passed: (
          data.spatial.moran_i &&
          typeof data.spatial.moran_i.I === 'number' &&
          Array.isArray(data.spatial.vif)
        ),
        details: 'Checking spatial statistics structure'
      });
    }

    // Residuals validation
    if (data?.residuals) {
      validationResult.validationSteps.push({
        step: 'Residuals Validation',
        passed: (
          Array.isArray(data.residuals.raw) &&
          typeof data.residuals.byRegion === 'object' &&
          typeof data.residuals.stats === 'object'
        ),
        details: 'Checking residuals data structure'
      });
    }

    this.log('Validation', 
      validationResult.isValid ? 'Validation passed' : 'Validation failed',
      validationResult
    );

    return validationResult;
  }

  // Test data loading process
  async testDataLoad(commodity) {
    this.log('Test', `Starting test data load for commodity: ${commodity}`);
    const metric = backgroundMonitor.startMetric('regression-test-load');

    try {
      // Test path resolution
      const path = getRegressionDataPath();
      this.log('Test', 'Path resolved', { path });

      // Test data fetching
      const response = await fetch(path);
      this.log('Test', 'Fetch response received', { 
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers)
      });

      // Test data parsing
      const text = await response.text();
      this.log('Test', 'Response text received', { 
        length: text.length,
        preview: text.substring(0, 100) + '...'
      });

      const data = JSON.parse(text);
      this.log('Test', 'JSON parsing successful', { 
        entries: data.length,
        keys: Object.keys(data[0] || {})
      });

      // Test commodity filtering
      const normalizedCommodity = normalizeCommodityName(commodity);
      const commodityData = data.find(
        item => normalizeCommodityName(item.commodity) === normalizedCommodity
      );
      this.log('Test', 'Commodity filtering result', { 
        found: Boolean(commodityData),
        normalizedName: normalizedCommodity
      });

      // Test data processing
      const processed = processRegressionData(commodityData);
      this.log('Test', 'Data processing complete', this.inspectRegressionData(processed));

      metric.finish({ status: 'success' });
      return processed;

    } catch (error) {
      this.log('Test', 'Test failed', { error: error.message, stack: error.stack });
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  // Monitor regression data updates
  monitorRegression() {
    let previousData = null;

    return (data) => {
      if (!data) {
        this.log('Monitor', 'No data to monitor');
        return;
      }

      const changes = this.detectChanges(previousData, data);
      if (changes.hasChanges) {
        this.log('Monitor', 'Regression data changed', changes);
      }

      previousData = JSON.parse(JSON.stringify(data)); // Deep clone
    };
  }

  // Detect changes between old and new data
  detectChanges(oldData, newData) {
    if (!oldData) return { hasChanges: true, changes: 'Initial data' };

    const changes = {
      hasChanges: false,
      modelChanges: {},
      spatialChanges: {},
      residualChanges: {}
    };

    // Check model changes
    if (oldData.model?.r_squared !== newData.model?.r_squared) {
      changes.hasChanges = true;
      changes.modelChanges.r_squared = {
        old: oldData.model?.r_squared,
        new: newData.model?.r_squared
      };
    }

    // Check spatial changes
    if (oldData.spatial?.moran_i?.I !== newData.spatial?.moran_i?.I) {
      changes.hasChanges = true;
      changes.spatialChanges.moran_i = {
        old: oldData.spatial?.moran_i?.I,
        new: newData.spatial?.moran_i?.I
      };
    }

    // Check residuals
    if (oldData.residuals?.raw?.length !== newData.residuals?.raw?.length) {
      changes.hasChanges = true;
      changes.residualChanges.count = {
        old: oldData.residuals?.raw?.length,
        new: newData.residuals?.raw?.length
      };
    }

    return changes;
  }
}

export const regressionDebug = new RegressionDebugUtils();

export default {
  debugUtils,
  debugPrecomputedData,
  setupReduxDebugger
};

// Initialize if in development
if (process.env.NODE_ENV === 'development') {
  regressionDebug.initDebugTools();
}