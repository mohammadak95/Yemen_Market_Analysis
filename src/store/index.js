// src/store.js

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import themeReducer from './slices/themeSlice';
import spatialReducer from './slices/spatialSlice';

// Enhanced spatial logger middleware
const spatialLogger = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development' && 
      (action.type?.startsWith('spatial/') || action.type?.includes('spatial'))) {
    console.group(`%cSpatial Action: ${action.type}`, 'color: #1976d2; font-weight: bold;');
    console.log('%cPayload:', 'color: #4caf50; font-weight: bold;', action.payload);
    console.log('%cPrevious State:', 'color: #ff9800; font-weight: bold;', store.getState().spatial);
    
    const result = next(action);
    
    console.log('%cNext State:', 'color: #2196f3; font-weight: bold;', store.getState().spatial);
    console.log('%cState Diff:', 'color: #9c27b0; font-weight: bold;', 
      getDiff(store.getState().spatial, store.getState().spatial));
    console.groupEnd();
    return result;
  }
  return next(action);
};

// Performance monitoring middleware
const performanceMonitor = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    const result = next(action);
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 16) { // Longer than one frame (60fps)
      console.warn(`%cSlow action detected: ${action.type} took ${duration.toFixed(2)}ms`, 
        'color: #f44336; font-weight: bold;');
    }
    return result;
  }
  return next(action);
};

// Error boundary middleware
const errorBoundary = () => (next) => (action) => {
  try {
    return next(action);
  } catch (err) {
    console.error('Action error:', {
      action: action.type,
      payload: action.payload,
      error: err
    });
    
    // You can add error reporting service here
    if (process.env.NODE_ENV === 'production' && window?.Sentry) {
      window.Sentry.captureException(err);
    }
    
    throw err;
  }
};

// State validation middleware
const stateValidator = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();

  // Validate spatial state
  if (state.spatial) {
    const { geoData, flows, weights } = state.spatial.data;
    
    if (geoData && !geoData.features) {
      console.error('Invalid geoData structure detected');
    }
    
    if (flows && !Array.isArray(flows)) {
      console.error('Invalid flows structure detected');
    }
    
    if (weights && typeof weights !== 'object') {
      console.error('Invalid weights structure detected');
    }
  }

  return result;
};

// Configure middleware based on environment
const getMiddleware = () => {
  const middleware = [...getDefaultMiddleware({
    serializableCheck: {
      ignoredPaths: [
        'spatial.data.geoData',
        'spatial.data.weights',
        'spatial.data.flows'
      ],
    },
    immutableCheck: process.env.NODE_ENV === 'development'
  })];

  // Add development middleware
  if (process.env.NODE_ENV === 'development') {
    middleware.push(spatialLogger);
    middleware.push(performanceMonitor);
    middleware.push(createLogger({
      collapsed: true,
      duration: true,
      timestamp: true,
      diff: true
    }));
  }

  // Add production middleware
  middleware.push(errorBoundary);
  middleware.push(stateValidator);

  return middleware;
};

// Helper function to get state diff
const getDiff = (prevState, nextState) => {
  const diff = {};
  Object.keys(nextState).forEach(key => {
    if (prevState[key] !== nextState[key]) {
      diff[key] = {
        from: prevState[key],
        to: nextState[key]
      };
    }
  });
  return diff;
};

// Create store with enhanced configuration
const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer
  },
  middleware: getMiddleware(),
  devTools: process.env.NODE_ENV === 'development' && {
    name: 'Yemen Market Analysis',
    trace: true,
    traceLimit: 25
  },
  preloadedState: undefined,
  enhancers: undefined
});

// Development tools and debugging
if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
  
  // Add performance monitoring
  window.__REDUX_PERF__ = {
    actionDurations: new Map(),
    stateSize: new Map(),
    getMetrics: () => ({
      actionDurations: Array.from(window.__REDUX_PERF__.actionDurations.entries()),
      stateSize: Array.from(window.__REDUX_PERF__.stateSize.entries())
    })
  };
}

export default store;