// src/config/appConfig.js

const isDev = process.env.NODE_ENV === 'development';
const isGitHubPages = window.location.hostname.includes('github.io');

export const config = {
  baseUrl: isGitHubPages ? '/Yemen_Market_Analysis' : '',
  
  // API paths
  api: {
    data: '/results',
    assets: '/static',
  },

  // Map configuration
  map: {
    tileLayer: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      options: {
        crossOrigin: true,
        maxZoom: 18,
      }
    },
    defaultView: {
      center: [15.5527, 48.5164],
      zoom: 6
    }
  },

  // CORS settings
  cors: {
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  },

  // Service Worker
  serviceWorker: {
    enabled: !isDev,
    path: '/spatialServiceWorker.js',
    scope: '/',
  }
};

// Helper function to get full URL
export const getFullPath = (path) => {
  return `${config.baseUrl}${path}`;
};