// src/store/store.js

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import { monitoringSystem } from '../utils/MonitoringSystem';

// Import reducers individually
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

// Add a flag to prevent recursive monitoring
let isMonitoring = false;

/**
 * Validates the Redux state structure
 * @param {Object} state - The Redux state to validate
 * @returns {Object} - The validated state
 * @throws {Error} - If validation fails
 */
const validateState = (state) => {
  const requiredKeys = ['commodities', 'spatial', 'analysis'];
  const missingKeys = requiredKeys.filter(key => !(key in state));
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required state keys: ${missingKeys.join(', ')}`);
  }
  
  return state;
};

/**
 * Monitoring middleware for Redux actions
 */
const monitorMiddleware = (store) => (next) => (action) => {
  if (isMonitoring) return next(action);

  let metric;
  const startTime = performance.now();
  
  try {
    isMonitoring = true;
    metric = monitoringSystem.startMetric(`redux-action-${action.type}`);
    
    if (process.env.NODE_ENV === 'development') {
      monitoringSystem.log('Redux Action:', {
        type: action.type,
        payload: action.payload,
        state: store.getState()
      });
    }
    
    const result = next(action);
    
    const duration = performance.now() - startTime;
    const state = store.getState();
    const stateSize = new TextEncoder().encode(
      JSON.stringify(state)
    ).length;

    if (duration > 16 || stateSize > 1000000) { // 1MB
      monitoringSystem.warn('Performance warning:', {
        type: action.type,
        duration,
        stateSize,
        timestamp: new Date().toISOString()
      });
    }

    metric?.finish({ 
      status: 'success', 
      duration, 
      stateSize,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    metric?.finish({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
    monitoringSystem.error(`Error in Redux action ${action.type}:`, error);
    throw error;
  } finally {
    isMonitoring = false;
  }
};

/**
 * Error handling middleware for Redux actions
 */
const errorHandlingMiddleware = (store) => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    monitoringSystem.error('Redux error:', {
      action: action.type,
      payload: action.payload,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Dispatch error action
    store.dispatch({
      type: 'app/error',
      payload: {
        source: 'redux',
        error: error.message,
        action: action.type,
        timestamp: new Date().toISOString()
      }
    });
    
    throw error;
  }
};

/**
 * Initial safe state for the Redux store
 */
const safeInitialState = {
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
};

/**
 * Configure the Redux store with all middleware and options
 */
const configureAppStore = (preloadedState = {}) => {
  // Validate initial state
  const validatedState = validateState({
    ...safeInitialState,
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
        immutableCheck: true,
        thunk: {
          extraArgument: {
            monitoringSystem,
          }
        }
      });

      if (process.env.NODE_ENV === 'development') {
        middlewares.push(monitorMiddleware);
      }
      
      middlewares.push(errorHandlingMiddleware);
      
      return middlewares;
    },
    devTools: {
      name: 'Yemen Market Analysis',
      trace: process.env.NODE_ENV === 'development',
      traceLimit: 25,
      features: {
        pause: true,
        lock: true,
        persist: true,
        export: true,
        import: 'custom',
        jump: true,
        skip: true,
        reorder: true,
        dispatch: true,
        test: true
      }
    }
  });

  // Add hot reloading support in development
  if (process.env.NODE_ENV === 'development') {
    if (module.hot) {
      module.hot.accept(
        [
          '../slices/analysisSlice',
          '../slices/commoditiesSlice',
          '../slices/ecmSlice',
          '../slices/geometriesSlice',
          '../slices/marketsSlice',
          '../slices/priceDiffSlice',
          '../slices/spatialSlice',
          '../slices/themeSlice',
          '../slices/tvmiiSlice'
        ], 
        () => {
          // Re-import all reducers
          const newAnalysisReducer = require('../slices/analysisSlice').default;
          const newCommoditiesReducer = require('../slices/commoditiesSlice').default;
          const newEcmReducer = require('../slices/ecmSlice').default;
          const newGeometriesReducer = require('../slices/geometriesSlice').default;
          const newMarketsReducer = require('../slices/marketsSlice').default;
          const newPriceDiffReducer = require('../slices/priceDiffSlice').default;
          const newSpatialReducer = require('../slices/spatialSlice').default;
          const newThemeReducer = require('../slices/themeSlice').default;
          const newTvmiiReducer = require('../slices/tvmiiSlice').default;

          // Replace the reducers
          store.replaceReducer(
            combineReducers({
              analysis: newAnalysisReducer,
              commodities: newCommoditiesReducer,
              ecm: newEcmReducer,
              geometries: newGeometriesReducer,
              markets: newMarketsReducer,
              priceDiff: newPriceDiffReducer,
              spatial: newSpatialReducer,
              theme: newThemeReducer,
              tvmii: newTvmiiReducer
            })
          );
        }
      );
    }
    
    // Add store to window for debugging
    window.store = store;
  }

  return store;
};

// Create and export the store instance
export const store = configureAppStore();

// Export the store creator for testing
export { configureAppStore };

export default store;