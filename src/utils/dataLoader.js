import { workerManager } from './workerManager';
import { backgroundMonitor } from './backgroundMonitor';

class DataLoader {
  constructor() {
    this.cache = new Map();
    this.pendingLoads = new Map();
    this.cacheConfig = {
      TTL: 3600000, // 1 hour
      maxSize: 100
    };
  }

  async loadSpatialData(commodity, date, options = {}) {
    const cacheKey = `spatial_${commodity}_${date || 'all'}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached && !options.forceRefresh) {
      return cached;
    }

    // Deduplicate concurrent requests
    if (this.pendingLoads.has(cacheKey)) {
      return this.pendingLoads.get(cacheKey);
    }

    const loadPromise = this._loadSpatialDataInternal(commodity, date, options);
    this.pendingLoads.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      this.setCache(cacheKey, result);
      return result;
    } finally {
      this.pendingLoads.delete(cacheKey);
    }
  }

  async _loadSpatialDataInternal(commodity, date, options) {
    const metric = backgroundMonitor.startMetric('spatial-data-load');
    
    try {
      // Load base data
      const baseData = await this._fetchSpatialData(commodity);

      // Process data in parallel using Web Workers
      const [
        flowMetrics,
        timeSeriesData,
        clusterMetrics,
        marketMetrics
      ] = await Promise.all([
        workerManager.processData('processFlowData', baseData.flows, { date }),
        workerManager.processData('processTimeSeriesData', baseData.timeSeriesData),
        workerManager.processData('processMarketClusters', baseData.marketClusters, { date }),
        workerManager.processData('processMarketMetrics', {
          timeSeriesData: baseData.timeSeriesData,
          marketClusters: baseData.marketClusters
        })
      ]);

      const result = {
        flowMaps: flowMetrics.flows,
        flowMetrics: flowMetrics.metrics,
        timeSeriesData,
        marketClusters: clusterMetrics.clusters,
        clusterMetrics: clusterMetrics.metrics,
        marketMetrics,
        marketShocks: baseData.marketShocks,
        spatialAutocorrelation: baseData.spatialAutocorrelation,
        metadata: {
          commodity,
          date: date || 'all',
          timestamp: new Date().toISOString(),
          computationTime: Date.now() - metric.startTime
        }
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  async loadRegressionData(commodity) {
    const cacheKey = `regression_${commodity}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Deduplicate concurrent requests
    if (this.pendingLoads.has(cacheKey)) {
      return this.pendingLoads.get(cacheKey);
    }

    const loadPromise = this._loadRegressionDataInternal(commodity);
    this.pendingLoads.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      this.setCache(cacheKey, result);
      return result;
    } finally {
      this.pendingLoads.delete(cacheKey);
    }
  }

  async _loadRegressionDataInternal(commodity) {
    const metric = backgroundMonitor.startMetric('regression-data-load');
    
    try {
      const response = await fetch(this._getRegressionDataPath(commodity));
      if (!response.ok) {
        throw new Error(`Failed to load regression data: ${response.statusText}`);
      }

      const data = await response.json();
      metric.finish({ status: 'success' });
      return data;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheConfig.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Path helpers
  _getSpatialDataPath(commodity) {
    const isDev = process.env.NODE_ENV === 'development';
    const base = isDev ? '/results' : '/data';
    return `${base}/preprocessed_by_commodity/preprocessed_yemen_market_data_${commodity}.json`;
  }

  _getRegressionDataPath(commodity) {
    const isDev = process.env.NODE_ENV === 'development';
    const base = isDev ? '/results' : '/data';
    return `${base}/spatial_analysis_results.json`;
  }

  async _fetchSpatialData(commodity) {
    const response = await fetch(this._getSpatialDataPath(commodity));
    if (!response.ok) {
      throw new Error(`Failed to load spatial data: ${response.statusText}`);
    }
    return response.json();
  }
}

export const dataLoader = new DataLoader();
