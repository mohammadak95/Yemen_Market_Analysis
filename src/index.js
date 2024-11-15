// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';
import { setupReduxDebugger } from './utils/debugUtils';
import { precomputedDataManager } from './utils/PrecomputedDataManager';
import { backgroundMonitor } from './utils/backgroundMonitor';
import { spatialDebugUtils } from './utils/spatialDebugUtils';
import { spatialIntegrationSystem } from './utils/spatialIntegrationSystem';

// State preservation for HMR
let preservedState = null;

/**
 * Sets up development tools and monitoring
 */
const setupDevelopmentTools = async () => {
  // Setup Redux debugger
  setupReduxDebugger(store);
  
  // Enable spatial debugging
  window.debugSpatial.enableDebug();
  window.debugSpatial.monitorRedux();
  
  // Setup performance monitoring
  const perfObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      spatialDebugUtils.log('Performance Entry:', entry);
    });
  });
  
  perfObserver.observe({ entryTypes: ['measure', 'resource'] });
  
  // Monitor state changes for performance
  store.subscribe(() => {
    const start = performance.now();
    const state = store.getState();
    const duration = performance.now() - start;
    
    if (duration > 16) { // More than one frame (60fps)
      spatialDebugUtils.warn('Slow state update:', {
        duration,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Setup cleanup
  window.addEventListener('beforeunload', () => {
    window.debugSpatial?.stopMonitoring();
    perfObserver.disconnect();
    spatialDebugUtils.log('Development tools cleaned up');
  });
};

/**
 * Sets up error handling and monitoring
 */
const setupErrorHandling = () => {
  // Global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    spatialDebugUtils.error('Global Error:', {
      message,
      source,
      lineno,
      colno,
      error
    });
    
    backgroundMonitor.logError('global-error', {
      message,
      timestamp: new Date().toISOString()
    });
    
    return false; // Let other error handlers run
  };

  // Promise rejection handling
  window.onunhandledrejection = (event) => {
    spatialDebugUtils.error('Unhandled Promise Rejection:', event.reason);
    backgroundMonitor.logError('unhandled-promise', {
      reason: event.reason,
      timestamp: new Date().toISOString()
    });
  };
};

/**
 * Preserves current state for HMR
 */
const preserveState = () => {
  if (process.env.NODE_ENV === 'development') {
    const currentState = store.getState();
    preservedState = {
      spatial: {
        data: currentState.spatial.data,
        ui: currentState.spatial.ui
      }
    };
    spatialDebugUtils.log('State preserved for HMR');
  }
};

/**
 * Restores preserved state after HMR
 */
const restoreState = () => {
  if (preservedState) {
    store.dispatch({
      type: 'spatial/restoreState',
      payload: preservedState.spatial
    });
    spatialDebugUtils.log('State restored after HMR');
    preservedState = null;
  }
};

/**
 * Renders the application
 */
const renderApp = (root, Component) => {
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <ReduxDebugWrapper>
          <Component />
        </ReduxDebugWrapper>
      </Provider>
    </React.StrictMode>
  );
};

/**
 * Initializes and starts the application
 */
const initializeApp = async () => {
  const initMetric = backgroundMonitor.startMetric('app-initialization');
  
  try {
    // Initialize core systems
    await Promise.all([
      precomputedDataManager.initialize(),
      spatialIntegrationSystem.initialize(),
      backgroundMonitor.init()
    ]);
    
    // Setup development tools
    if (process.env.NODE_ENV === 'development') {
      await setupDevelopmentTools();
      setupErrorHandling();
      
      backgroundMonitor.logMetric('app-init', {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      });
    }

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    // Create root and render app
    const root = createRoot(rootElement);
    renderApp(root, App);

    // Setup base styles
    const style = document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
          Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `;
    document.head.appendChild(style);

    initMetric.finish({ status: 'success' });
    
  } catch (error) {
    initMetric.finish({ status: 'error', error: error.message });
    spatialDebugUtils.error('Failed to initialize application:', error);
    
    // Render error UI
    const rootElement = document.getElementById('root');
    rootElement.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
        <div style="text-align: center; color: red;">
          <h1>Application Initialization Failed</h1>
          <p>${error.message}</p>
          <button onclick="window.location.reload()" style="
            padding: 10px 20px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">
            Retry
          </button>
        </div>
      </div>
    `;
  }
};

// Start the application
initializeApp();

// Setup HMR
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    preserveState();
    const NextApp = require('./App').default;
    const rootElement = document.getElementById('root');
    const root = createRoot(rootElement);
    renderApp(root, NextApp);
    restoreState();
  });
}