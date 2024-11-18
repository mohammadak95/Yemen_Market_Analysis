// src/store/store.js

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import { monitoringSystem } from '../utils/MonitoringSystem';

// Import reducers
import analysisReducer from '../slices/analysisSlice';
import commoditiesReducer from '../slices/commoditiesSlice';
import ecmReducer from '../slices/ecmSlice';
import geometriesReducer from '../slices/geometriesSlice';
import marketsReducer from '../slices/marketsSlice';
import priceDiffReducer from '../slices/priceDiffSlice';
import spatialReducer from '../slices/spatialSlice';
import themeReducer from '../slices/themeSlice';
import tvmiiReducer from '../slices/tvmiiSlice';

// Enable Immer support for Map and Set
enableMapSet();

/**
 * Performance thresholds for monitoring
 */
const PERFORMANCE_THRESHOLDS = {
  ACTION_DURATION: 16, // ms
  STATE_SIZE: 1024 * 1024, // 1MB
  BATCH_SIZE: 100,
  CLEANUP_INTERVAL: 60000 // 1 minute
};

/**
 * State validation configuration
 */
const STATE_VALIDATION = {
  requiredKeys: ['commodities', 'spatial', 'analysis'],
  requiredSubKeys: {
    spatial: ['ui', 'data', 'status', 'validation'],
    commodities: ['commodities', 'status', 'error']
  }
};

/**
 * Enhanced state validation with deep checking
 */
const validateState = (state) => {
  const validationErrors = [];

  // Check required top-level keys
  STATE_VALIDATION.requiredKeys.forEach(key => {
    if (!(key in state)) {
      validationErrors.push(`Missing required state key: ${key}`);
    }
  });

  // Check required sub-keys
  Object.entries(STATE_VALIDATION.requiredSubKeys).forEach(([key, subKeys]) => {
    if (state[key]) {
      subKeys.forEach(subKey => {
        if (!(subKey in state[key])) {
          validationErrors.push(`Missing required sub-key ${subKey} in ${key}`);
        }
      });
    }
  });

  if (validationErrors.length > 0) {
    throw new Error(`State validation failed:\n${validationErrors.join('\n')}`);
  }

  return state;
};

/**
 * Enhanced monitoring middleware with batching and throttling
 */
const createMonitorMiddleware = () => {
  let pendingActions = [];
  let isProcessing = false;
  let batchTimeout = null;

  const processBatch = async (store) => {
    if (isProcessing || pendingActions.length === 0) return;

    isProcessing = true;
    const batch = pendingActions.splice(0, PERFORMANCE_THRESHOLDS.BATCH_SIZE);
    const batchMetric = monitoringSystem.startMetric('redux-batch-processing');

    try {
      for (const { action } of batch) {
        const startTime = performance.now();
        const duration = performance.now() - startTime;

        // Performance monitoring
        const state = store.getState();
        const stateSize = new TextEncoder().encode(JSON.stringify(state)).length;

        if (duration > PERFORMANCE_THRESHOLDS.ACTION_DURATION || 
            stateSize > PERFORMANCE_THRESHOLDS.STATE_SIZE) {
          monitoringSystem.warn('Performance threshold exceeded:', {
            action: action.type,
            duration,
            stateSize,
            timestamp: new Date().toISOString()
          });
        }
      }

      batchMetric.finish({ status: 'success', batchSize: batch.length });
    } catch (error) {
      batchMetric.finish({ status: 'error', error: error.message });
      throw error;
    } finally {
      isProcessing = false;
      if (pendingActions.length > 0) {
        batchTimeout = setTimeout(() => processBatch(store), 0);
      }
    }
  };

  return store => next => action => {
    if (process.env.NODE_ENV === 'development') {
      monitoringSystem.log('Redux Action:', {
        type: action.type,
        payload: action.payload
      });
    }

    pendingActions.push({ action, next });

    if (!batchTimeout) {
      batchTimeout = setTimeout(() => processBatch(store), 0);
    }

    return next(action);
  };
};

