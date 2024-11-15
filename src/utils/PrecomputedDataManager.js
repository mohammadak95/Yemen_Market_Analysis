// src/utils/PrecomputedDataManager.js


import { backgroundMonitor } from './backgroundMonitor';
import { spatialValidation } from './spatialValidation';
import { spatialDebugUtils } from './spatialDebugUtils';
import { regionMapping, excludedRegions } from './appUtils';
import { getDataPath, CACHE_DURATION, RETRY_ATTEMPTS, RETRY_DELAY } from './dataUtils';
import { loadData, getCommodityPath } from './getData';
import _ from 'lodash';

// Validation helper
const validatePath = (path) => {
  const errors = [];
  
  if (path.includes('//')) errors.push('Path contains double slashes');
  if ((path.match(/public/g) || []).length > 1) errors.push('Path contains multiple public prefixes');
  if ((path.match(/results/g) || []).length > 1) errors.push('Path contains multiple results prefixes');
  
  return { isValid: errors.length === 0, errors };
};

class PrecomputedDataManager {
  constructor() {
    this._isInitialized = false;
    this._cacheInitialized = false;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.geometryCache = new Map();

    this.config = {
      cache: {
        maxSize: 50,
        ttl: CACHE_DURATION,
        cleanupInterval: CACHE_DURATION / 6,
      },
      retry: {
        maxAttempts: RETRY_ATTEMPTS,
        baseDelay: RETRY_DELAY,
      },
    };

    // Use paths from getData
    this.dataPaths = {
      preprocessedBase: getDataPath('preprocessed_by_commodity'),
      spatialAnalysis: getDataPath('spatial_analysis_results.json'),
      spatialWeights: getDataPath('transformed_spatial_weights.json'),
      geoBoundaries: getDataPath('geoBoundaries-YEM-ADM1.geojson'),
      enhancedUnified: getDataPath('enhanced_unified_data_with_residual.geojson'),
    };

    if (process.env.NODE_ENV === 'development') {
      spatialDebugUtils.enableDebug();
    }

    this.memoryMonitor = {
      lastCheck: Date.now(),
      checkInterval: 60000,
      warningThreshold: 0.8,
    };

    this.initializeCleanupInterval();
  }

