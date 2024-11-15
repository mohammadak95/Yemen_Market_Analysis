// src/utils/PrecomputedDataManager.js

import Papa from 'papaparse';
import { backgroundMonitor } from './backgroundMonitor';
import { spatialValidation } from './spatialValidation';
import { spatialDebugUtils } from './spatialDebugUtils';
import { regionMapping, excludedRegions } from './appUtils';
import { getDataPath, CACHE_DURATION, RETRY_ATTEMPTS, RETRY_DELAY } from './dataUtils';
import _ from 'lodash';

class PrecomputedDataManager {
  constructor() {
    this._isInitialized = false;
    this._cacheInitialized = false;
    
    // Use Maps for better memory management
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.geometryCache = new Map();
    
    // Configuration using imported constants
    this.config = {
      cache: { 
        maxSize: 50, 
        ttl: CACHE_DURATION,
        cleanupInterval: CACHE_DURATION / 6 
      },
      retry: { 
        maxAttempts: RETRY_ATTEMPTS, 
        baseDelay: RETRY_DELAY 
      }
    };

    // Define data paths
    this.dataPaths = {
      preprocessedBase: getDataPath('preprocessed_by_commodity'),
      spatialAnalysis: getDataPath('spatial_analysis_results.json'),
      spatialWeights: getDataPath('transformed_spatial_weights.json'),
      geoBoundaries: getDataPath('geoBoundaries-YEM-ADM1.geojson'),
      enhancedUnified: getDataPath('enhanced_unified_data_with_residual.geojson'),
      getPreprocessedPath: (commodity) => {
        const sanitizedCommodity = this.sanitizeCommodityName(commodity);
        return getDataPath(`preprocessed_by_commodity/preprocessed_yemen_market_data_${sanitizedCommodity}.json`);
      }
    };

    if (process.env.NODE_ENV === 'development') {
      spatialDebugUtils.enableDebug();
    }

    // Add memory monitoring
    this.memoryMonitor = {
      lastCheck: Date.now(),
      checkInterval: 60000, // 1 minute
      warningThreshold: 0.8 // 80% of available heap
    };
  }

  async initialize() {
    if (this._isInitialized) return;

    const metric = backgroundMonitor.startMetric('initialize-precomputed-manager');
    
    try {
      // Clear existing caches
      this.cache.clear();
      this.pendingRequests.clear();
      this.geometryCache.clear();

      // Start cleanup interval
      this.initializeCleanupInterval();
      
      this._isInitialized = true;
      this._cacheInitialized = true;
      
      metric.finish({ status: 'success' });
      
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw new Error(`Failed to initialize PrecomputedDataManager: ${error.message}`);
    }
  }

  buildRegionIndex(preprocessedData) {
    const regionIndex = new Map();
    
    // Extract region names from time series data
    preprocessedData.time_series_data.forEach(entry => {
      const normalizedRegion = this.normalizeRegionName(entry.region);
      if (normalizedRegion) {
        regionIndex.set(entry.region, normalizedRegion);
      }
    });
    
    // Extract region names from market clusters
    preprocessedData.market_clusters.forEach(cluster => {
      const normalizedMainMarket = this.normalizeRegionName(cluster.main_market);
      if (normalizedMainMarket) {
        regionIndex.set(cluster.main_market, normalizedMainMarket);
      }
      cluster.connected_markets.forEach(market => {
        const normalizedMarket = this.normalizeRegionName(market);
        if (normalizedMarket) {
          regionIndex.set(market, normalizedMarket);
        }
      });
    });
    
    // Extract region names from flow analysis
    preprocessedData.flow_analysis.forEach(flow => {
      const normalizedSource = this.normalizeRegionName(flow.source);
      const normalizedTarget = this.normalizeRegionName(flow.target);
      if (normalizedSource) {
        regionIndex.set(flow.source, normalizedSource);
      }
      if (normalizedTarget) {
        regionIndex.set(flow.target, normalizedTarget);
      }
    });
    
    return regionIndex;
  }

