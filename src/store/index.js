// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../slices/themeSlice';
import spatialReducer from '../slices/spatialSlice';

const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: process.env.NODE_ENV === 'production' ? {
        ignoredPaths: ['spatial.data'],
        ignoredActions: ['spatial/loadSpatialData/fulfilled', 'spatial/loadSpatialData/rejected'],
      } : false,
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Export both default and named export
export { store };
export default store;