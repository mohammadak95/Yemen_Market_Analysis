// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import themeReducer from '../slices/themeSlice';
import spatialReducer from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { spatialDebugUtils } from '../utils/spatialDebugUtils';

// Enable Immer support for Map and Set
enableMapSet();

// Custom middleware to log actions to background monitor
const monitorMiddleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development') {
    backgroundMonitor.logMetric('redux-action', {
      type: action.type,
      payload: action.payload,
      timestamp: new Date().toISOString(),
    });
    
    spatialDebugUtils.log('Redux Action:', {
      type: action.type,
      payload: action.payload
    });
  }
  return next(action);
};

const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable data in these actions
        ignoredActions: [
          'spatial/loadSpatialData/fulfilled',
          'spatial/loadSpatialData/rejected',
        ],
        // Ignore non-serializable data in these paths
        ignoredPaths: [
          'spatial.data.geometries',
          'spatial.data.cached'
        ],
      },
      // Enable immutability check only in development
      immutableCheck: process.env.NODE_ENV === 'development',
    }).concat(monitorMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Enable hot reloading for reducers in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('../slices/spatialSlice', () => {
    const nextSpatialReducer = require('../slices/spatialSlice').default;
    store.replaceReducer({
      ...store.getState(),
      spatial: nextSpatialReducer,
    });
  });

  module.hot.accept('../slices/themeSlice', () => {
    const nextThemeReducer = require('../slices/themeSlice').default;
    store.replaceReducer({
      ...store.getState(),
      theme: nextThemeReducer,
    });
  });
}

// Export store instance and types
export { store };
export default store;