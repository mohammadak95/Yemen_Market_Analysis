// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import { ecmReducer } from '../slices/index';
import { themeReducer } from '../slices/index';
import { priceDiffReducer } from '../slices/index';
import spatialReducer  from '../slices/spatialSlice';

// Define the Redux store with integrated reducers and middleware
const store = configureStore({
  reducer: {
    ecm: ecmReducer,
    theme: themeReducer,
    priceDiff: priceDiffReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Update these with actual non-serializable actions or paths as needed
        ignoredActions: ['spatial/fetchSpatialData/rejected'],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['spatial.flowMaps'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
