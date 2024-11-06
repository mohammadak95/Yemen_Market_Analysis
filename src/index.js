// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper'; // Correct import path
import { setupReduxDebugger } from './utils/debugUtils'; // Import setup function
import { backgroundMonitor } from './utils/backgroundMonitor';
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';
import { fetchSpatialData } from './store/spatialSlice'; // Import the thunk

// Initialize Redux Debugger
setupReduxDebugger(store);

// Debug: Log initial state
console.log('Initial store state:', store.getState());

const root = createRoot(document.getElementById('root'));

/**
 * Component to dispatch the fetchSpatialData thunk on mount.
 * @param {object} props - Component props.
 * @param {string} props.selectedCommodity - The selected commodity to fetch data for.
 */
const DataLoader = ({ selectedCommodity }) => {
  const dispatch = store.dispatch; // Use store.dispatch instead of useDispatch

  React.useEffect(() => {
    if (selectedCommodity) {
      console.log(`Dispatching fetchSpatialData for commodity: ${selectedCommodity}`);
      dispatch(fetchSpatialData(selectedCommodity));
    } else {
      console.warn('No commodity selected. Skipping fetchSpatialData dispatch.');
    }
  }, [dispatch, selectedCommodity]);

  return null; // This component doesn't render anything
};

/**
 * Wraps the App component with Redux Provider and Debugging Tools.
 * @param {object} props - Component props.
 * @param {string} props.selectedCommodity - The selected commodity to fetch data for.
 */
const AppWithProviders = ({ selectedCommodity }) => (
  <Provider store={store}>
    <ReduxDebugWrapper>
      {/* Dispatch the thunk for testing */}
      <DataLoader selectedCommodity={selectedCommodity} />
      <App />
    </ReduxDebugWrapper>
  </Provider>
);

// Replace 'beans (kidney red)' with the actual commodity you want to load
const selectedCommodity = 'beans (kidney red)';

root.render(
  <React.StrictMode>
    <AppWithProviders selectedCommodity={selectedCommodity} />
  </React.StrictMode>
);

// Initialize monitoring in development
if (process.env.NODE_ENV === 'development') {
  // Log app initialization metric
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
