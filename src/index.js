// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/debugUtils';
import { backgroundMonitor } from './utils/backgroundMonitor';
import 'leaflet/dist/leaflet.css';

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/spatialServiceWorker.js', {
        scope: '/'
      });
      
      console.log('SW registered:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New service worker version available');
            // Optionally notify user of update
          }
        });
      });

    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });

  // Optional: Handle service worker updates
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Initialize monitoring
if (process.env.NODE_ENV === 'development') {
  // Monitor React app initialization
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