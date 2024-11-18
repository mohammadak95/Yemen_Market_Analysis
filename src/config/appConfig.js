// src/config/appConfig.js

const isDev = process.env.NODE_ENV === 'development';
const isGitHubPages = window.location.hostname.includes('github.io');
const repoName = '/yemen-market-analysis';

// Base paths configuration
const basePath = isGitHubPages ? repoName : '';
const dataBasePath = isDev ? '/data' : `${basePath}/data`;

export const config = {
  // Base URL configuration
  baseUrl: isGitHubPages ? repoName : isDev ? '' : '',

  // API paths configuration
  api: {
    data: `${dataBasePath}/results`,
    assets: `${basePath}/static`,
  },

  // Map configuration
  map: {
    tileLayer: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      options: {
        crossOrigin: true,
        maxZoom: 18,
      },
    },
    defaultView: {
      center: [15.5527, 48.5164], // Yemen's coordinates
      zoom: 6,
    },
    bounds: {
      northEast: [19.0, 54.5], // Yemen's bounding box
      southWest: [12.5, 42.5],
    },
  },

  // Data paths configuration
  dataPaths: {
    files: {
      timeVaryingFlows: 'time_varying_flows.csv', 
      tvMiiResults: 'tv_mii_results.json',
      priceDifferentials: 'price_differential_results.json',
      spatialWeights: 'transformed_spatial_weights.json',
      geoBoundaries: 'unified_data.geojson',
    },
    preprocessed: `${dataBasePath}/preprocessed_yemen_market_data_{commodity}.json`,
    spatialAnalysis: `${dataBasePath}/spatial_analysis_results.json`,
    spatialWeights: `${dataBasePath}/transformed_spatial_weights.json`,
    geoBoundaries: `${dataBasePath}/unified_data.geojson`,
  },

  // Analysis configuration
  analysis: {
    defaultCommodity: 'beans (white)',
    timeWindow: {
      default: 12, // months
      min: 3,
      max: 24,
    },
    thresholds: {
      priceShock: 0.15,
      marketIntegration: 0.4,
      significance: 0.05,
    },
  },

  // Cache settings
  cache: {
    maxAge: 3600000, // 1 hour in milliseconds
    maxSize: 50, // Maximum number of items in cache
    cleanupInterval: 600000, // 10 minutes in milliseconds
  },

  // CORS settings
  cors: {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },

  // Path resolution functions
  paths: {
    getFullPath: (filename) => {
      const basePath = isDev ? '/data' : `${basePath}/data`;
      return `${basePath}/${filename}`.replace(/\/+/g, '/');
    },
    getPreprocessedPath: (commodity) =>
      `${dataBasePath}/preprocessed_yemen_market_data_${commodity}.json`.replace(/\/+/g, '/'),
    getDataUrl: (path) => `${dataBasePath}/results/${path}`.replace(/\/+/g, '/'),
    getAssetUrl: (path) => `${basePath}/assets/${path}`.replace(/\/+/g, '/'),
  },

  // Development settings
  development: {
    debug: isDev,
    verbose: isDev,
    mockData: false,
    logLevel: isDev ? 'debug' : 'error',
    enableProfiling: isDev,
  },

  // Error handling
  errors: {
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    timeout: 30000, // 30 seconds
    fallbackLocale: 'en',
  },

  // Chart configuration
  charts: {
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
    },
    animations: {
      duration: 750,
      easing: 'ease-in-out',
    },
    responsive: true,
    maintainAspectRatio: false,
  },

  // Service Worker configuration
  serviceWorker: {
    enabled: !isDev && !isGitHubPages,
    path: '/service-worker.js',
    scope: '/',
    updateInterval: 3600000, // 1 hour
  },

  // Feature flags
  features: {
    enableCache: true,
    enableServiceWorker: !isDev && !isGitHubPages,
    enableProfiling: isDev,
    enableDebugger: isDev,
    enableMockData: false,
  },
};

// Utility functions for path resolution
export const getFullPath = (filename) => config.paths.getFullPath(filename);
export const getDataUrl = (path) => config.paths.getDataUrl(path);
export const getAssetUrl = (path) => config.paths.getAssetUrl(path);

// Export environment checks
export const environment = {
  isDevelopment: isDev,
  isGitHubPages: isGitHubPages,
  repoName: repoName,
};

// Export default config
export default config;