  normalizeRegionName(regionId) {
    if (!regionId) return null;
    
    const normalized = regionId.toLowerCase()
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

  async loadFile(path, options = {}) {
    const metric = backgroundMonitor.startMetric('load-file');
    const { retryAttempts = this.config.retry.maxAttempts } = options;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
        }
        const data = await response.text();
        metric.finish({ status: 'success' });
        return data;
      } catch (error) {
        if (attempt === retryAttempts) {
          metric.finish({ status: 'error', error: error.message });
          throw new Error(`Failed to load file ${path} after ${retryAttempts} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, this.config.retry.baseDelay * attempt));
      }
    }
  }

  async loadFileWithRetry(path, options = {}) {
    const metric = backgroundMonitor.startMetric('load-file');
    const { retryAttempts = this.config.retry.maxAttempts } = options;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
        }
        const data = await response.text();
        metric.finish({ status: 'success' });
        return data;
      } catch (error) {
        if (attempt === retryAttempts) {
          metric.finish({ status: 'error', error: error.message });
          throw new Error(`Failed to load file ${path} after ${retryAttempts} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, this.config.retry.baseDelay * attempt));
      }
    }
  }

  async loadAndProcessData(commodity, date) {
    const cacheKey = `${commodity}_${date || 'latest'}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }
  
    const metric = backgroundMonitor.startMetric('load-precomputed-data');
    
    try {
      const [
        preprocessedData,
        spatialAnalysis,
        spatialWeights,
        geoBoundaries
      ] = await Promise.all([
        this.loadFileWithRetry(this.dataPaths.getPreprocessedPath(commodity)),
        this.loadFileWithRetry(this.dataPaths.spatialAnalysis),
        this.loadFileWithRetry(this.dataPaths.spatialWeights),
        this.loadFileWithRetry(this.dataPaths.geoBoundaries)
      ]);
  
      const result = await this.processDataParallel(
        preprocessedData,
        spatialAnalysis,
        spatialWeights,
        geoBoundaries,
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

  async processDataParallel(preprocessedData, spatialAnalysis, spatialWeights, geoBoundaries, date) {
    const regionIndex = this.buildRegionIndex(preprocessedData);
    
    const [
      timeSeriesData,
      marketClusters,
      flowAnalysis,
      spatialMetrics,
      geoData
    ] = await Promise.all([
      this.processTimeSeries(preprocessedData.time_series_data, regionIndex, date),
      this.processMarketClusters(preprocessedData.market_clusters, regionIndex),
      this.processFlowAnalysis(preprocessedData.flow_analysis, regionIndex),
      this.processSpatialMetrics(preprocessedData.spatial_autocorrelation, regionIndex),
      this.processGeometryData(geoBoundaries, regionIndex)
    ]);

    return {
      timeSeriesData,
      marketClusters,
      flowAnalysis,
      spatialMetrics,
      geoData
    };
  }

  async processGeometryData(geoData, regionIndex) {
    const metric = backgroundMonitor.startMetric('process-geometry');
    
    try {
      // Process features with normalized regions
      const features = geoData.features
        .filter(feature => {
          const regionId = feature.properties?.shapeName;
          return regionId && regionIndex.has(regionId);
        })
        .map(feature => ({
          ...feature,
          properties: {
            ...feature.properties,
            region_id: regionIndex.get(feature.properties.shapeName)
          }
        }));

      return {
        type: 'FeatureCollection',
        features
      };

    } finally {
      metric.finish();
    }
  }

  processTimeSeries(timeSeriesData, regionIndex, date) {
    return timeSeriesData
      .filter(entry => {
        if (!regionIndex.has(entry.region)) return false;
        if (date && entry.month > date) return false;
        return true;
      })
      .map(entry => ({
        ...entry,
        region: regionIndex.get(entry.region),
        month: entry.month,
        avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
        volatility: this.cleanNumber(entry.volatility),
        garch_volatility: this.cleanNumber(entry.garch_volatility),
        conflict_intensity: this.cleanNumber(entry.conflict_intensity),
        price_stability: this.cleanNumber(entry.price_stability)
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }

  processMarketClusters(clusters, regionIndex) {
    return clusters
      .filter(cluster => {
        const mainMarket = regionIndex.has(cluster.main_market);
        const connectedValid = cluster.connected_markets
          .every(market => regionIndex.has(market));
        return mainMarket && connectedValid;
      })
      .map(cluster => ({
        cluster_id: cluster.cluster_id,
        main_market: regionIndex.get(cluster.main_market),
        connected_markets: cluster.connected_markets
          .map(market => regionIndex.get(market))
          .filter(Boolean),
        market_count: cluster.market_count,
        efficiency: this.calculateClusterEfficiency(cluster)
      }));
  }

  processFlowAnalysis(flows, regionIndex) {
    return flows
      .filter(flow => 
        regionIndex.has(flow.source) && regionIndex.has(flow.target)
      )
      .map(flow => ({
        source: regionIndex.get(flow.source),
        target: regionIndex.get(flow.target),
        total_flow: this.cleanNumber(flow.total_flow),
        avg_flow: this.cleanNumber(flow.avg_flow),
        flow_count: flow.flow_count,
        avg_price_differential: this.cleanNumber(flow.avg_price_differential)
      }));
  }

  processSpatialMetrics(metrics, regionIndex) {
    if (!metrics?.global) return null;

    return {
      global: {
        moran_i: this.cleanNumber(metrics.global.moran_i),
        p_value: this.cleanNumber(metrics.global.p_value),
        significance: metrics.global.significance === 'True'
      },
      local: _.pickBy(metrics.local, (_, region) => regionIndex.has(region)),
      hotspots: _.pickBy(metrics.hotspots, (_, region) => regionIndex.has(region))
    };
  }

  async validateData(data) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      coverage: {},
      qualityMetrics: {}
    };

    try {
      // Validate data structure
      if (!this.validateDataStructure(data)) {
        validationResults.isValid = false;
        validationResults.errors.push('Invalid data structure');
        return validationResults;
      }

      // Calculate coverage and consistency
      const coverage = await this.calculateDataCoverage(data);
      validationResults.coverage = coverage;

      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(data);
      validationResults.qualityMetrics = qualityMetrics;

      // Generate warnings based on thresholds
      this.generateWarnings(coverage, qualityMetrics, validationResults);

      return validationResults;
    } catch (error) {
      validationResults.isValid = false;
      validationResults.errors.push(`Validation error: ${error.message}`);
      return validationResults;
    }
  }

  calculateQualityMetrics(data) {
    return {
      timeSeriesCompleteness: this.calculateTimeSeriesCompleteness(data.timeSeriesData),
      spatialCoverage: this.calculateSpatialCoverage(data),
      dataConsistency: this.checkDataConsistency(data),
      outlierMetrics: this.detectOutliers(data)
    };
  }

  async validateData(data) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      coverage: {}
    };

    // Extract unique regions from each dataset
    const timeSeriesRegions = new Set(data.timeSeriesData.map(d => d.region));
    const clusterRegions = new Set();
    data.marketClusters.forEach(cluster => {
      clusterRegions.add(cluster.main_market);
      cluster.connected_markets.forEach(m => clusterRegions.add(m));
    });
    const flowRegions = new Set([
      ...data.flowAnalysis.map(f => f.source),
      ...data.flowAnalysis.map(f => f.target)
    ]);

    // Calculate coverage
    const allRegions = new Set([
      ...timeSeriesRegions,
      ...clusterRegions,
      ...flowRegions
    ]);

    validationResults.coverage = {
      timeSeries: timeSeriesRegions.size / allRegions.size,
      clusters: clusterRegions.size / allRegions.size,
      flows: flowRegions.size / allRegions.size
    };

    // Validate cross-dataset consistency
    allRegions.forEach(region => {
      if (!timeSeriesRegions.has(region)) {
        validationResults.warnings.push(
          `Region ${region} missing from time series data`
        );
      }
      if (!clusterRegions.has(region)) {
        validationResults.warnings.push(
          `Region ${region} missing from market clusters`
        );
      }
    });

    return validationResults;
  }

  calculateClusterEfficiency(cluster) {
    return {
      internal_connectivity: this.cleanNumber(cluster.internal_connectivity),
      market_coverage: this.cleanNumber(cluster.market_coverage),
      price_convergence: this.cleanNumber(cluster.price_convergence),
      stability: this.cleanNumber(cluster.stability),
      efficiency_score: this.cleanNumber(cluster.efficiency_score)
    };
  }

  sanitizeCommodityName(commodity) {
    return commodity
      .replace(/\s+/g, '_')
      .replace(/[\(\)]/g, '')
      .replace(/\//g, '_')
      .toLowerCase();
  }

  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string' && value.toLowerCase() === 'nan') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  // Cache management
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    if (age > this.config.cache.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access time for LRU implementation
    cached.lastAccessed = now;
    return cached.data;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.enforceMaxCacheSize();
  }

  enforceMaxCacheSize() {
    if (this.cache.size <= this.config.cache.maxSize) return;
    
    // Sort by last accessed time
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest accessed entries
    while (this.cache.size > this.config.cache.maxSize) {
      const [oldestKey] = entries.shift();
      this.cache.delete(oldestKey);
    }
  }

  initializeCleanupInterval() {
    if (this._cleanupIntervalId) {
      clearInterval(this._cleanupIntervalId);
    }

    this._cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.config.cache.ttl) {
          this.cache.delete(key);
        }
      }
    }, this.config.cache.cleanupInterval);
  }

  async monitorMemoryUsage() {
    if (!performance?.memory) return;
    
    const now = Date.now();
    if (now - this.memoryMonitor.lastCheck < this.memoryMonitor.checkInterval) return;
    
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usage = usedJSHeapSize / jsHeapSizeLimit;
    
    if (usage > this.memoryMonitor.warningThreshold) {
      spatialDebugUtils.warn('High memory usage detected', { usage: usage.toFixed(2) });
      this.clearUnusedCache();
    }
    
    this.memoryMonitor.lastCheck = now;
  }

  clearUnusedCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (!value.lastAccessed || now - value.lastAccessed > this.config.cache.ttl / 2) {
        this.cache.delete(key);
      }
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

// Create and export singleton instance
export const precomputedDataManager = new PrecomputedDataManager();