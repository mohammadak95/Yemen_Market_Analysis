// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../slices/themeSlice';
import spatialReducer from '../slices/spatialSlice'; // Ensure correct path

// Create store
const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore paths that contain non-serializable data
        ignoredPaths: ['spatial.data'],
        // Ignore actions that involve non-serializable data
        ignoredActions: ['spatial/loadSpatialData/fulfilled', 'spatial/loadSpatialData/rejected'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Expose store in development
if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
}

export default store;