/**
 * Enhanced error handling middleware
 */
const errorHandlingMiddleware = store => next => action => {
  try {
    return next(action);
  } catch (error) {
    const errorDetails = {
      action: action.type,
      payload: action.payload,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      state: store.getState()
    };

    monitoringSystem.error('Redux error:', errorDetails);

    store.dispatch({
      type: 'app/error',
      payload: {
        source: 'redux',
        ...errorDetails
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.error('Redux Error:', errorDetails);
    }

    throw error;
  }
};

/**
 * Initial state with safe defaults
 */
const createInitialState = () => ({
  commodities: {
    commodities: [],
    status: 'idle',
    error: null
  },
  spatial: {
    ui: {
      selectedCommodity: null,
      selectedDate: null,
      selectedRegion: null,
      selectedAnalysis: null,
      selectedRegimes: [],
      visualizationMode: 'prices',
      filters: {
        showConflict: true,
        showSeasonality: true,
        flowThreshold: 0.1,
      }
    },
    data: null,
    status: {
      loading: false,
      error: null,
      isInitialized: false,
      lastUpdated: null
    },
    validation: {
      warnings: [],
      qualityMetrics: {},
      coverage: {},
      spatialDiagnostics: null
    }
  },
  analysis: {
    status: 'idle',
    error: null,
    data: null
  }
});

/**
 * Configure store with enhanced options and middleware
 */
const configureAppStore = (preloadedState = {}) => {
  const validatedState = validateState({
    ...createInitialState(),
    ...preloadedState
  });

  const store = configureStore({
    reducer: {
      commodities: commoditiesReducer,
      spatial: spatialReducer,
      analysis: analysisReducer,
      ecm: ecmReducer,
      geometries: geometriesReducer,
      markets: marketsReducer,
      priceDiff: priceDiffReducer,
      theme: themeReducer,
      tvmii: tvmiiReducer
    },
    preloadedState: validatedState,
    middleware: (getDefaultMiddleware) => {
      const middlewares = getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'spatial/loadSpatialData/fulfilled',
            'commodities/fetchData/fulfilled',
            'spatial/loadSpatialData/rejected',
            'markets/fetchData/fulfilled',
            'commodities/fetchData/pending',
            'commodities/fetchData/rejected'
          ],
          ignoredPaths: [
            'spatial.data.geometries',
            'spatial.data.cached',
            'markets.data.geoJson'
          ]
        },
        immutableCheck: {
          warnAfter: 100
        },
        thunk: {
          extraArgument: {
            monitoringSystem
          }
        }
      });

      middlewares.push(createMonitorMiddleware());
      middlewares.push(errorHandlingMiddleware);

      return middlewares;
    },
    devTools: process.env.NODE_ENV === 'development' ? {
      name: 'Yemen Market Analysis',
      trace: true,
      traceLimit: 25
    } : false
  });

  // Development tooling
  if (process.env.NODE_ENV === 'development') {
    if (module.hot) {
      module.hot.accept([
        '../slices/analysisSlice',
        '../slices/commoditiesSlice',
        '../slices/ecmSlice',
        '../slices/geometriesSlice',
        '../slices/marketsSlice',
        '../slices/priceDiffSlice',
        '../slices/spatialSlice',
        '../slices/themeSlice',
        '../slices/tvmiiSlice'
      ], () => {
        store.replaceReducer(
          combineReducers({
            analysis: require('../slices/analysisSlice').default,
            commodities: require('../slices/commoditiesSlice').default,
            ecm: require('../slices/ecmSlice').default,
            geometries: require('../slices/geometriesSlice').default,
            markets: require('../slices/marketsSlice').default,
            priceDiff: require('../slices/priceDiffSlice').default,
            spatial: require('../slices/spatialSlice').default,
            theme: require('../slices/themeSlice').default,
            tvmii: require('../slices/tvmiiSlice').default
          })
        );
      });
    }

    window.store = store;
  }

  return store;
};

// Create and export the store instance
export const store = configureAppStore();

export { configureAppStore };
export default store;