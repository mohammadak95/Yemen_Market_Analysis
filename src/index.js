// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import { monitoringSystem } from './utils/MonitoringSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';
import { spatialSystem } from './utils/SpatialSystem';

// State preservation for HMR
let preservedState = null;

/**
 * Sets up development tools and monitoring
 */
const setupDevelopmentTools = async () => {
  if (process.env.NODE_ENV !== 'development') return;

  // Enable monitoring system debugging
  monitoringSystem.enableDebug();

  // Setup performance observer
  const perfObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 100) { // Log slow operations (>100ms)
        monitoringSystem.warn('Slow operation detected:', {
          name: entry.name,
          duration: entry.duration,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
  
  perfObserver.observe({ entryTypes: ['measure', 'resource'] });

  // Monitor Redux state changes
  let prevUpdateTime = Date.now();
  store.subscribe(() => {
    const now = Date.now();
    const updateDuration = now - prevUpdateTime;
    prevUpdateTime = now;

    if (updateDuration > 16) { // More than one frame (60fps)
      monitoringSystem.warn('Slow state update:', {
        duration: updateDuration,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add debug utilities to window for console access
  window.debugUtils = {
    store,
    monitoringSystem,
    spatialSystem,
    dataManager: unifiedDataManager,
    
    // Debug helpers
    logState: () => {
      console.group('Current Redux State');
      console.log('Full State:', store.getState());
      console.log('Spatial State:', store.getState().spatial);
      console.groupEnd();
    },

    getPerformanceReport: () => {
      return monitoringSystem.getPerformanceReport();
    },

    clearCache: () => {
      unifiedDataManager.clearCache();
      console.log('Cache cleared');
    },

    getSpatialMetrics: () => {
      const state = store.getState().spatial;
      return {
        dataPoints: state.data?.timeSeriesData?.length || 0,
        markets: state.data?.marketClusters?.length || 0,
        flows: state.data?.flowAnalysis?.length || 0,
        warnings: state.validation?.warnings?.length || 0
      };
    }
  };

  // Setup cleanup on page unload
  window.addEventListener('beforeunload', () => {
    perfObserver.disconnect();
    monitoringSystem.log('Development tools cleaned up');
  });

  console.log(`
    🔧 Debug tools available in console:
    - debugUtils.logState()      // View current Redux state
    - debugUtils.getPerformanceReport() // View performance metrics
    - debugUtils.clearCache()    // Clear data cache
    - debugUtils.getSpatialMetrics() // Get spatial analysis metrics
  `);
};

/**
 * Sets up error handling and monitoring
 */
const setupErrorHandling = () => {
  // Global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    monitoringSystem.error('Global Error:', {
      message,
      source,
      lineno,
      colno,
      error
    });
    return false; // Let other error handlers run
  };

  // Promise rejection handling
  window.onunhandledrejection = (event) => {
    monitoringSystem.error('Unhandled Promise Rejection:', event.reason);
  };
};

/**
 * Manages state preservation for Hot Module Replacement
 */
const setupHMR = () => {
  if (process.env.NODE_ENV !== 'development' || !module.hot) return;

  // Preserve state before update
  const preserveState = () => {
    const currentState = store.getState();
    preservedState = {
      spatial: {
        data: currentState.spatial.data,
        ui: currentState.spatial.ui
      }
    };
    monitoringSystem.log('State preserved for HMR');
  };

  // Restore state after update
  const restoreState = () => {
    if (preservedState) {
      store.dispatch({
        type: 'spatial/restoreState',
        payload: preservedState.spatial
      });
      monitoringSystem.log('State restored after HMR');
      preservedState = null;
    }
  };

  // Handle module replacement
  module.hot.accept('./App', () => {
    preserveState();
    const NextApp = require('./App').default;
    const rootElement = document.getElementById('root');
    const root = createRoot(rootElement);
    renderApp(root, NextApp);
    restoreState();
  });
};

/**
 * Renders the application
 */
const renderApp = (root, Component) => {
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <Component />
      </Provider>
    </React.StrictMode>
  );
};

/**
 * Initializes and starts the application
 */
const initializeApp = async () => {
  const initMetric = monitoringSystem.startMetric('app-initialization');
  
  try {
    // Initialize core systems
    await Promise.all([
      unifiedDataManager.init(),
      spatialSystem.initialize()
    ]);
    
    // Setup development features
    if (process.env.NODE_ENV === 'development') {
      await setupDevelopmentTools();
    }

    // Setup error handling
    setupErrorHandling();
    
    // Setup HMR
    setupHMR();

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

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create root and render app
    const root = createRoot(rootElement);
    renderApp(root, App);

    initMetric.finish({ status: 'success' });
    
  } catch (error) {
    initMetric.finish({ status: 'error', error: error.message });
    monitoringSystem.error('Failed to initialize application:', error);
    
    // Render error UI
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          color: #ff0000;
          text-align: center;
          font-family: sans-serif;
        ">
          <div>
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
  }
};

// Start the application
initializeApp();
