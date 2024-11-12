// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';
import { setupReduxDebugger } from './utils/debugUtils';
import { backgroundMonitor } from './utils/backgroundMonitor';
import { dataLoadingMonitor } from './utils/dataMonitoring.js';
import { precomputedDataManager } from './utils/PrecomputedDataManager';
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';
import { COMMODITIES } from './constants';

// Initialize systems
setupReduxDebugger(store);
precomputedDataManager.initialize().catch(console.error);

const root = createRoot(document.getElementById('root'));

const DataLoader = React.memo(({ selectedCommodity }) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    if (selectedCommodity && !hasLoaded) {
      const metric = backgroundMonitor.startMetric('initial-data-load');
      
      precomputedDataManager.processSpatialData(selectedCommodity)
        .then(() => {
          setHasLoaded(true);
          metric.finish({ status: 'success' });
        })
        .catch(error => {
          console.error('Error loading initial data:', error);
          metric.finish({ status: 'error', error: error.message });
        });
    }
  }, [selectedCommodity, hasLoaded]);

  return null;
});

const AppWithProviders = React.memo(() => {
  const selectedCommodity = React.useMemo(
    () => COMMODITIES.FOOD[0], // Use constant for initial commodity
    []
  );

  return (
    <Provider store={store}>
      <ReduxDebugWrapper>
        <DataLoader selectedCommodity={selectedCommodity} />
        <App />
      </ReduxDebugWrapper>
    </Provider>
  );
});

root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);

// Development monitoring
if (process.env.NODE_ENV === 'development') {
  backgroundMonitor.logMetric('app-init', {
    timestamp: Date.now(),
    environment: process.env.NODE_ENV
  });

  const startTime = performance.now();
  
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    backgroundMonitor.logMetric('app-load-complete', {
      duration: loadTime,
      timestamp: Date.now()
    });
  });
}