// src/store.js

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import spatialReducer from './slices/spatialSlice';

// Custom middleware to log spatial actions in development
const spatialLogger = store => next => action => {
  if (process.env.NODE_ENV === 'development' && 
      (action.type?.startsWith('spatial/') || action.type?.includes('spatial'))) {
    console.group(`Action: ${action.type}`);
    console.log('Payload:', action.payload);
    console.log('Previous State:', store.getState().spatial);
    const result = next(action);
    console.log('Next State:', store.getState().spatial);
    console.groupEnd();
    return result;
  }
  return next(action);
};

const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: process.env.NODE_ENV === 'development'
    }).concat(spatialLogger),
  devTools: process.env.NODE_ENV === 'development'
});

if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
}

export default store;