// src/utils/PrecomputedDataManager.js

import { spatialDataMerger } from './spatialDataMerger';
import { getDataPath } from './dataUtils';
import { backgroundMonitor } from './backgroundMonitor';
import JSON5 from 'json5';

class PrecomputedDataManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this._isInitialized = false;
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async initialize() {
    if (this._isInitialized) return;
    this._isInitialized = true;
    // Additional initialization logic if needed
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  setCachedData(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async processSpatialData(selectedCommodity, selectedDate) {
    const cacheKey = `precomputed_${selectedCommodity?.toLowerCase()}_${selectedDate}`;
    const metric = backgroundMonitor.startMetric('precomputed-process-spatial-data');

    // Check cache
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      metric.finish({ status: 'success', source: 'cache' });
      return cachedData;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const pendingPromise = (async () => {
      try {
        const sanitizedCommodity = this.sanitizeCommodity(selectedCommodity);
        const dataPath = getDataPath(`preprocessed_by_commodity/preprocessed_yemen_market_data_${sanitizedCommodity}.json`);

        // Load data with retry
        const rawData = await this.loadDataWithRetry(dataPath);

        // Validate data structure
        if (!this.validateDataStructure(rawData)) {
          throw new Error('Invalid preprocessed data structure');
        }

        // Merge data
        const processedData = await spatialDataMerger.mergeData(rawData, selectedCommodity, selectedDate);

        // Validate processed data
        if (!this.validateProcessedData(processedData)) {
          throw new Error('Processed data failed validation');
        }

        // Cache the processed data
        this.setCachedData(cacheKey, processedData);
        metric.finish({ status: 'success', source: 'processed' });

        return processedData;
      } catch (error) {
        metric.finish({ status: 'error', error: error.message });
        throw error;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, pendingPromise);
    return pendingPromise;
  }

  sanitizeCommodity(commodity) {
    return commodity
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/\//g, '_')
      .replace(/__+/g, '_')
      .replace(/_+/g, '_')
      .trim();
  }

  async loadDataWithRetry(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const text = await response.text();
        const data = JSON5.parse(text); // Use JSON5 to parse JSON with NaN values

        return data;
      } catch (error) {
        if (attempt === retries) {
          console.error(`Failed to fetch ${url} after ${retries} attempts.`, error);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  validateDataStructure(data) {
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray(data.time_series_data) ||
      !Array.isArray(data.market_shocks) ||
      !Array.isArray(data.market_clusters) ||
      !Array.isArray(data.flow_analysis) ||
      !data.spatial_autocorrelation ||
      !data.metadata
    ) {
      console.error('[PrecomputedDataManager] Invalid data structure:', data);
      return false;
    }
    return true;
  }

  validateProcessedData(data) {
    if (
      !data ||
      typeof data !== 'object' ||
      !data.geoData ||
      !Array.isArray(data.geoData.features)
    ) {
      console.error('[PrecomputedDataManager] Invalid processed data:', data);
      return false;
    }
    return true;
  }

  destroy() {
    this.cache.clear();
    this.pendingRequests.clear();
    this._isInitialized = false;
  }
}

export const precomputedDataManager = new PrecomputedDataManager();