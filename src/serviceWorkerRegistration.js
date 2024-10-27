// src/serviceWorkerRegistration.js

import { config } from './config/appConfig';

export const register = async () => {
  if (!config.serviceWorker.enabled || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      config.serviceWorker.path,
      { scope: config.serviceWorker.scope }
    );

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (installingWorker == null) {
        return;
      }

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            console.log('New content is available; please refresh.');
          } else {
            console.log('Content is cached for offline use.');
          }
        }
      });
    });
  } catch (error) {
    console.error('Error registering service worker:', error);
  }
};

export const unregister = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error('Error unregistering service worker:', error);
      });
  }
};