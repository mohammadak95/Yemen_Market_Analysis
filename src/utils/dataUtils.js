// src/utils/dataUtils.js

import Papa from 'papaparse';

const ENV = process.env.NODE_ENV;
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const isGitHubPages = PUBLIC_URL.includes('github.io');
const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
const CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION, 10) || 3600000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

/**
 * Constructs the data path based on the current environment.
 */
export const getDataPath = (fileName) => {
  let basePath = '';

  if (isOffline) {
    basePath = '/results';
  } else if (isGitHubPages) {
    basePath = `${PUBLIC_URL}/results`;
  } else if (ENV === 'production') {
    basePath = '/Yemen_Market_Analysis/results';
  } else {
    basePath = '/results';
  }

  return `${basePath}/${fileName}`;
};

/**
 * Cache management class.
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
 * Enhanced JSON fetcher with CSV support and retry logic.
 */
export const enhancedFetchJson = async (url, options = {}) => {
  const {
    useCache = true,
    retryAttempts = RETRY_ATTEMPTS,
    signal,
    headers = {},
  } = options;

  const cacheKey = url + JSON.stringify(headers);

  if (useCache) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;
  }

  let lastError;

  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      if (attempt > 0) {
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

      if (contentType?.includes('text/csv')) {
        const text = await response.text();
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
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

      const data = await response.json();
      if (useCache) {
        cache.set(cacheKey, data);
      }
      return data;

    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError') throw error;
      if (attempt === retryAttempts - 1) {
        throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
      }
    }
  }

  throw lastError;
};

/**
 * Fetches and validates GeoJSON data with optional commodity filtering.
 */
export const fetchAndValidateData = async (url, selectedCommodity) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

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
    console.error('Error fetching data:', error);
    throw error;
  }
};

/**
 * Retry utility with exponential backoff.
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 5000 } = options;
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

export const clearDataCache = () => {
  cache.clear();
};