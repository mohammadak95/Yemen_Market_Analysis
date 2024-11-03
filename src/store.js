// src/store.js

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import spatialReducer from './slices/spatialSlice';

const customizedMiddleware = getDefaultMiddleware({
  serializableCheck: process.env.NODE_ENV !== 'development', // Disable the middleware causing performance issues in development
});

const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  middleware: customizedMiddleware,
});

// Debug middleware for development
if (process.env.NODE_ENV === 'development') {
  store.subscribe(() => {
    const state = store.getState();
    console.log('Current state:', state);
  });
}

export default store;