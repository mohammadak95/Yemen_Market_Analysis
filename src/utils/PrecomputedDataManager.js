import { dataLoadingMonitor } from './dataMonitoring';
import { getDataPath } from './dataUtils';
import { spatialDataMerger } from './spatialDataMerger';
import { backgroundMonitor } from './backgroundMonitor';

export class PrecomputedDataManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this._isInitialized = false;
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this._cacheInitialized = false;
  }

  /**
   * Initialize the PrecomputedDataManager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._isInitialized) return;

    try {
      const metric = backgroundMonitor.startMetric('initialize-precomputed-manager');
      
      // Initialize background monitor
      backgroundMonitor.init();

      // Load initial geometries
      await this.loadGeometries();

      this._isInitialized = true;
      this._cacheInitialized = true;
      
      metric.finish({ status: 'success' });
      console.log('PrecomputedDataManager initialized');
    } catch (error) {
      console.error('Failed to initialize PrecomputedDataManager:', error);
      this._cacheInitialized = false;
      throw error;
    }
  }

  /**
   * Check if cache is initialized
   */
  isCacheInitialized() {
    return this._cacheInitialized;
  }

  /**
   * Check if manager is initialized
   */
  isInitialized() {
    return this._isInitialized;
  }

  /**
   * Process spatial data
   */
  async processSpatialData(selectedCommodity, selectedDate, options = {}) {
    if (!this._isInitialized) {
      await this.initialize();
    }

    const metric = backgroundMonitor.startMetric('process-spatial-data');
    const sanitizedCommodity = this.sanitizeCommodityName(selectedCommodity);
    const cacheKey = `spatial_${sanitizedCommodity}_${selectedDate}`;

    try {
      // Check cache
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        metric.finish({ status: 'success', source: 'cache' });
        return cachedData;
      }

      // Check pending requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
      }

      // Load and process data
      const filePath = getDataPath(`preprocessed_by_commodity/preprocessed_yemen_market_data_${sanitizedCommodity}.json`);
      const data = await this.loadDataWithRetry(filePath);

      if (!this.validateDataStructure(data)) {
        throw new Error('Invalid data structure');
      }

      const processedData = await spatialDataMerger.mergeData(data, selectedCommodity, selectedDate);
      
      // Cache the results
      this.setCachedData(cacheKey, processedData);
      
      metric.finish({ status: 'success' });
      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Load geometries data
   */
  async loadGeometries() {
    return spatialDataMerger.loadGeometries();
  }

  /**
   * Helper methods
   */
  sanitizeCommodityName(commodity) {
    return commodity.toLowerCase()
      .replace(/[(),\s]+/g, '_')
      .replace(/_+$/, '');
  }

  validateDataStructure(data) {
    return !!(data.time_series_data && 
              data.market_clusters && 
              data.market_shocks);
  }

  async loadDataWithRetry(filePath, retries = 3) {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        lastError = error;
        if (i === retries - 1) break;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw lastError;
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
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    this._cacheInitialized = false;
  }

  destroy() {
    this.clearCache();
    this._isInitialized = false;
    this._cacheInitialized = false;
  }
}

export const precomputedDataManager = new PrecomputedDataManager();
export { loadGeometries } from './spatialDataMerger';