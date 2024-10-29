// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../slices/themeSlice';
import ecmReducer from '../slices/ecmSlice';
import priceDiffReducer from '../slices/priceDiffSlice';
import spatialReducer from '../slices/spatialSlice';

// Create store with middleware
const store = configureStore({
  reducer: {
    theme: themeReducer,
    ecm: ecmReducer,
    priceDiff: priceDiffReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Debug: Log initial state
if (process.env.NODE_ENV !== 'production') {
  console.log('Initial Redux State:', store.getState());
  
  // Subscribe to state changes
  store.subscribe(() => {
    console.log('Updated Redux State:', store.getState());
  });
}

export default store;