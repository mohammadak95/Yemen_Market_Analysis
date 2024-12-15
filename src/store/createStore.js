// src/store/createStore.js

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import themeReducer from '../slices/themeSlice';
import spatialReducer from '../slices/spatialSlice';
import welcomeModalReducer from './welcomeModalSlice';
import ecmReducer from '../slices/ecmSlice';
import flowReducer from '../slices/flowSlice';
import priceDiffReducer from '../slices/priceDiffSlice';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor, MetricTypes } from '../utils/backgroundMonitor';
import { requestMiddleware, batchMiddleware } from '../middleware/requestMiddleware';

// Initial reducers with essential features including welcomeModal
const staticReducers = {
  theme: themeReducer,
  spatial: spatialReducer,
  welcomeModal: welcomeModalReducer,
  ecm: ecmReducer,
  flow: flowReducer,
  priceDiff: priceDiffReducer
};

export function createReducerManager(initialReducers) {
  const reducers = { ...initialReducers };
  let combinedReducer = combineReducers(reducers);
  let keysToRemove = [];

  return {
    getReducerMap: () => reducers,

    reduce: (state, action) => {
      if (keysToRemove.length > 0) {
        state = { ...state };
        for (let key of keysToRemove) {
          delete state[key];
        }
        keysToRemove = [];
      }
      return combinedReducer(state, action);
    },

    add: (key, reducer) => {
      if (!key || reducers[key]) {
        return;
      }
      const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        action: 'add-reducer',
        reducer: key
      });
      try {
        reducers[key] = reducer;
        combinedReducer = combineReducers(reducers);
        metric?.finish({ status: 'success' });
      } catch (error) {
        metric?.finish({ status: 'error', error: error.message });
        throw error;
      }
    },

    remove: (key) => {
      if (!key || !reducers[key]) {
        return;
      }
      const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        action: 'remove-reducer',
        reducer: key
      });
      try {
        delete reducers[key];
        keysToRemove.push(key);
        combinedReducer = combineReducers(reducers);
        metric?.finish({ status: 'success' });
      } catch (error) {
        metric?.finish({ status: 'error', error: error.message });
        throw error;
      }
    }
  };
}

export function configureAppStore(preloadedState = {}) {
  const configMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'store-config'
  });

  try {
    const reducerManager = createReducerManager(staticReducers);
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Enhanced ignored paths configuration
    const ignoredPaths = {
      spatial: [
        'spatial.data.geoData',
        'spatial.data.weights',
        'spatial.data.flows',
        'spatial.data.analysis',
        'spatial.data.flowMaps',
        'spatial.data.marketClusters',
        'spatial.data.cache',
        'spatial.data.geometry.polygons',
        'spatial.data.geometry.points',
        'spatial.data.timeSeriesData'
      ],
      ecm: [
        'ecm.data.unified.results',
        'ecm.data.directional',
        'ecm.data.cache'
      ],
      flow: [
        'flow.flows',
        'flow.byDate',
        'flow.byRegion',
        'flow.metadata',
        'flow.data.cache'
      ],
      priceDiff: [
        'priceDiff.data.results',
        'priceDiff.data.cache'
      ]
    };

    const middleware = (getDefaultMiddleware) => {
      const customMiddleware = getDefaultMiddleware({
        thunk: {
          extraArgument: {
            spatialHandler,
            backgroundMonitor,
            MetricTypes
          },
          timeout: 30000,
        },
        serializableCheck: {
          ignoredPaths: [
            ...Object.values(ignoredPaths).flat(),
            'payload.geometry',
            'payload.data.geometry',
            'meta.arg.signal'
          ],
          warnAfter: 5000, // Increased threshold
        },
        immutableCheck: {
          warnAfter: 2000, // Increased threshold
          ignoredPaths: [
            'spatial.data',
            'spatial.status',
            'spatial.ui.view',
            'ecm.data',
            'ecm.status',
            'flow.data',
            'flow.status',
            'priceDiff.data',
            'priceDiff.status'
          ],
        },
      });

      // Add custom middleware
      const middlewareList = [
        requestMiddleware, // Add request deduplication and caching
        batchMiddleware,   // Add request batching
        ...customMiddleware
      ];

      if (isDevelopment) {
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
            // Enhanced action filtering
            const skipActions = [
              'spatial/setProgress',
              'spatial/setLoadingStage',
              'spatial/updateCache',
              'spatial/updateProgress',
              'ecm/setProgress',
              'ecm/updateCache',
              'flow/updateFlowMetrics',
              'priceDiff/updateCache',
              // Add more actions to skip
              'spatial/fetchAllSpatialData/pending',
              'flow/fetchData/pending',
              'ecm/fetchECMData/pending'
            ];
            return !skipActions.includes(action.type);
          },
          actionTransformer: (action) => {
            const transformers = {
              'spatial/fetchAllSpatialData/fulfilled': (payload) => ({
                type: 'SPATIAL_DATA',
                dataPoints: payload?.data?.length || 0,
                geometry: {
                  pointCount: payload?.geometry?.points?.length,
                  polygonCount: payload?.geometry?.polygons?.length,
                  hasUnified: !!payload?.geometry?.unified
                }
              }),
              'flow/fetchData/fulfilled': (payload) => ({
                type: 'FLOW_DATA',
                flowCount: payload?.flows?.length || 0,
                dateRange: payload?.metadata?.dateRange,
                uniqueMarkets: payload?.metadata?.uniqueMarkets
              }),
              'ecm/fetchECMData/fulfilled': (payload) => ({
                type: 'ECM_DATA',
                unifiedCount: payload?.unified?.length || 0,
                directionalCount: payload?.directional || {}
              }),
              'priceDiff/fetchData/fulfilled': (payload) => ({
                type: 'PRICE_DIFF_DATA',
                resultCount: payload?.results?.length || 0,
                metadata: payload?.metadata || {}
              })
            };

            return transformers[action.type] 
              ? { ...action, payload: transformers[action.type](action.payload) }
              : action;
          }
        });
        middlewareList.push(logger);
      }

      return middlewareList;
    };

    const store = configureStore({
      reducer: reducerManager.reduce,
      middleware,
      preloadedState: {
        ...preloadedState,
        welcomeModal: { hasSeenWelcome: false }
      },
      devTools: isDevelopment && {
        maxAge: 50,
        trace: true,
        traceLimit: 25,
        actionsBlacklist: [
          'spatial/setProgress',
          'spatial/setLoadingStage',
          'ecm/setProgress',
          'ecm/updateCache',
          'flow/updateFlowMetrics',
          'priceDiff/updateCache'
        ]
      }
    });

    store.reducerManager = reducerManager;

    // Enhanced reducer injection with error handling and metrics
    store.injectReducer = async (key, asyncReducer) => {
      const injectMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        action: 'inject-reducer',
        reducer: key
      });

      try {
        if (store.reducerManager.getReducerMap()[key]) {
          injectMetric?.finish({ status: 'skipped', reason: 'already-exists' });
          return;
        }

        const reducer = await asyncReducer();
        store.reducerManager.add(key, reducer.default || reducer);
        injectMetric?.finish({ status: 'success' });
        return reducer;
      } catch (error) {
        injectMetric?.finish({ status: 'error', error: error.message });
        throw error;
      }
    };

    configMetric?.finish({ 
      status: 'success',
      reducerCount: Object.keys(reducerManager.getReducerMap()).length
    });

    return store;
  } catch (error) {
    configMetric?.finish({ status: 'error', error: error.message });
    throw error;
  }
}

export default configureAppStore;
