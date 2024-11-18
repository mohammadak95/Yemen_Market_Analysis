// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import { monitoringSystem } from './utils/MonitoringSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';
import { spatialSystem } from './utils/SpatialSystem';

import './styles/index.css';

// Constants for configuration
const PERFORMANCE_THRESHOLDS = {
  SLOW_OPERATION: 100,    // ms
  SLOW_STATE_UPDATE: 16,  // ms
  BATCH_SIZE: 100
};

/**
 * Setup development tools and monitoring
 */
const setupDevelopmentTools = async () => {
  if (process.env.NODE_ENV !== 'development') return;

  monitoringSystem.enableDebug();

  // Enhanced performance monitoring
  const perfObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const slowOperations = entries.filter(entry => 
      entry.duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION
    );

    if (slowOperations.length > 0) {
      slowOperations.forEach(entry => {
        monitoringSystem.warn('Slow operation detected:', {
          name: entry.name,
          duration: entry.duration,
          entryType: entry.entryType,
          timestamp: new Date().toISOString()
        });
      });
    }
  });

  perfObserver.observe({ 
    entryTypes: ['measure', 'resource', 'navigation'],
    buffered: true
  });

  // Enhanced Redux monitoring
  let prevUpdateTime = Date.now();
  let batchUpdates = [];

  store.subscribe(() => {
    const now = Date.now();
    const updateDuration = now - prevUpdateTime;
    prevUpdateTime = now;

    batchUpdates.push({
      duration: updateDuration,
      timestamp: now
    });

    if (batchUpdates.length >= PERFORMANCE_THRESHOLDS.BATCH_SIZE) {
      const slowUpdates = batchUpdates.filter(
        update => update.duration > PERFORMANCE_THRESHOLDS.SLOW_STATE_UPDATE
      );

      if (slowUpdates.length > 0) {
        monitoringSystem.warn('Slow state updates detected:', {
          count: slowUpdates.length,
          averageDuration: slowUpdates.reduce((acc, curr) => acc + curr.duration, 0) / slowUpdates.length,
          timestamp: new Date().toISOString()
        });
      }

      batchUpdates = [];
    }
  });

  // Enhanced debug utilities
  window.debugUtils = {
    store,
    monitoringSystem,
    logState: () => {
      console.group('Current Redux State');
      console.log('Full State:', store.getState());
      console.groupEnd();
    },
    getPerformanceReport: () => monitoringSystem.getPerformanceReport(),
    clearCache: async () => {
      await unifiedDataManager.clearCache();
      console.log('Cache cleared successfully');
    },
    validateState: () => {
      const state = store.getState();
      console.group('State Validation');
      console.log('Valid State:', state !== undefined);
      console.log('Required Keys Present:', 
        ['commodities', 'spatial', 'analysis'].every(key => key in state)
      );
      console.groupEnd();
    }
  };

  console.log(`
    🔧 Debug tools available in console:
    - debugUtils.logState()             // View current Redux state
    - debugUtils.getPerformanceReport() // View performance metrics
    - debugUtils.clearCache()           // Clear data cache
    - debugUtils.validateState()        // Validate state structure
  `);
};

/**
 * Enhanced error handling setup
 */
const setupErrorHandling = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    monitoringSystem.error('Global Error:', {
      message,
      source,
      lineno,
      colno,
      error,
      state: store.getState(),
      timestamp: new Date().toISOString()
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    monitoringSystem.error('Unhandled Promise Rejection:', {
      reason: event.reason,
      state: store.getState(),
      timestamp: new Date().toISOString()
    });
  };
};

/**
 * Verify data paths and file accessibility
 */
const verifyDataPaths = async () => {
  if (process.env.NODE_ENV !== 'development') return;

  const { testDataPath } = await import('./utils/dataUtils');
  const { config } = await import('./config/appConfig');
  
  const configInfo = {
    baseUrl: config.baseUrl,
    resultsPath: config.dataPaths.results,
    fullPath: config.paths.getFullPath(config.dataPaths.files.timeVaryingFlows)
  };
  
  console.log('Data paths configuration:', configInfo);
  
  const criticalFiles = [
    config.dataPaths.files.timeVaryingFlows,
    config.dataPaths.files.tvMiiResults,
    config.dataPaths.files.priceDifferentials
  ];
  
  const results = await Promise.all(
    criticalFiles.map(async file => ({
      file,
      exists: await testDataPath(file)
    }))
  );

  results.forEach(({ file, exists }) => {
    console.log(`Data file ${file}: ${exists ? 'OK' : 'NOT FOUND'}`);
    if (!exists) {
      monitoringSystem.warn(`Critical file not found: ${file}`);
    }
  });

  return results.every(r => r.exists);
};

/**
 * Render the application
 */
const renderApp = (root) => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <Provider store={store}>
          <App />
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

/**
 * Initialize the application
 */
const initializeApp = async () => {
  const initMetric = monitoringSystem.startMetric('app-initialization');

  try {
    // Initialize core systems
    await Promise.all([
      unifiedDataManager.init(),
      spatialSystem.initialize()
    ]);

    // Setup initial state - matching the structure we see in the Redux store
    const baseState = {
      spatial: {
        data: null,
        status: {
          loading: false,
          error: null,
          isInitialized: true, // Set this to true initially
          lastUpdated: null
        },
        ui: {
          selectedCommodity: 'beans_white',
          selectedDate: null,
          selectedRegion: null,
          selectedAnalysis: null,
          selectedRegimes: []
        },
        validation: {
          warnings: [],
          qualityMetrics: {},
          coverage: {},
          spatialDiagnostics: null
        }
      },
      geometries: {
        data: null,
        metadata: {
          lastUpdated: null,
          source: null,
          version: null
        },
        status: {
          loading: false,
          error: null,
          isInitialized: true  // Set this to true initially
        },
        validation: {
          warnings: [],
          missingRegions: [],
          topologyErrors: []
        }
      }
    };

    store.dispatch({ type: 'INIT_STATE', payload: baseState });

    // Setup development tools and error handling
    if (process.env.NODE_ENV === 'development') {
      await setupDevelopmentTools();
    }
    setupErrorHandling();

    // Initialize DOM rendering
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = createRoot(rootElement);
    renderApp(root);

    // Verify data paths
    if (process.env.NODE_ENV === 'development') {
      const pathsValid = await verifyDataPaths();
      if (!pathsValid) {
        monitoringSystem.warn('Some critical files are missing');
      }
    }

    initMetric.finish({ status: 'success' });

  } catch (error) {
    initMetric.finish({ status: 'error', error: error.message });
    monitoringSystem.error('Failed to initialize application:', error);

    // Show error UI
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background-color: #f8d7da; color: #721c24;">
          <h1 style="color: #e53e3e;">Application Initialization Failed</h1>
          <p style="color: #4a5568;">${error.message}</p>
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 8px 16px; background-color: #e53e3e; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }
};

// Start application initialization
initializeApp();