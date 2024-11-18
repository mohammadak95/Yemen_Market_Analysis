// src/utils/dataUtils.js

import Papa from 'papaparse';

// Environment and configuration constants
const ENV = process.env.NODE_ENV;
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const isGitHubPages = PUBLIC_URL.includes('github.io');
const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
const CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION, 10) || 3600000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

/**
 * Cache management class for data fetching
 */
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

/**
 * Constructs the data path based on the current environment.
 */
export const getDataPath = (fileName) => {
  // Add a debug log to help troubleshoot path construction
  console.debug('Environment:', {
    ENV,
    PUBLIC_URL,
    isGitHubPages,
    isOffline
  });

  // Normalize the fileName to handle any malformed input
  const normalizedFileName = fileName.replace(/^\/+/, '');

  // Construct the base path with environment awareness
  let basePath = '';
  if (ENV === 'development') {
    // In development, use the public folder directly
    basePath = '/data';
  } else if (isGitHubPages) {
    // For GitHub Pages, include the repository name
    basePath = `${PUBLIC_URL}/data`;
  } else if (ENV === 'production') {
    // In production, use the correct deployment path
    basePath = '/data';
  } else if (isOffline) {
    // Offline mode uses local data
    basePath = '/data';
  }

  // Construct the full path
  const fullPath = `${basePath}/${normalizedFileName}`.replace(/\/+/g, '/');
  
  // Log the constructed path for debugging
  console.debug('Constructed data path:', {
    fileName,
    basePath,
    fullPath
  });

  return fullPath;
};

/**
 * Enhanced JSON fetcher with CSV support and retry logic
 */
export const enhancedFetchJson = async (url, options = {}) => {
  const {
    useCache = true,
    retryAttempts = RETRY_ATTEMPTS,
    signal,
    headers = {},
  } = options;

  const cacheKey = url + JSON.stringify(headers);

  // Check cache first if enabled
  if (useCache) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.debug('Cache hit for:', url);
      return cachedData;
    }
  }

  let lastError;

  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      // Add delay for retries
      if (attempt > 0) {
        console.debug(`Retry attempt ${attempt + 1} for:`, url);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
      }

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json, text/csv',
          ...headers,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');

      // Handle CSV files
      if (contentType?.includes('text/csv') || url.endsWith('.csv')) {
        const text = await response.text();
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (useCache) {
                cache.set(cacheKey, results.data);
              }
              resolve(results.data);
            },
            error: (error) => reject(new Error(`CSV parsing failed: ${error.message}`)),
          });
        });
      }

      // Handle JSON files
      const data = await response.json();
      if (useCache) {
        cache.set(cacheKey, data);
      }
      return data;

    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError') throw error;
      
      // Only throw on final attempt
      if (attempt === retryAttempts - 1) {
        console.error(`Failed to fetch data from ${url}:`, error);
        throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
      }
    }
  }

  throw lastError;
};

/**
 * Test if a data path exists and is accessible
 */
export const testDataPath = async (filename) => {
  try {
    const fullPath = getDataPath(filename);
    const response = await fetch(fullPath, { 
      method: 'HEAD',
      cache: 'no-cache' // Prevent caching of HEAD requests
    });
    return {
      exists: response.ok,
      status: response.status,
      path: fullPath
    };
  } catch (error) {
    console.error(`Error testing path for ${filename}:`, error);
    return {
      exists: false,
      error: error.message,
      path: getDataPath(filename)
    };
  }
};

/**
 * Clear the data cache
 */
export const clearDataCache = () => {
  cache.clear();
  console.debug('Data cache cleared');
};

/**
 * Get the path for preprocessed commodity data
 */
export const getPreprocessedDataPath = (commodity) => {
  if (!commodity) throw new Error('Commodity parameter is required');
  const normalizedCommodity = commodity.toLowerCase().trim().replace(/\s+/g, '_');
  const filename = `preprocessed_yemen_market_data_${normalizedCommodity}.json`;
  return getDataPath(filename);
};

/**
 * Load JSON data with error handling
 */
export const loadJSONData = async (filename) => {
  const fullPath = getDataPath(filename);
  return enhancedFetchJson(fullPath);
};

/**
 * Load CSV data with error handling
 */
export const loadCSVData = async (filename) => {
  const fullPath = getDataPath(filename);
  return enhancedFetchJson(fullPath);
};