// src/store.js

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import spatialReducer from './slices/spatialSlice';

const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore certain non-serializable values in state
        ignoredActions: ['spatial/setData'],
        ignoredPaths: ['spatial.geoData'],
      },
    }),
});

// Debug middleware for development
if (process.env.NODE_ENV === 'development') {
  store.subscribe(() => {
    const state = store.getState();
    console.log('Current state:', state);
  });
}

export default store;