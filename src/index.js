// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/debugUtils';
import { backgroundMonitor } from './utils/backgroundMonitor';
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';

// Debug: Log initial state
console.log('Initial store state:', store.getState());

const root = createRoot(document.getElementById('root'));

const AppWithProviders = () => (
  <Provider store={store}>
    <ReduxDebugWrapper>
      <App />
    </ReduxDebugWrapper>
  </Provider>
);

root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);

// Initialize monitoring in development
if (process.env.NODE_ENV === 'development') {
  backgroundMonitor.logMetric('app', {
    event: 'initialization',
    timestamp: Date.now()
  });

  const startTime = performance.now();
  console.debug(`[App] Starting with ${process.env.NODE_ENV} configuration`);
  
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.debug(`[App] Initial load completed in ${loadTime.toFixed(2)}ms`);
  });
}