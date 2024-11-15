// src/config/appConfig.js

const isDev = process.env.NODE_ENV === 'development';
const isGitHubPages = window.location.hostname.includes('github.io');
const repoName = '/yemen-market-analysis';

export const config = {
  // Base URL configuration
  baseUrl: isGitHubPages ? repoName : (isDev ? '/public' : ''),
  
  // API paths
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
      center: [15.5527, 48.5164], // Yemen's coordinates
      zoom: 6
    },
    bounds: {
      northEast: [19.0, 54.5], // Yemen's bounding box
      southWest: [12.5, 42.5]
    }
  },

  // Data file paths
  dataPaths: {
    preprocessed: 'preprocessed_by_commodity',
    spatialAnalysis: 'spatial_analysis_results.json',
    spatialWeights: 'transformed_spatial_weights.json',
    geoBoundaries: 'geoBoundaries-YEM-ADM1.geojson',
    enhancedUnified: 'enhanced_unified_data_with_residual.geojson',
    timeVaryingFlows: 'time_varying_flows.csv'
  },

  // Analysis configuration
  analysis: {
    defaultCommodity: 'beans_white',
    timeWindow: {
      default: 12, // months
      min: 3,
      max: 24
    },
    thresholds: {
      priceShock: 0.15,
      marketIntegration: 0.4,
      significance: 0.05
    }
  },

  // Cache settings
  cache: {
    maxAge: 3600000, // 1 hour in milliseconds
    maxSize: 50, // Maximum number of items in cache
    cleanupInterval: 600000 // 10 minutes in milliseconds
  },

  // CORS settings
  cors: {
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  },

  // Path helpers
  paths: {
    getDataUrl: (path) => {
      const basePath = isGitHubPages ? `${repoName}/results` : '/results';
      return `${basePath}/${path.replace(/^\/+/, '')}`;
    },
    getAssetUrl: (path) => {
      const basePath = isGitHubPages ? `${repoName}/static` : '/static';
      return `${basePath}/${path.replace(/^\/+/, '')}`;
    },
    getCommodityPath: (commodity) => {
      const normalizedCommodity = commodity
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[()]/g, '');
      return `preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedCommodity}.json`;
    }
  },

  // Development settings
  development: {
    debug: isDev,
    verbose: isDev,
    mockData: false,
    logLevel: isDev ? 'debug' : 'error',
    enableProfiling: isDev
  },

  // Error handling
  errors: {
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    timeout: 30000, // 30 seconds
    fallbackLocale: 'en'
  },

  // Chart configuration
  charts: {
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336'
    },
    animations: {
      duration: 750,
      easing: 'ease-in-out'
    },
    responsive: true,
    maintainAspectRatio: false
  },

  // Service Worker configuration
  serviceWorker: {
    enabled: !isDev && !isGitHubPages,
    path: '/service-worker.js',
    scope: '/',
    updateInterval: 3600000 // 1 hour
  },

  // Feature flags
  features: {
    enableCache: true,
    enableServiceWorker: !isDev && !isGitHubPages,
    enableProfiling: isDev,
    enableDebugger: isDev,
    enableMockData: false
  }
};

// Helper function to get full URL
export const getFullPath = (path) => {
  return `${config.baseUrl}${path}`;
};

// Export environment checks
export const environment = {
  isDevelopment: isDev,
  isGitHubPages: isGitHubPages,
  repoName: repoName
};

// Export default config
export default config;