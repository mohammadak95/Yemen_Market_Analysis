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
 * @param {string} fileName - Name of the file.
 * @returns {string} - Constructed data path.
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
        
        const requiredFields = ['date', 'usdprice', 'price', 'conflict_intensity'];
        const hasRequired = requiredFields.every(field => 
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

  /**
   * Prefetches data using the web worker for processing.
   * @param {string} key - Unique key for the data.
   * @param {Promise<any>} dataPromise - Promise resolving to the raw data.
   * @param {string} processor - Type of processor to use ('processGeoJSON', 'processFlowData', 'processCSV').
   * @returns {Promise<any>} - Processed data.
   */
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

  /**
   * Clears the cache and terminates the worker.
   */
  clear() {
    this.cache.clear();
    this.loading.clear();
    this.worker.terminate();
  }
}
