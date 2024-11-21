// src/store/configureStore.js
import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import spatialReducer from '../slices/spatialSlice';
import themeReducer from '../slices/themeSlice';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import welcomeModalReducer from './welcomeModalSlice';
import { createBatchMiddleware } from '../middleware/batchMiddleware';

// Custom middleware for monitoring spatial operations
const spatialMonitorMiddleware = () => (next) => (action) => {
  if (action.type?.startsWith('spatial/')) {
    const startTime = performance.now();
    const result = next(action);
    const duration = performance.now() - startTime;

    backgroundMonitor.logMetric('spatial-action', {
      type: action.type,
      duration,
      timestamp: Date.now()
    });

    return result;
  }
  return next(action);
};

// Configure the store
const store = configureStore({
  reducer: {
    spatial: spatialReducer,
    theme: themeReducer,
    welcomeModal: welcomeModalReducer
  },
  middleware: (getDefaultMiddleware) => {
    const defaultMiddleware = getDefaultMiddleware({
      serializableCheck: {
        warnAfter: 5000,
        ignoredPaths: [
          'spatial.data.flowData',
          'spatial.data.spatialAnalysis',
          'spatial.data.cache',
          'spatial.data.geometry',
          'spatial.data.visualizationData',
          'spatial.data.regressionAnalysis',
          'spatial.data.marketClusters',
          'spatial.data.flowMaps'
        ],
        ignoredActions: [
          'spatial/fetchAllSpatialData/fulfilled',
          'spatial/fetchFlowData/fulfilled',
          'spatial/batchUpdate',
          'spatial/updateGeometry'
        ]
      },
      immutableCheck: {
        warnAfter: 1000,
        ignoredPaths: [
          'spatial.data',
          'spatial.status',
          'spatial.ui.view',
          'spatial.data.cache',
          'spatial.data.geometry'
        ]
      },
      thunk: {
        extraArgument: {
          spatialHandler,
          backgroundMonitor
        },
        timeout: 30000
      }
    });

    const middleware = [
      ...defaultMiddleware,
      createBatchMiddleware(),
      spatialMonitorMiddleware
    ];

    if (process.env.NODE_ENV === 'development') {
      const { createLogger } = require('redux-logger');
      const logger = createLogger({
        collapsed: true,
        duration: true,
        timestamp: true,
        colors: {
          title: (action) => action.error ? 'red' : 'blue',
          prevState: () => '#9E9E9E',
          action: () => '#03A9F4',
          nextState: () => '#4CAF50',
          error: () => '#F20404',
        },
        predicate: (getState, action) => {
          const skippedActions = [
            'spatial/setProgress',
            'spatial/setLoadingStage',
            'spatial/updateCache',
            'spatial/updateProgress'
          ];
          return !skippedActions.includes(action.type);
        },
        actionTransformer: (action) => {
          if (action.type === 'spatial/fetchAllSpatialData/fulfilled') {
            return { ...action, payload: '<LARGE_PAYLOAD>' };
          }
          return action;
        },
        stateTransformer: (state) => ({
          theme: state.theme,
          spatial: {
            ...state.spatial,
            data: '<SPATIAL_DATA>'
          }
        })
      });
      middleware.push(logger);
    }

    return middleware;
  },
  devTools: process.env.NODE_ENV === 'development' && {
    maxAge: 50,
    trace: true,
    traceLimit: 25,
    actionsBlacklist: [
      'spatial/setProgress',
      'spatial/setLoadingStage'
    ]
  }
});

if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
  window.__REDUX_DEBUGGER__ = {
    getState: () => store.getState(),
    dispatch: store.dispatch,
    monitor: {
      getActionLog: () => backgroundMonitor.getMetrics('redux-action'),
      getPerformanceMetrics: () => backgroundMonitor.getMetrics('performance'),
      clearMetrics: () => backgroundMonitor.clearMetrics()
    }
  };
}

export default store;