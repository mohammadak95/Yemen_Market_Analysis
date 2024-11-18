// src/store/store.js

import { configureStore } from '@reduxjs/toolkit';
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

const PERFORMANCE_THRESHOLDS = {
  ACTION_DURATION: 16, // ms
  STATE_SIZE: 1024 * 1024, // 1MB
  BATCH_SIZE: 100
};

// Define initial state
const initialState = {
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

// Create monitoring middleware
const createMonitorMiddleware = () => {
  return store => next => action => {
    const startTime = performance.now();

    try {
      // Process the action
      const result = next(action);
      const duration = performance.now() - startTime;

      // Log performance metrics
      if (process.env.NODE_ENV === 'development') {
        monitoringSystem.log('Redux Action:', {
          type: action.type,
          duration,
          timestamp: new Date().toISOString()
        });

        if (duration > PERFORMANCE_THRESHOLDS.ACTION_DURATION) {
          monitoringSystem.warn('Slow action detected:', {
            type: action.type,
            duration,
            timestamp: new Date().toISOString()
          });
        }
      }

      return result;
    } catch (error) {
      monitoringSystem.error('Redux Error:', {
        type: action.type,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  };
};

// Configure store
const configureAppStore = (preloadedState = {}) => {
  // Merge with initial state
  const mergedState = {
    ...initialState,
    ...preloadedState
  };

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
    preloadedState: mergedState,
    middleware: (getDefaultMiddleware) => {
      const middlewares = getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'spatial/loadSpatialData/fulfilled',
            'commodities/fetchData/fulfilled',
            'spatial/loadSpatialData/rejected',
            'markets/fetchData/fulfilled'
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

      // Add custom monitoring middleware
      middlewares.push(createMonitorMiddleware());

      return middlewares;
    },
    devTools: process.env.NODE_ENV === 'development' ? {
      name: 'Yemen Market Analysis',
      trace: true,
      traceLimit: 25
    } : false
  });

  // Add hot reloading in development
  if (process.env.NODE_ENV === 'development' && module.hot) {
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
      store.replaceReducer({
        analysis: require('../slices/analysisSlice').default,
        commodities: require('../slices/commoditiesSlice').default,
        ecm: require('../slices/ecmSlice').default,
        geometries: require('../slices/geometriesSlice').default,
        markets: require('../slices/marketsSlice').default,
        priceDiff: require('../slices/priceDiffSlice').default,
        spatial: require('../slices/spatialSlice').default,
        theme: require('../slices/themeSlice').default,
        tvmii: require('../slices/tvmiiSlice').default
      });
    });
  }

  return store;
};

// Create store instance
export const store = configureAppStore();

// Export store and configuration
export { store as default, configureAppStore };