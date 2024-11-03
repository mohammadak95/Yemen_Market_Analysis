// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import { setupReduxDebugger } from '../utils/debugUtils';
import themeReducer from '../slices/themeSlice';
import spatialReducer from '../slices/spatialSlice';

const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: process.env.NODE_ENV !== 'development',
    }),
});

// Setup debug tools in development
if (process.env.NODE_ENV === 'development') {
  setupReduxDebugger(store);
}

export default store;