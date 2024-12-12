// src/index.js

import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import store, { initializeStore } from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';
import { setupReduxDebugger } from './utils/debugUtils';
import { backgroundMonitor, MetricTypes } from './utils/backgroundMonitor';
import { spatialHandler } from './utils/spatialDataHandler';
import { fetchAllSpatialData } from './slices/spatialSlice';
import { fetchFlowData } from './slices/flowSlice';
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const DEFAULT_DATE = '2020-10-01';
const DEFAULT_COMMODITY = 'beans (kidney red)';

// Data Loader Component
const DataLoader = React.memo(({ selectedCommodity, selectedDate }) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!selectedCommodity || hasLoaded) {
      return;
    }

    let metric;
    try {
      metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        component: 'data-loader',
        commodity: selectedCommodity,
        date: selectedDate
      });
    } catch (e) {
      console.warn('Error starting metric:', e);
    }

    const loadData = async () => {
      try {
        // Load spatial and flow data in parallel
        await Promise.all([
          dispatch(fetchAllSpatialData({ 
            commodity: selectedCommodity, 
            date: selectedDate 
          })),
          dispatch(fetchFlowData({ 
            commodity: selectedCommodity, 
            date: selectedDate 
          }))
        ]);

        setHasLoaded(true);
        metric?.finish?.({
          status: 'success',
          commodity: selectedCommodity,
          date: selectedDate,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error loading initial data:', error);
        metric?.finish?.({
          status: 'error',
          error: error.message,
          commodity: selectedCommodity,
          date: selectedDate
        });
        
        try {
          backgroundMonitor.logError?.('data-load-failed', {
            error: error.message,
            stack: error.stack,
            commodity: selectedCommodity,
            date: selectedDate
          });
        } catch (e) {
          console.warn('Error logging to background monitor:', e);
        }
      }
    };

    loadData();
  }, [selectedCommodity, selectedDate, hasLoaded, dispatch]);

  return null;
});

DataLoader.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string.isRequired,
};

DataLoader.displayName = 'DataLoader';

// App Wrapper Component
const AppWithProviders = React.memo(() => {
  const selectedCommodity = useMemo(() => DEFAULT_COMMODITY, []);
  const selectedDate = useMemo(() => DEFAULT_DATE, []);

  return (
    <Provider store={store}>
      <ReduxDebugWrapper>
        <DataLoader 
          selectedCommodity={selectedCommodity} 
          selectedDate={selectedDate} 
        />
        <App />
      </ReduxDebugWrapper>
    </Provider>
  );
});

AppWithProviders.displayName = 'AppWithProviders';

// Initialize the application
const initializeApp = async () => {
  const startTime = performance.now();
  let initMetric;

  try {
    // Initialize background monitor first
    try {
      await backgroundMonitor.init();
      initMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        component: 'app',
        startTime
      });
    } catch (e) {
      console.warn('Background monitor initialization failed:', e);
    }

    // Initialize store with required reducers
    await initializeStore();

    // Initialize services in development
    if (process.env.NODE_ENV === 'development') {
      setupReduxDebugger(store);

      try {
        backgroundMonitor.logMetric(MetricTypes.SYSTEM.INIT, {
          timestamp: Date.now(),
          environment: process.env.NODE_ENV,
          config: {
            precomputedData: true,
            reduxDebugger: true,
            flowManagement: true
          }
        });

        // Setup load time monitoring
        window.addEventListener('load', () => {
          const loadTime = performance.now() - startTime;
          console.debug(`[App] Initial load completed in ${loadTime.toFixed(2)}ms`);

          backgroundMonitor.logMetric(MetricTypes.SYSTEM.PERFORMANCE, {
            event: 'load-complete',
            duration: loadTime,
            timestamp: Date.now(),
            metrics: {
              loadTime,
              cacheInitialized: Boolean(spatialHandler.geometryCache),
              reduxStoreSize: JSON.stringify(store.getState()).length,
              reducersLoaded: Object.keys(store.reducerManager.getReducerMap()).length
            }
          });
        });
      } catch (e) {
        console.warn('Error setting up monitoring:', e);
      }

      console.debug(`
        🚀 Yemen Market Analysis Dashboard
        ================================
        Environment: ${process.env.NODE_ENV}
        Version: ${process.env.REACT_APP_VERSION || '1.0.0'}
        Redux Debugger: Enabled
        Precomputed Data: Initialized
        Flow Management: Enabled
        
        Debug tools available:
        - Redux DevTools
        - Background Monitor
        - Performance Metrics
      `);
    }

    // Initialize geometry data
    await spatialHandler.initializeGeometry();

    // Create root and render application
    const root = createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <AppWithProviders />
      </React.StrictMode>
    );

    initMetric?.finish?.({ 
      status: 'success',
      initTime: performance.now() - startTime,
      environment: process.env.NODE_ENV,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    initMetric?.finish?.({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
      initTime: performance.now() - startTime
    });

    try {
      backgroundMonitor.logError(MetricTypes.SYSTEM.ERROR, {
        component: 'app-init',
        error: error.message,
        stack: error.stack,
        initTime: performance.now() - startTime
      });
    } catch (e) {
      console.warn('Error logging to background monitor:', e);
    }

    // Render error state if initialization fails
    const root = createRoot(document.getElementById('root'));
    root.render(
      <div style={{ 
        padding: '20px', 
        color: '#721c24', 
        backgroundColor: '#f8d7da', 
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        margin: '20px'
      }}>
        <h2>Application Initialization Failed</h2>
        <p>Please refresh the page or contact support if the problem persists.</p>
        {process.env.NODE_ENV === 'development' && (
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
        )}
      </div>
    );
  }
};

// Start the application
initializeApp();