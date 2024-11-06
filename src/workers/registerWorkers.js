// src/workers/registerWorkers.js

import { spatialHandler } from '../utils/enhancedSpatialHandler';

export const registerWorkers = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          '/spatialServiceWorker.js',
          { scope: '/' }
        );

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && 
                navigator.serviceWorker.controller) {
              console.log('New spatial worker version available');
              // Optionally notify user of update
            }
          });
        });

        // Initialize spatial handler with worker
        spatialHandler.initializeWorker(registration);

      } catch (error) {
        console.error('Spatial worker registration failed:', error);
        // Fallback to non-worker processing
        spatialHandler.useFallbackProcessing();
      }
    });

    // Handle worker updates
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
};