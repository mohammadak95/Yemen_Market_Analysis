// src/utils/dataUtils.js
import { pathResolver } from './pathResolver';


// Constants
const ENV = process.env.NODE_ENV;
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const isGitHubPages = PUBLIC_URL.includes('github.io');
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

const getBasePath = () => {
  if (isOffline) return '/results';
  if (isGitHubPages) return `${PUBLIC_URL}/results`;
  if (ENV === 'production') return '/Yemen_Market_Analysis/results';
  return '/results';
};

export const getDataPath = (fileName = '') => {
  // Check if we're on GitHub Pages
  const isGitHubPages = window.location.hostname.includes('github.io');
  const isProd = process.env.NODE_ENV === 'production';
  
  // Set base path based on environment
  let basePath;
  if (isGitHubPages) {
    basePath = '/Yemen_Market_Analysis/results';
  } else if (isProd) {
    basePath = '/results';
  } else {
    // In development, try multiple paths
    basePath = '/results';
  }

  // Clean up the path
  const cleanPath = `${basePath}/${fileName}`
    .replace(/\/+/g, '/') // Replace multiple slashes
    .replace(/\/$/, '');  // Remove trailing slash

  return cleanPath;
};

export const fetchWithRetry = async (url, options = {}, retries = 2) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      // Try alternative path if first attempt fails
      const altPath = url.replace('/results/', '/data/');
      try {
        const altResponse = await fetch(altPath, options);
        if (altResponse.ok) {
          return altResponse;
        }
      } catch (altError) {
        console.warn('Alternative path failed:', altError);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

export const getNetworkDataPath = (fileName) => {
  return cleanPath(`${getDataPath('network_data')}/${fileName}`);
};

export const getPrecomputedDataPath = (commodity) => {
  return pathResolver.getCommodityFilePath(commodity);
};


export const enhancedFetchJson = async (url, options = {}) => {
  try {
    const response = await pathResolver.readAndParseFile(url);
    return response;
  } catch (error) {
    console.error('[DataUtils] Failed to fetch:', {
      url,
      error: error.message
    });
    throw error;
  }
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