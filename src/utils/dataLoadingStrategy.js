// src/utils/dataLoadingStrategy.js

import LZString from 'lz-string';
import { getDataPath } from './dataUtils';
import { workerManager } from '../workers/enhancedWorkerSystem';
import { backgroundMonitor } from './backgroundMonitor';

class DataLoadingStrategy {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.CHUNK_SIZE = parseInt(process.env.REACT_APP_CHUNK_SIZE) || 1000;
    this.CACHE_DURATION = parseInt(process.env.REACT_APP_CACHE_DURATION) || 5 * 60 * 1000;
    this.COMPRESSION_THRESHOLD = 100 * 1024;
    this.MAX_CACHE_SIZE = 50 * 1024 * 1024;
    this.currentCacheSize = 0;
    this.metrics = [];
    this.worker = workerManager;
  }

  async loadData(url, options = {}) {
    const metric = backgroundMonitor.startMetric('data-load');
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    
    try {
      // Check cache first
      const cachedData = this.checkCache(cacheKey);
      if (cachedData) {
        metric.finish({ status: 'success', source: 'cache' });
        return cachedData;
      }

      // Prevent duplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
      }

      const requestPromise = this.fetchWithStrategy(url, options);
      this.pendingRequests.set(cacheKey, requestPromise);

      const data = await requestPromise;
      this.addToCache(cacheKey, data);
      
      metric.finish({ status: 'success', source: 'network' });
      return data;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      backgroundMonitor.logError('data-load-error', { url, error });
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async fetchWithStrategy(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json, application/geo+json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const isLargeFile = contentLength && parseInt(contentLength) > this.COMPRESSION_THRESHOLD;

    if (isLargeFile) {
      return this.handleLargeFile(response);
    }

    return this.processResponse(response, url);
  }

  async handleLargeFile(response) {
    try {
      const reader = response.body.getReader();
      const chunks = [];
      let totalSize = 0;
      let processedSize = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        totalSize += value.length;
        processedSize += value.length;

        // Report progress
        const progress = Math.round((processedSize / totalSize) * 100);
        this.worker.notifyStatusSubscribers({ type: 'progress', data: { progress } });
      }

      // Process chunks using worker
      const processedData = await this.worker.processGeoJSON({
        type: 'PROCESS_CHUNKS',
        data: chunks,
        chunkSize: this.CHUNK_SIZE
      });

      return processedData;
    } catch (error) {
      console.error('Error handling large file:', error);
      throw error;
    }
  }

  async processResponse(response, url) {
    const text = await response.text();
    const data = await this.parseData(text, url);
    
    // Process data using worker if needed
    if (data.features) {
      return this.worker.processGeoJSON({
        type: 'PROCESS_GEOJSON',
        data
      });
    }
    
    return data;
  }

  async parseData(text, url) {
    try {
      if (url.endsWith('.geojson')) {
        return JSON.parse(text);
      }
      return JSON.parse(text);
    } catch (error) {
      console.error('Error parsing data:', error);
      throw new Error(`Failed to parse data from ${url}: ${error.message}`);
    }
  }

  checkCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      this.currentCacheSize -= cached.size;
      return null;
    }

    return cached.compressed ? 
      JSON.parse(LZString.decompressFromUTF16(cached.data)) : 
      cached.data;
  }

  addToCache(key, data) {
    const serializedData = JSON.stringify(data);
    const size = new Blob([serializedData]).size;

    // Manage cache size
    while (this.currentCacheSize + size > this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      const oldEntry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.currentCacheSize -= oldEntry.size;
    }

    const shouldCompress = size > this.COMPRESSION_THRESHOLD;
    const cachedData = {
      data: shouldCompress ? LZString.compressToUTF16(serializedData) : data,
      size,
      timestamp: Date.now(),
      compressed: shouldCompress
    };

    this.cache.set(key, cachedData);
    this.currentCacheSize += size;
  }

  async maintenance() {
    const now = Date.now();
    
    // Clean up cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
      }
    }

    // Clean up old metrics
    if (this.metrics.length > 0) {
      const dayAgo = now - 24 * 60 * 60 * 1000;
      this.metrics = this.metrics.filter(metric => 
        new Date(metric.timestamp).getTime() > dayAgo
      );
    }

    // Report status
    backgroundMonitor.logMetric('data-loading-maintenance', {
      cacheSize: this.currentCacheSize,
      cacheEntries: this.cache.size,
      metricsCount: this.metrics.length
    });
  }

  recordMetrics(url, startTime, endTime, dataSize) {
    const metrics = {
      url,
      duration: endTime - startTime,
      dataSize,
      timestamp: new Date().toISOString(),
      cached: false
    };

    this.metrics.push(metrics);
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    backgroundMonitor.logMetric('data-load-complete', metrics);
    return metrics;
  }

  async preload(urls) {
    return Promise.all(
      urls.map(url => this.loadData(url).catch(error => {
        console.warn(`Failed to preload ${url}:`, error);
        backgroundMonitor.logError('preload-error', { url, error });
        return null;
      }))
    );
  }

  getStatus() {
    return {
      cacheSize: this.currentCacheSize,
      cacheEntries: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      metrics: this.getMetrics()
    };
  }

  getMetrics() {
    return [...this.metrics];
  }
}

export const dataLoadingStrategy = new DataLoadingStrategy();
export const preloadData = (urls) => dataLoadingStrategy.preload(urls);
export const clearDataCache = () => dataLoadingStrategy.clearCache();
export const getDataLoadingStatus = () => dataLoadingStrategy.getStatus();