// src/utils/dataUtils.js

import Papa from 'papaparse';
import { backgroundMonitor } from './backgroundMonitor'; // Ensure correct import path
import { spatialValidation } from './spatialValidation'; // Ensure correct import path
import { spatialDebugUtils } from './spatialDebugUtils'; // Ensure correct import path

const ENV = process.env.NODE_ENV;
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const isGitHubPages = PUBLIC_URL.includes('github.io');
const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
const CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION, 10) || 3600000; // 1 hour
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // in milliseconds

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

  /**
   * Sets data in the cache with the current timestamp.
   * @param {string} key - The cache key.
   * @param {any} data - The data to cache.
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    // Log cache set event
    backgroundMonitor.logMetric('cache-set', { key, timestamp: new Date().toISOString() });
  }

  /**
   * Retrieves data from the cache if valid.
   * @param {string} key - The cache key.
   * @returns {any|null} - The cached data or null if not found/expired.
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      // Log cache miss
      backgroundMonitor.logMetric('cache-miss', { key, timestamp: new Date().toISOString() });
      return null;
    }

    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      // Log cache expiration
      backgroundMonitor.logMetric('cache-expired', { key, timestamp: new Date().toISOString() });
      return null;
    }

    // Log cache hit
    backgroundMonitor.logMetric('cache-hit', { key, timestamp: new Date().toISOString() });
    return cached.data;
  }

  /**
   * Clears the entire cache.
   */
  clear() {
    this.cache.clear();
    // Log cache clear event
    backgroundMonitor.logMetric('cache-cleared', { timestamp: new Date().toISOString() });
  }
}

const cache = new DataFetchCache();

/**
 * Enhanced JSON fetcher with CSV support, retry logic, and monitoring.
 * @param {string} url - The URL to fetch data from.
 * @param {object} options - Fetch options.
 * @param {boolean} options.useCache - Whether to use caching.
 * @param {number} options.retryAttempts - Number of retry attempts.
 * @param {AbortSignal} options.signal - Abort signal for fetch.
 * @param {object} options.headers - Custom headers for fetch.
 * @returns {Promise<any>} - The fetched and parsed data.
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
    if (cachedData) {
      // Log cache retrieval via BackgroundMonitor
      backgroundMonitor.logMetric('data-retrieved-from-cache', { url, cacheKey });
      return cachedData;
    }
  }

  let lastError;

  // Start monitoring the fetch process
  const fetchMetric = backgroundMonitor.startMetric('enhancedFetchJson', { url });

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

      let data;

      if (contentType?.includes('text/csv')) {
        const text = await response.text();
        data = await new Promise((resolve, reject) => {
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
      } else {
        data = await response.json();
        if (useCache) {
          cache.set(cacheKey, data);
        }
      }

      // Validate the fetched data if it's spatial
      if (data?.features) {
        const isValid = spatialValidation.validateDataStructure(data);
        if (!isValid) {
          throw new Error('Fetched spatial data failed validation.');
        }
      }

      // Log successful fetch
      backgroundMonitor.logMetric('fetch-success', { url, attempt: attempt + 1 });

      // Finish monitoring the fetch process
      fetchMetric.finish({ success: true, attempt: attempt + 1 });

      return data;

    } catch (error) {
      lastError = error;
      backgroundMonitor.logError('enhancedFetchJson-error', { url, attempt: attempt + 1, error: error.message });

      if (error.name === 'AbortError') throw error;
      if (attempt === retryAttempts - 1) {
        // Finish monitoring with failure
        fetchMetric.finish({ success: false, error: error.message });
        throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
      }
    }
  }

  // This line should not be reached, but added for safety
  throw lastError;
};

/**
 * Fetches and validates GeoJSON data with optional commodity filtering.
 * @param {string} url - The URL to fetch GeoJSON data from.
 * @param {string} selectedCommodity - The commodity to filter by.
 * @returns {Promise<object>} - The filtered GeoJSON data.
 */
