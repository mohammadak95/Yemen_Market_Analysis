// src/store/configureStore.js
import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import spatialReducer from '../slices/spatialSlice';
import themeReducer from '../slices/themeSlice';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const middleware = (getDefaultMiddleware) => {
  const customMiddleware = getDefaultMiddleware({
    serializableCheck: {
      // Disable for large state objects
      warnAfter: 5000,
      ignoredPaths: [
        'spatial.data.flowData',
        'spatial.data.spatialAnalysis',
        'spatial.data.cache',
        'spatial.data.geometry',
        'spatial.data.visualizationData'
      ]
    },
    thunk: {
      extraArgument: {
        spatialHandler,
        backgroundMonitor
      }
    }
  });

  if (process.env.NODE_ENV === 'development') {
    const { createLogger } = require('redux-logger');
    return [...customMiddleware, createLogger({
      collapsed: true,
      duration: true
    })];
  }

  return customMiddleware;
};

const store = configureStore({
  reducer: {
    spatial: spatialReducer,
    theme: themeReducer
  },
  middleware,
  devTools: process.env.NODE_ENV !== 'production'
});

export default store;