import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';

// Create a simple storage implementation using localStorage
const storage = {
  getItem: key => {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch (err) {
      return Promise.reject(err);
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  },
  removeItem: key => {
    try {
      localStorage.removeItem(key);
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }
};

import spatialReducer, { selectSpatialData, selectSpatialLoading, selectSpatialError } from '../slices/spatialSlice';
import themeReducer from '../slices/themeSlice';
import welcomeModalReducer from './welcomeModalSlice';
import ecmReducer from '../slices/ecmSlice';
import flowReducer from '../slices/flowSlice';
import priceDiffReducer from '../slices/priceDiffSlice';
import { createBatchMiddleware, withPerformanceMonitoring } from '../middleware/batchMiddleware';
import { createSpatialMiddleware } from '../middleware/spatialMiddleware';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor } from '../utils/backgroundMonitor';

let store = null;

const persistConfig = {
  key: 'spatial',
  storage,
  whitelist: ['geometry', 'cache'],
  blacklist: ['status', 'ui']
};

const persistedReducer = persistReducer(persistConfig, spatialReducer);

export const configureAppStore = async () => {
  if (store) {
    return store;
  }

  const configMetric = backgroundMonitor.startMetric('store-configuration');

  try {
    // Initialize middleware with performance monitoring
    const batchMiddleware = withPerformanceMonitoring(
      createBatchMiddleware({
        maxBatchSize: 20,
        batchTimeout: 50
      })
    );
    
    const spatialMiddleware = createSpatialMiddleware();

    // Configure serialization checks for normalized state
    const ignoredPaths = {
      spatial: [
        'spatial.geometry.unified',
        'spatial.geometry.polygons',
        'spatial.geometry.points',
        'spatial.cache'
      ],
      flow: [
        'flow.flows',
        'flow.byDate'
      ],
      ecm: [
        'ecm.data.unified',
        'ecm.data.directional'
      ]
    };

    const ignoredActions = {
      spatial: [
        'spatial/fetchData/fulfilled',
        'spatial/BATCH_ACTIONS'
      ],
      flow: [
        'flow/fetchData/fulfilled'
      ],
      ecm: [
        'ecm/fetchData/fulfilled'
      ]
    };

    store = configureStore({
      reducer: {
        spatial: persistedReducer,
        theme: themeReducer,
        welcomeModal: welcomeModalReducer,
        ecm: ecmReducer,
        flow: flowReducer,
        priceDiff: priceDiffReducer
      },
      middleware: (getDefaultMiddleware) => {
        const defaultMiddleware = getDefaultMiddleware({
          serializableCheck: {
            // Increase tolerance for complex data structures
            warnAfter: 5000,
            ignoredPaths: [
              ...ignoredPaths.spatial,
              ...ignoredPaths.flow,
              ...ignoredPaths.ecm
            ],
            ignoredActions: [
              ...ignoredActions.spatial,
              ...ignoredActions.flow,
              ...ignoredActions.ecm
            ]
          },
          immutableCheck: {
            // Increase tolerance for normalized updates
            warnAfter: 2000,
            ignoredPaths: [
              'spatial.entities',
              'spatial.geometry',
              'flow.flows',
              'ecm.data'
            ]
          },
          thunk: {
            extraArgument: {
              spatialHandler,
              backgroundMonitor
            }
          }
        });

        const middleware = [
          ...defaultMiddleware,
          batchMiddleware,
          spatialMiddleware
        ];

        // Add logger in development
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
              error: () => '#F20404'
            },
            predicate: (getState, action) => {
              // Skip frequent/noisy actions
              const skippedActions = [
                'spatial/setProgress',
                'spatial/BATCH_ACTIONS',
                'spatial/updateCache'
              ];
              return !skippedActions.includes(action.type);
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
          'spatial/BATCH_ACTIONS',
          'spatial/updateCache'
        ]
      }
    });

    // Add development utilities
    if (process.env.NODE_ENV === 'development') {
      window.__REDUX_STORE__ = store;
      window.__REDUX_DEBUGGER__ = {
        getState: () => store.getState(),
        dispatch: store.dispatch,
        monitor: {
          getMetrics: () => backgroundMonitor.getMetrics(),
          clearMetrics: () => backgroundMonitor.clearMetrics()
        },
        spatialData: {
          getEntityCounts: () => {
            const state = store.getState().spatial;
            return {
              markets: Object.keys(state.entities.markets.entities).length,
              flows: Object.keys(state.entities.flows.entities).length,
              timeSeries: Object.keys(state.entities.timeSeries.entities).length
            };
          },
          getCacheSize: () => Object.keys(store.getState().spatial.cache).length
        }
      };
    }

    configMetric.finish({
      status: 'success',
      reducerCount: Object.keys(store.getState()).length,
      middlewareCount: store.middleware?.length || 0
    });

    return store;
  } catch (error) {
    configMetric.finish({
      status: 'error',
      error: error.message
    });
    throw error;
  }
};

export const getStore = () => {
  if (!store) {
    throw new Error('Store has not been initialized. Call configureAppStore() first.');
  }
  return store;
};

export const createStore = () => {
  return configureStore({
    reducer: {
      spatial: persistedReducer,
      theme: themeReducer,
      welcomeModal: welcomeModalReducer,
      ecm: ecmReducer,
      flow: flowReducer,
      priceDiff: priceDiffReducer
    },
    middleware: (getDefaultMiddleware) => 
      getDefaultMiddleware({
        serializableCheck: false
      }),
    devTools: process.env.NODE_ENV !== 'production'
  });
};

export default {
  configureAppStore,
  getStore
};
