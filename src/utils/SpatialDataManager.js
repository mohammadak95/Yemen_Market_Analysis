// src/utils/spatialDataManager.js

import Papa from 'papaparse';
import LZString from 'lz-string';
import proj4 from 'proj4';
import { backgroundMonitor } from './backgroundMonitor';

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';

proj4.defs(
  UTM_ZONE_38N,
  '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs'
);

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

class SpatialDataManager {
  constructor() {
    this.cache = new Map();
    this.circuitBreakers = new Map();
    this.monitor = backgroundMonitor;
    this.config = {
      cache: { maxSize: 50, ttl: CACHE_DURATION, cleanupInterval: 300000 }, // 5 minutes
      circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 }, // 30 seconds
      retry: { maxAttempts: RETRY_ATTEMPTS, baseDelay: RETRY_DELAY },
    };
    this.geometryCache = new Map(); // Memoization cache for geometry transformations
    this.initializeCleanupInterval();
  }

  /**
   * Initializes the SpatialDataManager.
   * This method can perform any necessary setup tasks.
   */
  async initialize() {
    // Example initialization logic
    console.log('SpatialDataManager initialized');
    // If there are any asynchronous setup tasks, perform them here
    // For example, pre-fetch essential data or configurations
    return Promise.resolve();
  }

  initializeCleanupInterval() {
    setInterval(() => this.cleanupCache(), this.config.cache.cleanupInterval);
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.config.cache.ttl) {
      this.cache.delete(key);
      return null;
    }
    return cached.compressed
      ? JSON.parse(LZString.decompressFromUTF16(cached.data))
      : cached.data;
  }

  setCachedData(key, data) {
    const dataString = JSON.stringify(data);
    const shouldCompress = dataString.length > 100000; // Compress if data size > 100KB
    const cachedData = {
      data: shouldCompress
        ? LZString.compressToUTF16(dataString)
        : data,
      timestamp: Date.now(),
      compressed: shouldCompress,
    };
    this.cache.set(key, cachedData);
    this.enforceMaxCacheSize();
  }

  enforceMaxCacheSize() {
    while (this.cache.size > this.config.cache.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      console.log(`Cache entry removed due to size limit: ${oldestKey}`);
    }
  }

  getCircuitBreaker(key) {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        failures: 0,
        lastFailure: null,
        isOpen: false,
      });
    }
    return this.circuitBreakers.get(key);
  }

  async executeWithCircuitBreaker(key, operation) {
    const breaker = this.getCircuitBreaker(key);

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - (breaker.lastFailure || 0);
      if (timeSinceLastFailure > this.config.circuitBreaker.resetTimeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
        console.log(`Circuit breaker reset for key: ${key}`);
      } else {
        console.warn(
          `Circuit breaker open for ${key}, waiting ${
            (this.config.circuitBreaker.resetTimeout - timeSinceLastFailure) / 1000
          }s`
        );
        throw new Error(`Circuit breaker open for ${key}`);
      }
    }

    try {
      const result = await operation();
      breaker.failures = 0;
      breaker.isOpen = false;
      breaker.lastFailure = null;
      return result;
    } catch (error) {
      breaker.failures += 1;
      breaker.lastFailure = Date.now();

      console.warn(
        `Operation failed for key: ${key}. Failure count: ${breaker.failures}`
      );

      if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
        breaker.isOpen = true;
        this.monitor.logEvent('circuitBreakerOpened', {
          key,
          failures: breaker.failures,
          lastError: error.message,
        });
        console.warn(`Circuit breaker opened for key: ${key}`);
      }

      throw error;
    }
  }

  async fetchData(paths) {
    const fetchMetric = this.monitor.startMetric('fetch-spatial-data');

    try {
      const dataKeys = Object.keys(paths);
      const fetchPromises = dataKeys.map((key) => {
        const isCsv = key === 'flowMaps'; // Assuming flowMaps data is CSV
        return this.fetchWithRetry(paths[key], isCsv);
      });

      const results = await Promise.all(fetchPromises);

      // Map the results back to the respective keys
      const data = {};
      dataKeys.forEach((key, index) => {
        data[key] = results[index];
      });

      fetchMetric.finish({ status: 'success' });

      return data;
    } catch (error) {
      fetchMetric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  async fetchWithRetry(url, isCsv = false, attempts = 0) {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      if (isCsv) {
        const text = await response.text();
        const parsedData = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        }).data;
        return parsedData;
      }

      return await response.json();
    } catch (error) {
      if (attempts < this.config.retry.maxAttempts - 1) {
        const delay = this.config.retry.baseDelay * Math.pow(2, attempts);
        console.warn(
          `Fetch attempt ${attempts + 1} for ${url} failed. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, isCsv, attempts + 1);
      }
      console.error(
        `Failed to fetch ${url} after ${this.config.retry.maxAttempts} attempts.`
      );
      throw error;
    }
  }

  coordinatesInWGS84(coords) {
    if (!Array.isArray(coords)) return false;
    const [lng, lat] = coords;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  transformCoordinates([x, y], sourceCRS = UTM_ZONE_38N) {
    try {
      const cacheKey = `${x},${y}`;
      if (this.geometryCache.has(cacheKey)) {
        return this.geometryCache.get(cacheKey);
      }

      let transformedCoords;
      if (this.coordinatesInWGS84([x, y])) {
        transformedCoords = [x, y];
      } else {
        transformedCoords = proj4(sourceCRS, WGS84, [x, y]);
      }

      this.geometryCache.set(cacheKey, transformedCoords);
      return transformedCoords;
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      this.monitor.logError('coordinate-transform-error', { error, x, y });
      return [x, y];
    }
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cache.ttl) {
        this.cache.delete(key);
        console.log(`Cache entry expired and removed: ${key}`);
      }
    }

    // Clear geometry cache periodically
    this.geometryCache.clear();
  }

  destroy() {
    this.cache.clear();
    this.circuitBreakers.clear();
    this.geometryCache.clear();
    console.log('SpatialDataManager destroyed and caches cleared.');
  }
}

export const spatialDataManager = new SpatialDataManager();