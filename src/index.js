// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';
import { setupReduxDebugger } from './utils/debugUtils';
import { backgroundMonitor } from './utils/backgroundMonitor';
import { precomputedDataManager } from './utils/PrecomputedDataManager';
import { spatialDataManager } from './utils/SpatialDataManager'; // Ensure correct casing
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';
import { loadSpatialData } from './slices/spatialSlice';


// Initialize services
const initializeServices = async () => {
  try {
    // Initialize precomputed data manager
    await precomputedDataManager.initialize();

    // Initialize spatial data manager
    await spatialDataManager.initialize();

    // Setup Redux debugger
    setupReduxDebugger(store);

    return true;
  } catch (error) {
    console.error('Service initialization failed:', error);
    return false;
  }
};

// Enhanced DataLoader component
const DataLoader = React.memo(({ selectedCommodity }) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState(null);

  React.useEffect(() => {
    if (selectedCommodity && !hasLoaded) {
      const metric = backgroundMonitor.startMetric('initial-data-load');

      store
        .dispatch(loadSpatialData({ selectedCommodity }))
        .unwrap()
        .then(() => {
          setHasLoaded(true);
          metric.finish({
            status: 'success',
            commodity: selectedCommodity,
            timestamp: Date.now(),
          });
        })
        .catch((error) => {
          console.error('Error loading initial data:', error);
          setLoadError(error.message);
          metric.finish({
            status: 'error',
            error: error.message,
            commodity: selectedCommodity,
          });
        });
    }
  }, [selectedCommodity, hasLoaded]);

  if (loadError) {
    return (
      <div className="initial-load-error">
        <h3>Failed to load initial data</h3>
        <p>{loadError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return null;
});

// Enhanced AppWithProviders
const AppWithProviders = React.memo(() => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const selectedCommodity = React.useMemo(() => 'beans (kidney red)', []);

  React.useEffect(() => {
    initializeServices().then((success) => {
      setIsInitialized(success);

      backgroundMonitor.logMetric('services-initialization', {
        success,
        timestamp: Date.now(),
      });
    });
  }, []);

  if (!isInitialized) {
    return <div className="initialization-loading">Initializing services...</div>;
  }

  return (
    <Provider store={store}>
      <ReduxDebugWrapper>
        <DataLoader selectedCommodity={selectedCommodity} />
        <App />
      </ReduxDebugWrapper>
    </Provider>
  );
});

// Render application
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(<AppWithProviders />);