  async loadAndProcessData(commodity, date) {
    if (!commodity) {
      throw new Error('Commodity parameter is required');
    }

    const cacheKey = `${commodity}_${date || 'latest'}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    const metric = backgroundMonitor.startMetric('load-precomputed-data');

    try {
      // Use loadData from getData.js
      const rawData = await loadData(commodity, date);
      this.validatePreprocessedData(rawData.commodityData);

      const result = await this.processDataParallel(
        rawData.commodityData,
        rawData.spatialAnalysis,
        rawData.spatialWeights,
        rawData.geoBoundaries,
        date
      );

      this.setCachedData(cacheKey, result);
      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  async loadFileWithRetry(path, options = {}) {
    const metric = backgroundMonitor.startMetric('load-file');
    const { retryAttempts = this.config.retry.maxAttempts } = options;
  
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const cleanPath = path.replace(/\/+/g, '/');
        spatialDebugUtils.log(`Attempting to load file (attempt ${attempt}):`, cleanPath);
        
        const response = await fetch(cleanPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        metric.finish({ status: 'success', path: cleanPath });
        return data;

      } catch (error) {
        spatialDebugUtils.error(`Load attempt ${attempt} failed:`, error);

        if (attempt === retryAttempts) {
          metric.finish({ status: 'error', error: error.message, attempts: attempt });
          throw error;
        }

        const delay = this.config.retry.baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async loadData(commodity, date) {
    const metric = backgroundMonitor.startMetric('load-data');
    
    try {
      const paths = {
        commodityData: `${this.dataPaths.preprocessedBase}/preprocessed_yemen_market_data_${this.sanitizeCommodityName(commodity)}.json`,
        spatialAnalysis: this.dataPaths.spatialAnalysis,
        spatialWeights: this.dataPaths.spatialWeights,
        geoBoundaries: this.dataPaths.geoBoundaries,
        enhancedUnified: this.dataPaths.enhancedUnified
      };

      const results = await Promise.all(
        Object.entries(paths).map(async ([key, path]) => {
          const data = await this.loadFileWithRetry(path);
          return [key, data];
        })
      );

      const data = Object.fromEntries(results);
      metric.finish({ status: 'success' });
      return data;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  sanitizeCommodityName(commodity) {
    if (!commodity) return '';
    
    return commodity
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async loadAndProcessData(commodity, date) {
    if (!commodity) {
      throw new Error('Commodity parameter is required');
    }

    const cacheKey = `${commodity}_${date || 'latest'}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    const metric = backgroundMonitor.startMetric('load-precomputed-data');

    try {
      const rawData = await this.loadData(commodity, date);
      this.validatePreprocessedData(rawData.commodityData);

      const result = await this.processDataParallel(
        rawData.commodityData,
        rawData.spatialAnalysis,
        rawData.spatialWeights,
        rawData.geoBoundaries,
        date
      );

      this.setCachedData(cacheKey, result);
      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  validatePreprocessedData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format: expected object');
    }

    const requiredFields = [
      'time_series_data',
      'market_clusters',
      'flow_analysis',
      'spatial_autocorrelation'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return true;
  }

  buildRegionIndex(preprocessedData) {
    const regionIndex = new Map();

    if (preprocessedData.time_series_data) {
      preprocessedData.time_series_data.forEach((entry) => {
        const normalizedRegion = this.normalizeRegionName(entry.region);
        if (normalizedRegion) {
          regionIndex.set(entry.region, normalizedRegion);
        }
      });
    }

    if (preprocessedData.market_clusters) {
      preprocessedData.market_clusters.forEach((cluster) => {
        const normalizedMainMarket = this.normalizeRegionName(cluster.main_market);
        if (normalizedMainMarket) {
          regionIndex.set(cluster.main_market, normalizedMainMarket);
        }
        cluster.connected_markets.forEach((market) => {
          const normalizedMarket = this.normalizeRegionName(market);
          if (normalizedMarket) {
            regionIndex.set(market, normalizedMarket);
          }
        });
      });
    }

    if (preprocessedData.flow_analysis) {
      preprocessedData.flow_analysis.forEach((flow) => {
        const normalizedSource = this.normalizeRegionName(flow.source);
        const normalizedTarget = this.normalizeRegionName(flow.target);
        if (normalizedSource) {
          regionIndex.set(flow.source, normalizedSource);
        }
        if (normalizedTarget) {
          regionIndex.set(flow.target, normalizedTarget);
        }
      });
    }

    return regionIndex;
  }

  normalizeRegionName(regionId) {
    if (!regionId) return null;

    const normalized = regionId
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (regionMapping[normalized]) {
      return this.normalizeRegionName(regionMapping[normalized]);
    }

    if (excludedRegions.includes(normalized)) {
      return null;
    }

    return normalized;
  }

  async processDataParallel(preprocessedData, spatialAnalysis, spatialWeights, geoBoundaries, date) {
    const regionIndex = this.buildRegionIndex(preprocessedData);

    const [
      timeSeriesData,
      marketClusters,
      flowAnalysis,
      spatialMetrics,
      geoData,
    ] = await Promise.all([
      this.processTimeSeries(preprocessedData.time_series_data, regionIndex, date),
      this.processMarketClusters(preprocessedData.market_clusters, regionIndex),
      this.processFlowAnalysis(preprocessedData.flow_analysis, regionIndex),
      this.processSpatialMetrics(preprocessedData.spatial_autocorrelation, regionIndex),
      this.processGeometryData(geoBoundaries, regionIndex),
    ]);

    return {
      timeSeriesData,
      marketClusters,
      flowAnalysis,
      spatialMetrics,
      geoData,
    };
  }

  async processGeometryData(geoData, regionIndex) {
    const metric = backgroundMonitor.startMetric('process-geometry');

    try {
      const features = geoData.features
        .filter((feature) => {
          const regionId = feature.properties?.shapeName;
          const normalizedRegion = this.normalizeRegionName(regionId);
          return regionId && regionIndex.has(regionId) && normalizedRegion;
        })
        .map((feature) => {
          const regionId = feature.properties?.shapeName;
          const normalizedRegion = this.normalizeRegionName(regionId);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              region_id: normalizedRegion,
            },
          };
        });

      return {
        type: 'FeatureCollection',
        features,
      };
    } finally {
      metric.finish();
    }
  }

  processTimeSeries(timeSeriesData, regionIndex, date) {
    if (!timeSeriesData) return [];

    return timeSeriesData
      .filter((entry) => {
        if (!regionIndex.has(entry.region)) return false;
        if (date && entry.month > date) return false;
        return true;
      })
      .map((entry) => ({
        ...entry,
        region: regionIndex.get(entry.region),
        month: entry.month,
        avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
        volatility: this.cleanNumber(entry.volatility),
        garch_volatility: this.cleanNumber(entry.garch_volatility),
        conflict_intensity: this.cleanNumber(entry.conflict_intensity),
        price_stability: this.cleanNumber(entry.price_stability),
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }

  processMarketClusters(clusters, regionIndex) {
    if (!clusters) return [];

    return clusters
      .filter((cluster) => {
        const mainMarket = regionIndex.has(cluster.main_market);
        const connectedValid = cluster.connected_markets.every((market) => regionIndex.has(market));
        return mainMarket && connectedValid;
      })
      .map((cluster) => ({
        cluster_id: cluster.cluster_id,
        main_market: regionIndex.get(cluster.main_market),
        connected_markets: cluster.connected_markets
          .map((market) => regionIndex.get(market))
          .filter(Boolean),
        market_count: cluster.market_count,
        efficiency: this.calculateClusterEfficiency(cluster),
      }));
  }

  processFlowAnalysis(flows, regionIndex) {
    if (!flows) return [];

    return flows
      .filter((flow) => regionIndex.has(flow.source) && regionIndex.has(flow.target))
      .map((flow) => ({
        source: regionIndex.get(flow.source),
        target: regionIndex.get(flow.target),
        total_flow: this.cleanNumber(flow.total_flow),
        avg_flow: this.cleanNumber(flow.avg_flow),
        flow_count: flow.flow_count,
        avg_price_differential: this.cleanNumber(flow.avg_price_differential),
      }));
  }

  processSpatialMetrics(metrics, regionIndex) {
    if (!metrics?.global) return null;

    return {
      global: {
        moran_i: this.cleanNumber(metrics.global.moran_i),
        p_value: this.cleanNumber(metrics.global.p_value),
        significance: metrics.global.significance === 'True',
      },
      local: _.pickBy(metrics.local, (_, region) => regionIndex.has(region)),
      hotspots: _.pickBy(metrics.hotspots, (_, region) => regionIndex.has(region)),
    };
  }

  calculateClusterEfficiency(cluster) {
    return {
      internal_connectivity: this.cleanNumber(cluster.internal_connectivity),
      market_coverage: this.cleanNumber(cluster.market_coverage),
      price_convergence: this.cleanNumber(cluster.price_convergence),
      stability: this.cleanNumber(cluster.stability),
      efficiency_score: this.cleanNumber(cluster.efficiency_score),
    };
  }

  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string' && value.toLowerCase() === 'nan') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > this.config.cache.ttl) {
      this.cache.delete(key);
      return null;
    }

    cached.lastAccessed = now;
    return cached.data;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    });
    this.enforceMaxCacheSize();
  }

  async processDataParallel(preprocessedData, spatialAnalysis, spatialWeights, geoBoundaries, date) {
    const regionIndex = this.buildRegionIndex(preprocessedData);

    const [
      timeSeriesData,
      marketClusters,
      flowAnalysis,
      spatialMetrics,
      geoData,
    ] = await Promise.all([
      this.processTimeSeries(preprocessedData.time_series_data, regionIndex, date),
      this.processMarketClusters(preprocessedData.market_clusters, regionIndex),
      this.processFlowAnalysis(preprocessedData.flow_analysis, regionIndex),
      this.processSpatialMetrics(preprocessedData.spatial_autocorrelation, regionIndex),
      this.processGeometryData(geoBoundaries, regionIndex),
    ]);

    return {
      timeSeriesData,
      marketClusters,
      flowAnalysis,
      spatialMetrics,
      geoData,
    };
  }

  buildRegionIndex(preprocessedData) {
    const regionIndex = new Map();

    if (preprocessedData.time_series_data) {
      preprocessedData.time_series_data.forEach((entry) => {
        const normalizedRegion = this.normalizeRegionName(entry.region);
        if (normalizedRegion) {
          regionIndex.set(entry.region, normalizedRegion);
        }
      });
    }

    if (preprocessedData.market_clusters) {
      preprocessedData.market_clusters.forEach((cluster) => {
        const normalizedMainMarket = this.normalizeRegionName(cluster.main_market);
        if (normalizedMainMarket) {
          regionIndex.set(cluster.main_market, normalizedMainMarket);
        }
        cluster.connected_markets.forEach((market) => {
          const normalizedMarket = this.normalizeRegionName(market);
          if (normalizedMarket) {
            regionIndex.set(market, normalizedMarket);
          }
        });
      });
    }

    if (preprocessedData.flow_analysis) {
      preprocessedData.flow_analysis.forEach((flow) => {
        const normalizedSource = this.normalizeRegionName(flow.source);
        const normalizedTarget = this.normalizeRegionName(flow.target);
        if (normalizedSource) {
          regionIndex.set(flow.source, normalizedSource);
        }
        if (normalizedTarget) {
          regionIndex.set(flow.target, normalizedTarget);
        }
      });
    }

    return regionIndex;
  }

  normalizeRegionName(regionId) {
    if (!regionId) return null;

    const normalized = regionId
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (regionMapping[normalized]) {
      return this.normalizeRegionName(regionMapping[normalized]);
    }

    if (excludedRegions.includes(normalized)) {
      return null;
    }

    return normalized;
  }

  async processGeometryData(geoData, regionIndex) {
    const metric = backgroundMonitor.startMetric('process-geometry');

    try {
      const features = geoData.features
        .filter((feature) => {
          const regionId = feature.properties?.shapeName;
          const normalizedRegion = this.normalizeRegionName(regionId);
          return regionId && regionIndex.has(regionId) && normalizedRegion;
        })
        .map((feature) => {
          const regionId = feature.properties?.shapeName;
          const normalizedRegion = this.normalizeRegionName(regionId);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              region_id: normalizedRegion,
            },
          };
        });

      return {
        type: 'FeatureCollection',
        features,
      };
    } finally {
      metric.finish();
    }
  }

  processTimeSeries(timeSeriesData, regionIndex, date) {
    if (!timeSeriesData) return [];

    return timeSeriesData
      .filter((entry) => {
        if (!regionIndex.has(entry.region)) return false;
        if (date && entry.month > date) return false;
        return true;
      })
      .map((entry) => ({
        ...entry,
        region: regionIndex.get(entry.region),
        month: entry.month,
        avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
        volatility: this.cleanNumber(entry.volatility),
        garch_volatility: this.cleanNumber(entry.garch_volatility),
        conflict_intensity: this.cleanNumber(entry.conflict_intensity),
        price_stability: this.cleanNumber(entry.price_stability),
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }

  processMarketClusters(clusters, regionIndex) {
    if (!clusters) return [];

    return clusters
      .filter((cluster) => {
        const mainMarket = regionIndex.has(cluster.main_market);
        const connectedValid = cluster.connected_markets.every((market) => regionIndex.has(market));
        return mainMarket && connectedValid;
      })
      .map((cluster) => ({
        cluster_id: cluster.cluster_id,
        main_market: regionIndex.get(cluster.main_market),
        connected_markets: cluster.connected_markets
          .map((market) => regionIndex.get(market))
          .filter(Boolean),
        market_count: cluster.market_count,
        efficiency: this.calculateClusterEfficiency(cluster),
      }));
  }

  processFlowAnalysis(flows, regionIndex) {
    if (!flows) return [];

    return flows
      .filter((flow) => regionIndex.has(flow.source) && regionIndex.has(flow.target))
      .map((flow) => ({
        source: regionIndex.get(flow.source),
        target: regionIndex.get(flow.target),
        total_flow: this.cleanNumber(flow.total_flow),
        avg_flow: this.cleanNumber(flow.avg_flow),
        flow_count: flow.flow_count,
        avg_price_differential: this.cleanNumber(flow.avg_price_differential),
      }));
  }

  processSpatialMetrics(metrics, regionIndex) {
    if (!metrics?.global) return null;

    return {
      global: {
        moran_i: this.cleanNumber(metrics.global.moran_i),
        p_value: this.cleanNumber(metrics.global.p_value),
        significance: metrics.global.significance === 'True',
      },
      local: _.pickBy(metrics.local, (_, region) => regionIndex.has(region)),
      hotspots: _.pickBy(metrics.hotspots, (_, region) => regionIndex.has(region)),
    };
  }

  calculateClusterEfficiency(cluster) {
    return {
      internal_connectivity: this.cleanNumber(cluster.internal_connectivity),
      market_coverage: this.cleanNumber(cluster.market_coverage),
      price_convergence: this.cleanNumber(cluster.price_convergence),
      stability: this.cleanNumber(cluster.stability),
      efficiency_score: this.cleanNumber(cluster.efficiency_score),
    };
  }

  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string' && value.toLowerCase() === 'nan') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > this.config.cache.ttl) {
      this.cache.delete(key);
      return null;
    }

    cached.lastAccessed = now;
    return cached.data;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    });
    this.enforceMaxCacheSize();
  }

  enforceMaxCacheSize() {
    if (this.cache.size <= this.config.cache.maxSize) return;

    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    while (this.cache.size > this.config.cache.maxSize) {
      const [oldestKey] = entries.shift();
      this.cache.delete(oldestKey);
    }
  }

  destroy() {
    if (this._cleanupIntervalId) {
      clearInterval(this._cleanupIntervalId);
      this._cleanupIntervalId = null;
    }

    this.cache.clear();
    this.pendingRequests.clear();
    this.geometryCache.clear();

    this._isInitialized = false;
    this._cacheInitialized = false;
  }
}

// Create singleton instance
export const precomputedDataManager = new PrecomputedDataManager();