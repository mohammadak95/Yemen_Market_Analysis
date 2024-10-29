// src/utils/enhancedDataFetcher.js

import Papa from 'papaparse';

const CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION) || 3600000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

class DataFetchCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
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
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/csv',
          ...headers
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
            error: (error) => reject(new Error(`CSV parsing failed: ${error}`))
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

      console.warn(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retryAttempts - 1) {
        throw new Error(`Failed to fetch data: ${error.message}`);
      }
    }
  }

  throw lastError;
};

// Feature validation helper
export const validateFeature = (feature) => {
  if (!feature || !feature.properties) {
    return { isValid: false, error: 'Invalid feature structure' };
  }

  const { properties } = feature;
  const requiredFields = ['date', 'usdprice', 'price', 'conflict_intensity'];
  const missingFields = requiredFields.filter(field => properties[field] === undefined);

  if (missingFields.length > 0) {
    return { 
      isValid: false, 
      error: `Missing required fields: ${missingFields.join(', ')}` 
    };
  }

  // Validate numeric fields
  const numericFields = ['usdprice', 'price', 'conflict_intensity'];
  for (const field of numericFields) {
    const value = parseFloat(properties[field]);
    if (isNaN(value)) {
      return { 
        isValid: false, 
        error: `Invalid numeric value for ${field}` 
      };
    }
  }

  // Validate date
  if (isNaN(Date.parse(properties.date))) {
    return { 
      isValid: false, 
      error: 'Invalid date format' 
    };
  }

  return { isValid: true };
};

// Process features with validation
export const processFeatures = (features) => {
  return features
    .map(feature => {
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
          date: new Date(feature.properties.date).toISOString()
        }
      };
    })
    .filter(Boolean); // Remove invalid features
};

export const clearDataCache = () => {
  cache.clear();
};

export const fetchAndValidateData = async (url, selectedCommodity) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate and filter features
    if (data?.features) {
      data.features = data.features.filter(feature => {
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