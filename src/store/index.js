// src/store/index.js
// (Consolidating both store files into a single, more robust configuration)

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import themeReducer, { initialState as themeInitialState } from '../slices/themeSlice';
import spatialReducer, { initialState as spatialInitialState } from '../slices/spatialSlice';
import geometriesReducer from '../slices/geometriesSlice'; // Import the geometries reducer
import { backgroundMonitor } from '../utils/backgroundMonitor';

let startTime = Date.now(); // or any other appropriate initial value

// Define initial state structure
const preloadedState = {
  theme: themeInitialState,
  spatial: spatialInitialState,
  geometries: { data: null, loading: false, error: null }, // Initialize geometries state
};

// Enhanced spatial logger middleware
const spatialLogger = (store) => (next) => (action) => {
  if (
    process.env.NODE_ENV === 'development' &&
    (action.type?.startsWith('spatial/') || action.type?.includes('spatial'))
  ) {
    console.group(`%cSpatial Action: ${action.type}`, 'color: #1976d2; font-weight: bold;');
    console.log('%cPayload:', 'color: #4caf50; font-weight: bold;', action.payload);
    console.log('%cPrevious State:', 'color: #ff9800; font-weight: bold;', store.getState().spatial);

    const result = next(action);
    const nextState = store.getState().spatial;

    console.log('%cNext State:', 'color: #2196f3; font-weight: bold;', nextState);
    console.groupEnd();

    // Log performance metrics
    backgroundMonitor.logMetric('redux-action', {
      type: action.type,
      duration: performance.now() - startTime,
      stateSize: JSON.stringify(nextState).length,
    });

    return result;
  }
  return next(action);
};

/**
 * Configures and returns the Redux store.
 * @returns {Store} - The configured Redux store.
 */
const getOptimizedMiddleware = (getDefaultMiddleware) => {
  const middleware = getDefaultMiddleware({
    thunk: {
      extraArgument: undefined,
      timeout: 20000,
    },
    serializableCheck: {
      ignoredPaths: [
        'spatial.data.geoData',
        'spatial.data.weights',
        'spatial.data.flows',
        'spatial.data.analysis',
        'spatial.data.flowMaps',
        'spatial.data.marketClusters',
        'geometries.data', // Ignore geometries data path
      ],
      warnAfter: 1000,
    },
    immutableCheck: {
      warnAfter: 500,
      ignoredPaths: [
        'spatial.data',
        'spatial.status',
        'spatial.ui.view',
        'geometries.data', // Ignore geometries data path
      ],
    },
  });

  if (process.env.NODE_ENV === 'development') {
    middleware.push(spatialLogger);

    if (process.env.REACT_APP_ENABLE_REDUX_LOGGER === 'true') {
      middleware.push(
        createLogger({
          collapsed: true,
          duration: true,
          timestamp: true,
          predicate: (getState, action) => {
            const skipActions = [
              'spatial/setProgress',
              'spatial/setLoadingStage',
              'spatial/updateCache',
              'spatial/updateProgress',
              'geometries/clearGeometries', // Optionally skip geometries actions
            ];
            return !skipActions.includes(action.type);
          },
          actionTransformer: (action) => {
            if (action.type === 'spatial/fetchSpatialData/fulfilled') {
              return {
                ...action,
                payload: '<<LARGE_PAYLOAD>>',
              };
            }
            return action;
          },
          stateTransformer: (state) => ({
            theme: state.theme,
            spatial: {
              ...state.spatial,
              data: '<<SPATIAL_DATA>>',
            },
            geometries: '<<GEOMETRIES_DATA>>', // Optionally transform geometries state
          }),
        })
      );
    }
  }

  return middleware;
};

const loggerMiddleware = createLogger({
  collapsed: true,
  duration: true,
  timestamp: true,
  predicate: (getState, action) => {
    // Filter out frequent actions to reduce noise
    const skipActions = [
      'spatial/setProgress',
      'spatial/setLoadingStage',
      'spatial/updateCache',
    ];
    return !skipActions.includes(action.type);
  },
});

// Create store with enhanced configuration
const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
    geometries: geometriesReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in serialization check
        ignoredActions: ['spatial/fetchSpatialData/fulfilled'],
        ignoredPaths: [
          'spatial.data.geoData',
          'spatial.data.weights',
          'spatial.data.flows',
          'geometries.data'
        ],
      },
      thunk: {
        extraArgument: undefined
      }
    });

    if (process.env.NODE_ENV === 'development') {
      middleware.push(loggerMiddleware);
    }

    return middleware;
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
  window.__REDUX_MONITOR__ = {
    getState: () => store.getState(),
    dispatch: store.dispatch,
    subscribe: (listener) => store.subscribe(listener),
  };
}

export default store;
