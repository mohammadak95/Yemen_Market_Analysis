// src/store/index.js

import { configureAppStore } from './createStore';
import { initialState as themeInitialState } from '../slices/themeSlice';
import { backgroundMonitor, MetricTypes } from '../utils/backgroundMonitor';

// Only include theme state in preloadedState since other reducers are loaded dynamically
const preloadedState = {
  theme: themeInitialState
};

const store = configureAppStore(preloadedState);

// Lazy load reducers with proper error handling
export const loadSpatialReducer = async () => {
  const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'spatial-reducer'
  });
  
  try {
    if (!store.reducerManager.getReducerMap().spatial) {
      await store.injectReducer('spatial', () => import('../slices/spatialSlice'));
    }
    metric?.finish({ status: 'success' });
  } catch (error) {
    metric?.finish({ 
      status: 'error', 
      error: error.message 
    });
    console.error('Failed to load spatial reducer:', error);
  }
};

export const loadEcmReducer = async () => {
  const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'ecm-reducer'
  });
  try {
    if (!store.reducerManager.getReducerMap().ecm) {
      await store.injectReducer('ecm', () => import('../slices/ecmSlice'));
    }
    metric?.finish({ status: 'success' });
  } catch (error) {
    metric?.finish({ status: 'error', error: error.message });
    console.error('Failed to load ecm reducer:', error);
  }
};

export const loadFlowReducer = async () => {
  const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'flow-reducer'
  });
  try {
    if (!store.reducerManager.getReducerMap().flow) {
      await store.injectReducer('flow', () => import('../slices/flowSlice'));
    }
    metric?.finish({ status: 'success' });
  } catch (error) {
    metric?.finish({ status: 'error', error: error.message });
    console.error('Failed to load flow reducer:', error);
  }
};

// Initialize store with monitoring
export const initializeStore = async () => {
  const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'store-initialization'
  });
  
  try {
    // Load spatial reducer first before others
    await loadSpatialReducer();
    
    // Then load other reducers in parallel
    await Promise.all([
      loadEcmReducer(),
      loadFlowReducer()
    ]);
    
    metric?.finish({ 
      status: 'success',
      reducerCount: Object.keys(store.reducerManager.getReducerMap()).length
    });
  } catch (error) {
    metric?.finish({ 
      status: 'error',
      error: error.message 
    });
    console.error('Store initialization failed:', error);
  }
};

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
  window.__REDUX_DEBUGGER__ = {
    getState: () => store.getState(),
    dispatch: store.dispatch,
    reducerMap: () => store.reducerManager.getReducerMap(),
    monitor: {
      health: backgroundMonitor.checkHealth(),
      getActionMetrics: () => backgroundMonitor.getMetrics(MetricTypes.SYSTEM.PERFORMANCE),
      getFlowMetrics: () => backgroundMonitor.getMetrics(MetricTypes.FLOW.DATA_LOAD),
      getSpatialMetrics: () => backgroundMonitor.getMetrics(MetricTypes.SPATIAL.DATA_LOAD),
      getInitMetrics: () => backgroundMonitor.getMetrics(MetricTypes.SYSTEM.INIT),
      getErrors: () => backgroundMonitor.getErrors(),
      clearMetrics: () => backgroundMonitor.clearMetrics()
    }
  };
}

export default store;