export const fetchAndValidateData = async (url, selectedCommodity) => {
  // Start monitoring the fetch and validation process
  const validationMetric = backgroundMonitor.startSpatialMetric('fetchAndValidateData', selectedCommodity);

  try {
    const data = await enhancedFetchJson(url, { useCache: true });

    if (data?.features) {
      // Validate data structure
      const isValid = spatialValidation.validateDataStructure(data);
      if (!isValid) {
        throw new Error('GeoJSON data failed validation.');
      }

      // Filter features based on the selected commodity
      const filteredFeatures = data.features.filter((feature) => {
        if (!feature?.properties?.commodity) return false;
        if (selectedCommodity) {
          return feature.properties.commodity.toLowerCase().trim() === 
                 selectedCommodity.toLowerCase().trim();
        }
        return true;
      });

      data.features = filteredFeatures;

      // Log spatial data analysis if enabled
      if (window.spatialDebug && window.spatialDebug.analyzeSpatialData) {
        const analysis = window.spatialDebug.analyzeSpatialData();
        spatialDebugUtils.logSpatialMetrics(analysis);
      }
    }

    // Finish monitoring with success
    validationMetric.finish({ success: true, selectedCommodity });

    return data;

  } catch (error) {
    // Finish monitoring with failure
    validationMetric.finish({ success: false, error: error.message });
    console.error('Error fetching and validating data:', error);
    throw error;
  }
};

/**
 * Retry utility with exponential backoff.
 * @param {Function} fn - The function to retry.
 * @param {object} options - Retry options.
 * @param {number} options.maxRetries - Maximum number of retries.
 * @param {number} options.initialDelay - Initial delay in milliseconds.
 * @param {number} options.maxDelay - Maximum delay in milliseconds.
 * @returns {Promise<any>} - The result of the function if successful.
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
      backgroundMonitor.logMetric('retryWithBackoff-attempt', { attempt: attempt + 1, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Clears the data cache.
 */
export const clearDataCache = () => {
  cache.clear();
  // Log cache clear action
  backgroundMonitor.logMetric('clearDataCache', { timestamp: new Date().toISOString() });
};

/**
 * Constructs the path for precomputed data based on the commodity.
 * @param {string} commodity - The commodity name.
 * @returns {string} - The path to the precomputed data file.
 */
export const getPrecomputedDataPath = (commodity) => {
  const basePath = getDataPath(''); // Adjusted to pass an empty string for base path
  return `${basePath}/preprocessed_by_commodity/preprocessed_yemen_market_data_${commodity}.json`;
};

/**
 * Fetches precomputed data based on the commodity with validation.
 * @param {string} commodity - The commodity to fetch precomputed data for.
 * @returns {Promise<object>} - The fetched and validated precomputed data.
 */
export const fetchPrecomputedData = async (commodity) => {
  const precomputedPath = getPrecomputedDataPath(commodity);
  
  // Start monitoring the precomputed data fetch
  const precomputedMetric = backgroundMonitor.startSpatialMetric('fetchPrecomputedData', commodity);

  try {
    const data = await enhancedFetchJson(precomputedPath, { useCache: true });

    // Validate precomputed data structure
    const isValid = spatialValidation.validateTransformation(data, 'precomputed');
    if (!isValid) {
      throw new Error('Precomputed data failed transformation validation.');
    }

    // Optionally analyze spatial patterns
    const analysis = spatialDebugUtils.analyzeSpatialPatterns(data);
    spatialDebugUtils.logSpatialMetrics(analysis);

    // Finish monitoring with success
    precomputedMetric.finish({ success: true, commodity });

    return data;

  } catch (error) {
    // Finish monitoring with failure
    precomputedMetric.finish({ success: false, error: error.message });
    console.error('Error fetching precomputed data:', error);
    throw error;
  }
};
