// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import themeReducer from '../slices/themeSlice';
import spatialReducer from '../slices/spatialSlice';
import { monitoringSystem } from '../utils/MonitoringSystem';

// Enable Immer support for Map and Set
enableMapSet();

// Custom middleware to log actions to monitoring system
const monitorMiddleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development') {
    monitoringSystem.logMetric('redux-action', {
      type: action.type,
      payload: action.payload,
      timestamp: new Date().toISOString(),
    });
    
    // Log action for debugging
    monitoringSystem.log('Redux Action:', {
      type: action.type,
      payload: action.payload,
      state: store.getState()
    }, 'redux');
  }
  
  // Track timing of action processing
  const startTime = performance.now();
  const result = next(action);
  const duration = performance.now() - startTime;
  
  // Log slow actions
  if (duration > 16) { // More than one frame
    monitoringSystem.warn('Slow Redux action:', {
      type: action.type,
      duration,
      timestamp: new Date().toISOString()
    });
  }
  
  return result;
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
    const metric = monitoringSystem.startMetric('hmr-spatial-reducer');
    try {
      const nextSpatialReducer = require('../slices/spatialSlice').default;
      store.replaceReducer({
        ...store.getState(),
        spatial: nextSpatialReducer,
      });
      metric.finish({ status: 'success' });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to hot reload spatial reducer:', error);
    }
  });

  module.hot.accept('../slices/themeSlice', () => {
    const metric = monitoringSystem.startMetric('hmr-theme-reducer');
    try {
      const nextThemeReducer = require('../slices/themeSlice').default;
      store.replaceReducer({
        ...store.getState(),
        theme: nextThemeReducer,
      });
      metric.finish({ status: 'success' });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to hot reload theme reducer:', error);
    }
  });
}

// Export store instance
export { store };
export default store;