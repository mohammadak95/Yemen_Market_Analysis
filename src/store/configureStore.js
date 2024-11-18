// src/store/configureStore.js

import { configureStore, createSlice } from '@reduxjs/toolkit';
import { monitoringSystem } from '../utils/MonitoringSystem';
import commoditiesReducer from './slices/commoditiesSlice';


// Create initial commodities slice
const commoditiesSlice = createSlice({
  name: 'commodities',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {
    setCommodities: (state, action) => {
      state.items = action.payload;
      state.status = 'succeeded';
    },
    setError: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    }
  }
});

// Create monitoring middleware
const monitorMiddleware = () => (next) => (action) => {
  const startTime = performance.now();
  const result = next(action);
  const duration = performance.now() - startTime;
  
  monitoringSystem.log('Redux Action:', {
    type: action.type,
    duration,
    timestamp: new Date().toISOString()
  });

  return result;
};

// Configure store with safety checks
export const configureStoreWithSafety = (preloadedState = {}) => {
  // Ensure commodities slice exists in preloaded state
  const safePreloadedState = {
    commodities: {
      items: [],
      status: 'idle',
      error: null
    },
    ...preloadedState
  };

  return configureStore({
    reducer: {
      commodities: commoditiesSlice.reducer,
      // Add other reducers here
    },
    preloadedState: safePreloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(monitorMiddleware),
    devTools: process.env.NODE_ENV !== 'production'
  });
};

// Export actions
export const { setCommodities, setError } = commoditiesSlice.actions;

// Create store instance
export const store = configureStoreWithSafety();