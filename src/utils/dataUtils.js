import { pathResolver } from './pathResolver';

// Environment Constants
const ENV = process.env.NODE_ENV;
const BASE_URL = process.env.PUBLIC_URL || '';
const isDev = ENV === 'development';
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
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/^\/+/, '/')
    .trim();
};

export const getDataPath = (fileName = '') => {
  // Determine base path based on environment and file type
  const basePath = isDev 
    ? '/results' 
    : `${BASE_URL}/data`;

  // Handle preprocessed data files
  if (fileName.includes('preprocessed_')) {
    const subDir = 'preprocessed_by_commodity';
    return cleanPath(`${isDev ? `/results/${subDir}` : `${BASE_URL}/data/${subDir}`}/${fileName}`);
  }

  // Handle standard data files
  return cleanPath(`${basePath}/${fileName}`);
};

export const fetchWithRetry = async (url, options = {}, retries = RETRY_ATTEMPTS) => {
  const tryPaths = async (paths) => {
    for (const path of paths) {
      try {
        const response = await fetch(path, {
          ...options,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': isDev ? 'no-cache' : 'max-age=3600',
            ...options.headers
          }
        });
        
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${path}:`, error);
      }
    }
    return null;
  };

  // Generate fallback paths
  const paths = [url];
  if (isDev) {
    if (url.includes('/data/')) {
      paths.push(url.replace('/data/', '/results/'));
    } else if (url.includes('/results/')) {
      paths.push(url.replace('/results/', '/data/'));
    }
  }

  // Implement retry logic with exponential backoff
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await tryPaths(paths);
    if (response) return response;

    if (attempt < retries - 1) {
      const delay = Math.min(RETRY_INITIAL_DELAY * Math.pow(2, attempt), RETRY_MAX_DELAY);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to fetch from paths after ${retries} attempts: ${paths.join(', ')}`);
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

    const text = await response.text();
    // Handle empty responses
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error(`Invalid JSON response from ${url}`);
    }
  } catch (error) {
    console.error('[DataUtils] Failed to fetch:', { url, error: error.message });
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

export const fetchAndValidateData = async (url, selectedCommodity) => {
  try {
    const cacheKey = `${url}_${selectedCommodity || ''}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    const data = await enhancedFetchJson(url);
    if (!data) return null;

    // Validate and filter features
    if (data.features) {
      data.features = data.features.filter(feature => {
        if (!feature?.properties?.commodity) return false;
        if (selectedCommodity) {
          return feature.properties.commodity.toLowerCase().trim() === 
                 selectedCommodity.toLowerCase().trim();
        }
        return true;
      });
    }

    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching and validating data:', error);
    throw error;
  }
};

export const retryWithBackoff = async (fn, options = {}) => {
  const { 
    maxRetries = RETRY_ATTEMPTS, 
    initialDelay = RETRY_INITIAL_DELAY, 
    maxDelay = RETRY_MAX_DELAY,
    onRetry = null
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      if (onRetry) onRetry(attempt, delay, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export const clearDataCache = () => {
  cache.clear();
};

export const validateDataResponse = (data, schema = null) => {
  if (!data) return false;
  if (schema) {
    // Add schema validation if needed
    return true;
  }
  return true;
};