// src/utils/dataUtils.js
import { pathResolver } from './pathResolver';

// Constants
const ENV = process.env.NODE_ENV;
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const isGitHubPages = PUBLIC_URL.includes('github.io') || window.location.hostname.includes('github.io');
const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
const CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION, 10) || 3600000;
const RETRY_ATTEMPTS = 3;
const RETRY_INITIAL_DELAY = 1000;
const RETRY_MAX_DELAY = 5000;

class DataFetchCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new DataFetchCache();

const cleanPath = (path) => {
  if (!path) return '';
  return path
    .replace(/\/+/g, '/') // Replace multiple slashes
    .replace(/\/$/, '')   // Remove trailing slash
    .replace(/^\/+/, '/') // Ensure single leading slash
    .trim();
};

export const getDataPath = (fileName = '') => {
  const baseUrl = process.env.PUBLIC_URL || '';
  const isDev = process.env.NODE_ENV === 'development';
  
  // Set base path based on environment and file type
  let basePath;
  if (fileName.includes('preprocessed_')) {
    // Handle preprocessed data files
    if (isDev) {
      basePath = '/results/preprocessed_by_commodity';
    } else {
      basePath = `${baseUrl}/data/preprocessed_by_commodity`;
    }
  } else {
    // Handle other data files
    if (isDev) {
      basePath = '/results';
    } else {
      basePath = `${baseUrl}/data`;
    }
  }

  // Clean up the path
  const cleanedPath = cleanPath(`${basePath}/${fileName}`);

  console.debug('Resolved data path:', {
    isDev,
    baseUrl,
    fileName,
    cleanedPath,
    basePath
  });

  return cleanedPath;
};

export const fetchWithRetry = async (url, options = {}, retries = RETRY_ATTEMPTS) => {
  const tryPaths = async (paths) => {
    for (const path of paths) {
      try {
        const response = await fetch(path, options);
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${path}:`, error);
      }
    }
    return null;
  };

  // Generate all possible paths to try
  const paths = [url];
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // In development, try both /data and /results paths
    if (url.includes('/data/')) {
      paths.push(url.replace('/data/', '/results/'));
    } else if (url.includes('/results/')) {
      paths.push(url.replace('/results/', '/data/'));
    }
  }

  // Try all paths with retries
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await tryPaths(paths);
    if (response) return response;

    // Wait before retrying
    if (attempt < retries - 1) {
      const delay = Math.min(RETRY_INITIAL_DELAY * Math.pow(2, attempt), RETRY_MAX_DELAY);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to fetch from all paths after ${retries} attempts: ${paths.join(', ')}`);
};

export const getNetworkDataPath = (fileName) => {
  return cleanPath(`${getDataPath('network_data')}/${fileName}`);
};

export const getPrecomputedDataPath = (commodity) => {
  return pathResolver.getCommodityFilePath(commodity);
};

export const enhancedFetchJson = async (url, options = {}) => {
  try {
    const response = await fetchWithRetry(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return await response.json();
  } catch (error) {
    console.error('[DataUtils] Failed to fetch:', {
      url,
      error: error.message
    });
    throw error;
  }
};

export const getRegressionDataPath = () => {
  return getDataPath('spatial_analysis_results.json');
};

export const getChoroplethDataPath = (fileName) => {
  if (!fileName) throw new Error('Filename parameter is required');
  return cleanPath(`${getDataPath('choropleth_data')}/${fileName}`);
};

/**
 * Data validation utilities
 */
export const fetchAndValidateData = async (url, selectedCommodity) => {
  try {
    const data = await enhancedFetchJson(url);

    if (data?.features) {
      data.features = data.features.filter((feature) => {
        if (!feature?.properties?.commodity) return false;
        if (selectedCommodity) {
          return feature.properties.commodity.toLowerCase().trim() === 
                 selectedCommodity.toLowerCase().trim();
        }
        return true;
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching and validating data:', error);
    throw error;
  }
};

/**
 * Retry utility with exponential backoff
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const { 
    maxRetries = RETRY_ATTEMPTS, 
    initialDelay = RETRY_INITIAL_DELAY, 
    maxDelay = RETRY_MAX_DELAY 
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Cache management
 */
export const clearDataCache = () => {
  cache.clear();
};
