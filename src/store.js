// src/store.js
import { configureStore } from '@reduxjs/toolkit';
import themeReducer, { initialState as themeInitialState } from './slices/themeSlice';
import spatialReducer, { initialState as spatialInitialState } from './slices/spatialSlice';

// Define initial state structure
const preloadedState = {
  theme: themeInitialState,
  spatial: spatialInitialState
};

// Configure middleware based on environment
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
        'spatial.data.marketClusters'
      ],
      warnAfter: 1000,
    },
    immutableCheck: {
      warnAfter: 500,
      ignoredPaths: [
        'spatial.data',
        'spatial.status',
        'spatial.ui.view'
      ],
    },
  });

  // Add redux-logger in development mode
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.REACT_APP_ENABLE_REDUX_LOGGER === 'true'
  ) {
    const { createLogger } = require('redux-logger');
    return middleware.concat(
      createLogger({
        collapsed: true,
        duration: true,
        timestamp: true,
        predicate: (getState, action) => {
          const skipActions = [
            'spatial/setProgress',
            'spatial/setLoadingStage',
            'spatial/updateCache',
            'spatial/updateProgress'
          ];
          return !skipActions.includes(action.type);
        },
        // Customize action/state transforms
        actionTransformer: (action) => {
          if (action.type === 'spatial/fetchSpatialData/fulfilled') {
            return {
              ...action,
              payload: '<<LARGE_PAYLOAD>>'
            };
          }
          return action;
        },
        // Limit state logging
        stateTransformer: (state) => {
          return {
            theme: state.theme,
            spatial: {
              ...state.spatial,
              data: '<<SPATIAL_DATA>>'
            }
          };
        }
      })
    );
  }

  return middleware;
};

// Create store with enhanced configuration
const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  preloadedState,
  middleware: getOptimizedMiddleware,
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

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
  
  // Add store monitor
  const monitor = {
    getState: () => store.getState(),
    dispatch: store.dispatch,
    subscribe: (listener) => store.subscribe(listener)
  };
  
  window.__REDUX_MONITOR__ = monitor;
}

export default store;