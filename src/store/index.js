// src/store/index.js

import configureAppStore from './createStore';
import { backgroundMonitor, MetricTypes } from '../utils/backgroundMonitor';
import themeReducer from '../slices/themeSlice';

// Initialize store with critical reducers
let store = null;

export const initializeStore = async () => {
  const initMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'store'
  });

  try {
    store = configureAppStore({
      theme: themeReducer
    });

    // Lazy load additional reducers only when needed
    // Example: Load spatial reducer on-demand
    // await store.injectReducer('spatial', () => import('../slices/spatialSlice'));

    initMetric.finish({
      status: 'success',
      reducerCount: Object.keys(store.reducerManager.getReducerMap()).length
    });

    return store;
  } catch (error) {
    initMetric.finish({ status: 'error', error: error.message });
    throw error;
  }
};

export const getStore = () => {
  if (!store) {
    throw new Error('Store not initialized. Call initializeStore() first.');
  }
  return store;
};