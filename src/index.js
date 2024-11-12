//src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';
import { setupReduxDebugger } from './utils/debugUtils';
import { backgroundMonitor } from './utils/backgroundMonitor';
import { precomputedDataManager } from './utils/PrecomputedDataManager';
import { fetchSpatialData } from './slices/spatialSlice';
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';

// Initialize necessary services
setupReduxDebugger(store);
precomputedDataManager.initialize();

const root = createRoot(document.getElementById('root'));

/**
 * Component to handle initial data loading
 */
const DataLoader = React.memo(({ selectedCommodity }) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    if (selectedCommodity && !hasLoaded) {
      const metric = backgroundMonitor.startMetric('initial-data-load');

      store.dispatch(fetchSpatialData({ selectedCommodity }))
        .then(() => {
          setHasLoaded(true);
          metric.finish({ 
            status: 'success',
            commodity: selectedCommodity,
            timestamp: Date.now()
          });
        })
        .catch(error => {
          console.error('Error loading initial data:', error);
          metric.finish({ 
            status: 'error', 
            error: error.message,
            commodity: selectedCommodity
          });
        });
    }
  }, [selectedCommodity, hasLoaded]);

  return null;
});

/**
 * App wrapper with providers and initial setup
 */
const AppWithProviders = React.memo(() => {
  // Initial commodity selection - could be moved to configuration
  const selectedCommodity = React.useMemo(() => 'beans (kidney red)', []);

  return (
    <Provider store={store}>
      <ReduxDebugWrapper>
        <DataLoader selectedCommodity={selectedCommodity} />
        <App />
      </ReduxDebugWrapper>
    </Provider>
  );
});

// Development monitoring setup
if (process.env.NODE_ENV === 'development') {
  const startTime = performance.now();
  
  // Initial metrics
  backgroundMonitor.logMetric('app-init', {
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    config: {
      precomputedData: true,
      reduxDebugger: true,
      environment: process.env.NODE_ENV
    }
  });

  // Load time monitoring
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    
    console.debug(`[App] Initial load completed in ${loadTime.toFixed(2)}ms`);
    
    backgroundMonitor.logMetric('app-load-complete', {
      duration: loadTime,
      timestamp: Date.now(),
      metrics: {
        loadTime,
        cacheInitialized: precomputedDataManager.isCacheInitialized(),
        reduxStoreSize: JSON.stringify(store.getState()).length
      }
    });
  });

  // Additional debug information
  console.debug(`
    🚀 Yemen Market Analysis Dashboard
    ================================
    Environment: ${process.env.NODE_ENV}
    Version: ${process.env.REACT_APP_VERSION || '1.0.0'}
    Redux Debugger: Enabled
    Precomputed Data: Enabled
    
    Debug tools available:
    - Redux DevTools
    - Background Monitor
    - Performance Metrics
  `);
}

// Render application
root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);