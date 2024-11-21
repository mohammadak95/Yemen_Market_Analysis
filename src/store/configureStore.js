// src/store/configureStore.js
import { configureStore } from '@reduxjs/toolkit';
import spatialReducer from '../slices/spatialSlice';
import themeReducer from '../slices/themeSlice';
import welcomeModalReducer from './welcomeModalSlice';
import { createBatchMiddleware } from '../middleware/batchMiddleware';
import { createSpatialMiddleware } from '../middleware/spatialMiddleware';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor } from '../utils/backgroundMonitor';

// Create store with enhanced configuration
const configureAppStore = () => {
  const spatialMiddleware = createSpatialMiddleware();

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
        spatialMiddleware
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
              return {
                ...action,
                payload: {
                  ...action.payload,
                  data: '<LARGE_DATA>',
                  geometry: {
                    pointCount: action.payload?.geometry?.points?.length,
                    polygonCount: action.payload?.geometry?.polygons?.length,
                    hasUnified: !!action.payload?.geometry?.unified
                  }
                }
              };
            }
            return action;
          }
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

  // Add development tools
  if (process.env.NODE_ENV === 'development') {
    window.__REDUX_STORE__ = store;
    window.__REDUX_DEBUGGER__ = {
      getState: () => store.getState(),
      dispatch: store.dispatch,
      spatialData: {
        getGeometry: () => store.getState().spatial.data.geometry,
        validateGeometry: () => {
          const geometry = store.getState().spatial.data.geometry;
          return {
            hasPoints: Array.isArray(geometry?.points),
            hasPolygons: Array.isArray(geometry?.polygons),
            hasUnified: Boolean(geometry?.unified),
            pointCount: geometry?.points?.length || 0,
            polygonCount: geometry?.polygons?.length || 0
          };
        }
      },
      monitor: {
        getActionLog: () => backgroundMonitor.getMetrics('redux-action'),
        getPerformanceMetrics: () => backgroundMonitor.getMetrics('performance'),
        clearMetrics: () => backgroundMonitor.clearMetrics()
      }
    };
  }

  return store;
};

export default configureAppStore();