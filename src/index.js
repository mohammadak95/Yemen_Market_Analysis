// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';
import { setupReduxDebugger } from './utils/debugUtils';
import { backgroundMonitor } from './utils/backgroundMonitor';
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';
import { fetchSpatialData } from './slices/spatialSlice';

// Initialize Redux Debugger
setupReduxDebugger(store);

const root = createRoot(document.getElementById('root'));

/**
 * Component to dispatch the fetchSpatialData thunk on mount.
 */
const DataLoader = React.memo(({ selectedCommodity }) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    if (selectedCommodity && !hasLoaded) {
      console.log(`Dispatching fetchSpatialData for commodity: ${selectedCommodity}`);
      store.dispatch(fetchSpatialData(selectedCommodity));
      setHasLoaded(true);
    }
  }, [selectedCommodity, hasLoaded]);

  return null;
});

/**
 * Wraps the App component with Redux Provider and Debugging Tools.
 */
const AppWithProviders = React.memo(() => {
  // Move selectedCommodity inside the component to prevent re-renders
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

root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);

// Development monitoring
if (process.env.NODE_ENV === 'development') {
  backgroundMonitor.logMetric('app', {
    event: 'initialization',
    timestamp: Date.now(),
  });

  const startTime = performance.now();
  console.debug(`[App] Starting with ${process.env.NODE_ENV} configuration`);

  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.debug(`[App] Initial load completed in ${loadTime.toFixed(2)}ms`);
  });
}