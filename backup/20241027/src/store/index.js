// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import { ecmReducer } from '../slices/index';
import { themeReducer } from '../slices/index';
import {priceDiffReducer } from '../slices/index';
import { spatialReducer } from '../slices/index';

export const store = configureStore({
  reducer: {
    ecm: ecmReducer,
    theme: themeReducer,
    priceDiff: priceDiffReducer,
    spatial: spatialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['your/non-serializable/action'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;