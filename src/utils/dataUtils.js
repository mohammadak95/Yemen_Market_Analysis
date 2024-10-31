// ===== dataPath.js =====

// src/utils/dataPath.js

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
 * Enhanced DataPrefetcher class that works with the Blob-based Web Worker
 */
export class DataPrefetcher {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
    
    // Create worker using Blob URL
    const workerCode = `
      self.onmessage = async (event) => {
        const { type, key, data } = event.data;
        
        try {
          let processed;
          switch (type) {
            case 'processGeoJSON':
              processed = await processGeoJSONData(data);
              break;
            case 'processFlowData':
              processed = await processFlowData(data);
              break;
            case 'processCSV':
              processed = await processCSVData(data);
              break;
            default:
              processed = data;
          }
          
          self.postMessage({ key, processed });
        } catch (error) {
          self.postMessage({ key, error: error.message });
        }
      };

      function processGeoJSONData(data) {
        return data.features.map(feature => ({
          ...feature,
          properties: {
            ...feature.properties,
            usdprice: parseFloat(feature.properties.usdprice) || 0,
            price: parseFloat(feature.properties.price) || 0,
            conflict_intensity: parseFloat(feature.properties.conflict_intensity) || 0,
            date: new Date(feature.properties.date).toISOString(),
          }
        })).filter(feature => {
          const validation = validateFeature(feature);
          return validation.isValid;
        });
      }

      function processFlowData(data) {
        return data.map(flow => ({
          ...flow,
          value: parseFloat(flow.value) || 0,
          date: new Date(flow.date).toISOString()
        }));
      }

      function processCSVData(data) {
        return data.map(row => {
          const processed = {};
          Object.entries(row).forEach(([key, value]) => {
            if (typeof value === 'string' && !isNaN(value)) {
              processed[key] = parseFloat(value);
            } else if (key === 'date') {
              processed[key] = new Date(value).toISOString();
            } else {
              processed[key] = value;
            }
          });
          return processed;
        });
      }

      function validateFeature(feature) {
        if (!feature?.properties) return { isValid: false };
        
        const required = ['date', 'usdprice', 'price', 'conflict_intensity'];
        const hasRequired = required.every(field => 
          feature.properties[field] !== undefined
        );
        
        return { isValid: hasRequired };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
    };
  }

  async prefetch(key, dataPromise, processor) {
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.loading.has(key)) return this.loading.get(key);

    const promise = dataPromise
      .then(async (data) => {
        if (processor) {
          return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
              if (event.data.key === key) {
                if (event.data.error) {
                  reject(new Error(event.data.error));
                } else {
                  this.cache.set(key, event.data.processed);
                  resolve(event.data.processed);
                }
                this.worker.removeEventListener('message', handleMessage);
              }
            };

            this.worker.addEventListener('message', handleMessage);
            this.worker.postMessage({ type: processor, key, data });
          });
        }

        this.cache.set(key, data);
        return data;
      })
      .catch((error) => {
        console.error(`Error prefetching data for key "${key}":`, error);
        throw error;
      })
      .finally(() => {
        this.loading.delete(key);
      });

    this.loading.set(key, promise);
    return promise;
  }

  clear() {
    this.cache.clear();
    this.loading.clear();
    this.worker.terminate();
  }
}

// ===== enhancedDataFetcher.js =====

// src/utils/enhancedDataFetcher.js

/**
 * Configuration constants.
 */

/**
 * Manages caching of fetched data with expiration.
 */
class DataFetchCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Stores data in the cache with the current timestamp.
   *
   * @param {string} key - The unique key for the data.
   * @param {any} data - The data to cache.
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves data from the cache if it hasn't expired.
   *
   * @param {string} key - The unique key for the data.
   * @returns {any|null} The cached data or null if not found/expired.
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clears the entire cache.
   */
  clear() {
    this.cache.clear();
  }
}

const cache = new DataFetchCache();

/**
 * Fetches JSON or CSV data with caching and retry logic.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {Object} [options={}] - Fetch options.
 * @param {boolean} [options.useCache=true] - Whether to use cache.
 * @param {number} [options.retryAttempts=3] - Number of retry attempts.
 * @param {AbortSignal} [options.signal] - Abort signal for fetch.
 * @param {Object} [options.headers={}] - Additional headers.
 * @returns {Promise<any>} The fetched and parsed data.
 * @throws Will throw an error if all fetch attempts fail.
 */
export const enhancedFetchJson = async (url, options = {}) => {
  const {
    useCache = true,
    retryAttempts = RETRY_ATTEMPTS,
    signal,
    headers = {},
  } = options;

  const cacheKey = url + JSON.stringify(headers);

  // Check cache first
  if (useCache) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.debug(`Cache hit for ${url}`);
      return cachedData;
    }
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

      // Handle CSV data
      if (contentType && contentType.includes('text/csv')) {
        const text = await response.text();
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
              }
              if (useCache) {
                cache.set(cacheKey, results.data);
              }
              resolve(results.data);
            },
            error: (error) => reject(new Error(`CSV parsing failed: ${error.message}`)),
          });
        });
      }

      // Handle JSON data
      const data = await response.json();

      if (useCache) {
        cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') {
        throw error;
      }

      console.warn(`Attempt ${attempt + 1} failed for ${url}:`, error);

      if (attempt === retryAttempts - 1) {
        throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
      }
    }
  }

  throw lastError;
};

/**
 * Validates a GeoJSON feature's structure and data types.
 *
 * @param {Object} feature - The GeoJSON feature to validate.
 * @returns {Object} - Validation result with isValid flag and error message if any.
 */
export const validateFeature = (feature) => {
  if (!feature || !feature.properties) {
    return { isValid: false, error: 'Invalid feature structure' };
  }

  const { properties } = feature;
  const requiredFields = ['date', 'usdprice', 'price', 'conflict_intensity'];
  const missingFields = requiredFields.filter((field) => properties[field] === undefined);

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  // Validate numeric fields
  const numericFields = ['usdprice', 'price', 'conflict_intensity'];
  for (const field of numericFields) {
    const value = parseFloat(properties[field]);
    if (isNaN(value)) {
      return {
        isValid: false,
        error: `Invalid numeric value for ${field}`,
      };
    }
  }

  // Validate date
  if (isNaN(Date.parse(properties.date))) {
    return {
      isValid: false,
      error: 'Invalid date format',
    };
  }

  return { isValid: true };
};

/**
 * Processes and validates an array of GeoJSON features.
 *
 * @param {Array<Object>} features - The array of GeoJSON features.
 * @returns {Array<Object>} The processed and validated features.
 */
export const processFeatures = (features) => {
  return features
    .map((feature) => {
      const validation = validateFeature(feature);
      if (!validation.isValid) {
        console.warn('Invalid feature:', validation.error, feature);
        return null;
      }

      return {
        ...feature,
        properties: {
          ...feature.properties,
          usdprice: parseFloat(feature.properties.usdprice),
          price: parseFloat(feature.properties.price),
          conflict_intensity: parseFloat(feature.properties.conflict_intensity),
          date: new Date(feature.properties.date).toISOString(),
        },
      };
    })
    .filter(Boolean); // Remove invalid features
};

/**
 * Clears the data fetch cache.
 */
export const clearDataCache = () => {
  cache.clear();
};

/**
 * Fetches and validates GeoJSON data, optionally filtering by commodity.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {string} [selectedCommodity] - The commodity to filter data by.
 * @returns {Promise<Object>} The fetched and validated GeoJSON data.
 * @throws Will throw an error if fetching or processing fails.
 */
export const fetchAndValidateData = async (url, selectedCommodity) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Validate and filter features
    if (data?.features) {
      data.features = data.features.filter((feature) => {
        // Skip invalid features
        if (!feature?.properties?.commodity) return false;

        // If selectedCommodity is provided, filter by it
        if (selectedCommodity) {
          const featureCommodity = feature.properties.commodity.toLowerCase().trim();
          const selectedCommodityLower = selectedCommodity.toLowerCase().trim();
          return featureCommodity === selectedCommodityLower;
        }

        return true;
      });

      console.log(`Filtered to ${data.features.length} features for ${selectedCommodity}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};