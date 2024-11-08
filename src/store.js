// src/store.js

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import spatialReducer from './slices/spatialSlice';

// Configure middleware based on environment
const getOptimizedMiddleware = () => {
  const middleware = getDefaultMiddleware({
    thunk: {
      extraArgument: undefined,
      timeout: 20000,
    },
    serializableCheck: {
      ignoredPaths: [
        'spatial.data.geoData',
        'spatial.data.weights',
        'spatial.data.flows',
        'spatial.data.analysis',
      ],
      warnAfter: 1000,
    },
    immutableCheck: {
      warnAfter: 500,
      ignoredPaths: ['spatial.data'],
    },
  });

  if (
    process.env.NODE_ENV === 'development' &&
    process.env.REACT_APP_ENABLE_REDUX_LOGGER === 'true'
  ) {
    const { createLogger } = require('redux-logger');
    middleware.push(
      createLogger({
        collapsed: true,
        duration: true,
        timestamp: true,
        predicate: (getState, action) => {
          const skipActions = [
            'spatial/setProgress',
            'spatial/setLoadingStage',
          ];
          return !skipActions.includes(action.type);
        },
      })
    );
  }

  return middleware;
};

// Create store
const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
  },
  middleware: getOptimizedMiddleware(),
  devTools: process.env.NODE_ENV === 'development',
});

export default store;