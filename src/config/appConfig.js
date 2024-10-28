// src/config/appConfig.js

const isDev = process.env.NODE_ENV === 'development';
const isGitHubPages = window.location.hostname.includes('github.io');
const repoName = '/Yemen_Market_Analysis'; // Add your repository name

export const config = {
  // Set baseUrl based on environment
  baseUrl: isGitHubPages ? repoName : '',
  
  // API paths with baseUrl
  api: {
    data: isGitHubPages ? `${repoName}/results` : '/results',
    assets: isGitHubPages ? `${repoName}/static` : '/static',
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

  // Service Worker - disable for GitHub Pages
  serviceWorker: {
    enabled: !isDev && !isGitHubPages, // Disable for GitHub Pages
    path: '/spatialServiceWorker.js',
    scope: '/',
  }
};

// Helper function to get full URL
export const getFullPath = (path) => {
  return `${config.baseUrl}${path}`;
};