// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary'; // Updated import
import { monitoringSystem } from './utils/MonitoringSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';
import { spatialSystem } from './utils/SpatialSystem';

// Import any global CSS or resets
import './styles/index.css';

const setupDevelopmentTools = async () => {
  if (process.env.NODE_ENV === 'development') {
    // Enable debug mode
    monitoringSystem.enableDebug();

    // Setup performance monitoring
    const perfObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 100) {
          monitoringSystem.warn('Slow operation detected:', {
            name: entry.name,
            duration: entry.duration,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    perfObserver.observe({ entryTypes: ['measure', 'resource'] });

    // Monitor Redux state updates
    let prevUpdateTime = Date.now();
    store.subscribe(() => {
      const now = Date.now();
      const updateDuration = now - prevUpdateTime;
      prevUpdateTime = now;

      if (updateDuration > 16) {
        monitoringSystem.warn('Slow state update:', {
          duration: updateDuration,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Add debug utilities to window
    window.debugUtils = {
      store,
      monitoringSystem,
      logState: () => {
        console.group('Current Redux State');
        console.log('Full State:', store.getState());
        console.groupEnd();
      },
      getPerformanceReport: () => monitoringSystem.getPerformanceReport(),
      clearCache: () => {
        unifiedDataManager.clearCache();
        console.log('Cache cleared');
      },
    };

    console.log(`
      🔧 Debug tools available in console:
      - debugUtils.logState()            // View current Redux state
      - debugUtils.getPerformanceReport()// View performance metrics
      - debugUtils.clearCache()          // Clear data cache
    `);
  }
};

const setupErrorHandling = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    monitoringSystem.error('Global Error:', {
      message,
      source,
      lineno,
      colno,
      error,
    });
    // Return false to allow the default handler to run as well
    return false;
  };

  window.onunhandledrejection = (event) => {
    monitoringSystem.error('Unhandled Promise Rejection:', event.reason);
  };
};

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

const verifyDataPaths = async () => {
  if (process.env.NODE_ENV === 'development') {
    const { testDataPath } = await import('./utils/dataUtils');
    const { config } = await import('./config/appConfig');
    
    console.log('Data paths configuration:', {
      baseUrl: config.baseUrl,
      resultsPath: config.dataPaths.results,
      fullPath: config.paths.getFullPath(config.dataPaths.files.timeVaryingFlows)
    });
    
    // Test critical data files
    const files = [
      config.dataPaths.files.timeVaryingFlows,
      config.dataPaths.files.tvMiiResults,
      config.dataPaths.files.priceDifferentials
    ];
    
    for (const file of files) {
      const exists = await testDataPath(file);
      console.log(`Data file ${file}: ${exists ? 'OK' : 'NOT FOUND'}`);
    }
  }
};

const initializeApp = async () => {
  const initMetric = monitoringSystem.startMetric('app-initialization');

  try {
    await unifiedDataManager.init();
    await spatialSystem.initialize();

    const baseState = {
      commodities: {
        commodities: [],
        status: 'idle',
        error: null,
      },
      spatial: {
        status: {
          loading: false,
          error: null,
          isInitialized: false,
        },
        ui: {
          selectedCommodity: null,
          selectedDate: null,
          selectedRegimes: [],
        },
      },
      markets: {
        status: 'idle',
        error: null,
      },
      analysis: {
        status: 'idle',
        error: null,
      },
    };

    store.dispatch({ type: 'INIT_STATE', payload: baseState });

    if (process.env.NODE_ENV === 'development') {
      await setupDevelopmentTools();
    }

    setupErrorHandling();

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = createRoot(rootElement);
    renderApp(root);

    // Verify data paths after rendering
    await verifyDataPaths();

    initMetric.finish({ status: 'success' });
  } catch (error) {
    initMetric.finish({ status: 'error', error: error.message });
    monitoringSystem.error('Failed to initialize application:', error);

    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background-color: #f8d7da; color: #721c24;">
          <h1 style="color: #e53e3e;">Application Initialization Failed</h1>
          <p style="color: #4a5568;">${error.message}</p>
          <!-- You can add more user-friendly options here if desired -->
        </div>
      `;
    }
  }
};

initializeApp();