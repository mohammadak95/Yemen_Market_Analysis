// src/utils/PrecomputedDataManager.js

import { backgroundMonitor } from './backgroundMonitor';
import { getDataPath } from './dataUtils';
import { dataLoadingMonitor } from './dataMonitoring';

async function fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2;
      } else {
        throw error;
      }
    }
  }
}

class PrecomputedDataManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.isInitialized = false;
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      backgroundMonitor.init();
      this.isInitialized = true;
      console.log('PrecomputedDataManager initialized');
    } catch (error) {
      console.error('Failed to initialize PrecomputedDataManager:', error);
      throw error;
    }
  }

  async processSpatialData(selectedCommodity, selectedDate, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const metric = backgroundMonitor.startMetric('process-spatial-data');
    const cacheKey = `spatial_${selectedCommodity}_${selectedDate}`;

    try {
      // Check cache
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        metric.finish({ status: 'success', source: 'cache' });
        return cachedData;
      }

      // Prevent duplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
      }

      const requestPromise = this.loadAndProcessData(selectedCommodity, selectedDate);
      this.pendingRequests.set(cacheKey, requestPromise);

      const result = await requestPromise;
      this.setCachedData(cacheKey, result);

      metric.finish({ status: 'success', source: 'fetch' });
      return result;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async loadAndProcessData(commodity, date) {
    const metric = dataLoadingMonitor.startRequest('load-precomputed-data');
    
    try {
      const sanitizedCommodity = this.sanitizeCommodityName(commodity);
      const filePath = getDataPath(`preprocessed_by_commodity/preprocessed_yemen_market_data_${sanitizedCommodity}.json`);
      
      const data = await fetchWithRetry(filePath);
      const transformedData = this.transformPreprocessedData(data, date);
      
      dataLoadingMonitor.completeRequest(metric.id, transformedData);
      return transformedData;
    } catch (error) {
      dataLoadingMonitor.logError(metric.id, error);
      throw error;
    }
  }

  // Add helper method
  sanitizeCommodityName(commodity) {
    return commodity.toLowerCase()
      .replace(/[(),\s]+/g, '_')
      .replace(/_+$/, '');
  }

  transformPreprocessedData(data, targetDate) {
    return {
      geoData: this.extractGeoData(data, targetDate),
      marketClusters: data.market_clusters || [],
      detectedShocks: this.filterShocksByDate(data.market_shocks, targetDate),
      timeSeriesData: data.time_series_data || [],
      flowMaps: this.transformFlowData(data.flow_analysis),
      analysisResults: {
        spatialAutocorrelation: data.spatial_autocorrelation || {},
        metadata: data.metadata || {}
      }
    };
  }

  extractGeoData(data, targetDate) {
    const timeSeriesForDate = data.time_series_data?.find(d => 
      d.month.startsWith(targetDate)
    ) || null;

    const marketFeatures = {};
    
    data.market_clusters?.forEach(cluster => {
      marketFeatures[cluster.main_market] = {
        type: 'Feature',
        properties: {
          id: cluster.main_market,
          isMainMarket: true,
          clusterSize: cluster.market_count,
          marketRole: 'hub',
          priceData: timeSeriesForDate,
          cluster_id: cluster.cluster_id
        }
      };

      cluster.connected_markets.forEach(market => {
        if (!marketFeatures[market]) {
          marketFeatures[market] = {
            type: 'Feature',
            properties: {
              id: market,
              isMainMarket: false,
              clusterSize: cluster.market_count,
              marketRole: 'peripheral',
              priceData: timeSeriesForDate,
              cluster_id: cluster.cluster_id
            }
          };
        }
      });
    });

    return {
      type: 'FeatureCollection',
      features: Object.values(marketFeatures)
    };
  }

  filterShocksByDate(shocks, targetDate) {
    if (!Array.isArray(shocks) || !targetDate) return [];
    return shocks.filter(shock => shock.date.startsWith(targetDate));
  }

  transformFlowData(flows) {
    if (!Array.isArray(flows)) return [];
    return flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      flow_weight: flow.total_flow,
      avg_flow: flow.avg_flow,
      flow_count: flow.flow_count,
      price_differential: flow.avg_price_differential
    }));
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
  }

  destroy() {
    this.clearCache();
    this.isInitialized = false;
  }
}

export const precomputedDataManager = new PrecomputedDataManager();