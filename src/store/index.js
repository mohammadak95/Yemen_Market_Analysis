// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../slices/themeSlice';
import ecmReducer from '../slices/ecmSlice';
import priceDiffReducer from '../slices/priceDiffSlice';
import spatialReducer from '../slices/spatialSlice';

// Create store with enhanced middleware configuration
const store = configureStore({
  reducer: {
    theme: themeReducer,
    ecm: ecmReducer,
    priceDiff: priceDiffReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore specific actions that contain non-serializable data
        ignoredActions: [
          'spatial/setData',
          'spatial/processFeatures',
          'spatial/fetchSpatialData/fulfilled'
        ],
        // Ignore specific paths that may contain non-serializable data
        ignoredPaths: [
          'spatial.geoData.features.*.properties.date',
          'spatial.uniqueMonths',
          'spatial.metadata.dataTimestamp'
        ],
      },
      // Keep dev tools enabled for debugging
      devTools: process.env.NODE_ENV !== 'production',
    }),
});

// Debug: Log initial state
if (process.env.NODE_ENV !== 'development') {
  console.debug('Initial Redux State:', store.getState());
  
  // Subscribe to state changes for debugging
  store.subscribe(() => {
    const state = store.getState();
    console.debug('Updated Redux State:', state);
  });
}

export default store;