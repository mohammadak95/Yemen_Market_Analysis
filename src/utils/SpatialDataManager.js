// src/utils/SpatialDataManager.js

import Papa from 'papaparse';
import { parseISO, isValid } from 'date-fns';
import LZString from 'lz-string';
import proj4 from 'proj4';
import { createWorker, processDataWithWorker } from '../workers/workerLoader';
import { backgroundMonitor } from '../utils/backgroundMonitor';

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';
const YEMEN_TM = 'EPSG:2098';
proj4.defs(UTM_ZONE_38N, '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs');
proj4.defs(YEMEN_TM, '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs');

// Config
const CACHE_DURATION = 30 * 60 * 1000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// Normalize region names to ensure consistency
const normalizeRegionName = (regionName) => {
  if (!regionName) return '';
  return regionName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['']/g, '').replace(/[\s-]+/g, '_').trim();
};

// Validate spatial weights data structure
const validateSpatialWeights = (weights) => {
  const errors = [];
  if (!weights || typeof weights !== 'object') return { isValid: false, errors: ['Invalid structure'] };
  Object.entries(weights).forEach(([region, data]) => {
    if (!data.neighbors?.every(neighbor => typeof neighbor === 'string' && weights[neighbor])) {
      errors.push(`Invalid neighbors for region ${region}`);
    }
  });
  return { isValid: errors.length === 0, errors };
};

// Get data path based on environment
const getDataPath = (fileName) => {
  const PUBLIC_URL = process.env.PUBLIC_URL || '';
  const isGitHubPages = PUBLIC_URL.includes('github.io');
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  let basePath = isOffline ? '/results' :
                 isGitHubPages ? `${PUBLIC_URL}/results` :
                 process.env.NODE_ENV === 'production' ? '/Yemen_Market_Analysis/results' : '/results';
  return `${basePath}/${fileName.replace(/^\/+/, '')}`;
};

// Centralized spatial data manager with cache, retry, and workers
class SpatialDataManager {
  constructor() {
    this.cache = new Map();
    this.circuitBreakers = new Map();
    this.worker = null;
    this.monitor = backgroundMonitor;

    // Configurations
    this.config = {
      cache: { maxSize: 50, ttl: CACHE_DURATION, cleanupInterval: 300000 },
      circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
      retry: { maxAttempts: RETRY_ATTEMPTS, baseDelay: RETRY_DELAY },
      worker: { timeout: 30000 }
    };

    this.initialize();
  }

  async initialize() {
    try {
      this.worker = await createWorker();
      this.initializeCleanupInterval();
      this.monitor.init();
    } catch (error) {
      console.error('Failed to initialize spatial service:', error);
    }
  }

  initializeCleanupInterval() {
    setInterval(() => this.cleanupCache(), this.config.cache.cleanupInterval);
  }

  // Cache management
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.config.cache.ttl) {
      this.cache.delete(key);
      return null;
    }
    return cached.compressed ? JSON.parse(LZString.decompressFromUTF16(cached.data)) : cached.data;
  }

  setCachedData(key, data) {
    const shouldCompress = JSON.stringify(data).length > 100000;
    const cachedData = {
      data: shouldCompress ? LZString.compressToUTF16(JSON.stringify(data)) : data,
      timestamp: Date.now(),
      compressed: shouldCompress
    };
    this.cache.set(key, cachedData);
    this.enforceMaxCacheSize();
  }

  enforceMaxCacheSize() {
    while (this.cache.size > this.config.cache.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  // Circuit breaker
  getCircuitBreaker(key) {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, { failures: 0, lastFailure: null, isOpen: false });
    }
    return this.circuitBreakers.get(key);
  }

  async executeWithCircuitBreaker(key, operation) {
    const breaker = this.getCircuitBreaker(key);
    if (breaker.isOpen) {
      if (Date.now() - breaker.lastFailure > this.config.circuitBreaker.resetTimeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
      } else {
        throw new Error(`Circuit breaker open for ${key}`);
      }
    }

    try {
      const result = await operation();
      breaker.failures = 0;
      breaker.isOpen = false;
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
        breaker.isOpen = true;
      }
      throw error;
    }
  }

  // Data processing with workers
  async processSpatialData(selectedCommodity) {
    const cacheKey = `spatial_data_${selectedCommodity?.toLowerCase()}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) return cachedData;

    return this.executeWithCircuitBreaker(cacheKey, async () => {
      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unified: getDataPath('enhanced_unified_data_with_residual.geojson'),
        weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysis: getDataPath('spatial_analysis_results.json')
      };

      const startTime = performance.now();
      this.monitor.logMetric('spatial-fetch-start', { selectedCommodity });

      try {
        const [geoBoundariesData, unifiedData, weightsData, flowMapsData, analysisResultsData] = await Promise.all([
          this.fetchWithRetry(paths.geoBoundaries),
          this.fetchWithRetry(paths.unified),
          this.fetchWithRetry(paths.weights),
          this.fetchWithRetry(paths.flowMaps, true),
          this.fetchWithRetry(paths.analysis)
        ]);

        const processedData = await this.processAllData({
          geoBoundariesData,
          unifiedData,
          weightsData,
          flowMapsData,
          analysisResultsData,
          selectedCommodity
        });

        this.monitor.logMetric('spatial-fetch-complete', {
          duration: performance.now() - startTime,
          dataSize: JSON.stringify(processedData).length
        });

        this.setCachedData(cacheKey, processedData);
        return processedData;

      } catch (error) {
        this.monitor.logError('spatial-fetch-failed', error);
        throw error;
      }
    });
  }

  async fetchWithRetry(url, isCsv = false, attempts = 0) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      if (isCsv) {
        const text = await response.text();
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: reject
          });
        });
      }

      return await response.json();

    } catch (error) {
      if (attempts < this.config.retry.maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.config.retry.baseDelay * Math.pow(2, attempts)));
        return this.fetchWithRetry(url, isCsv, attempts + 1);
      }
      throw error;
    }
  }

  async processAllData({
    geoBoundariesData,
    unifiedData,
    weightsData,
    flowMapsData,
    analysisResultsData,
    selectedCommodity
  }) {
    if (!geoBoundariesData?.features || !unifiedData?.features) {
      throw new Error('Invalid GeoJSON structure');
    }

    const weightsValidation = validateSpatialWeights(weightsData);
    if (!weightsValidation.isValid) {
      throw new Error(`Invalid spatial weights: ${weightsValidation.errors.join(', ')}`);
    }

    const filteredFeatures = unifiedData.features.filter(
      feature => feature.properties?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    );

    const transformedFeatures = filteredFeatures.map(feature => ({
      ...feature,
      geometry: this.transformGeometry(feature.geometry),
      properties: {
        ...feature.properties,
        date: this.processDate(feature.properties.date),
        region_id: normalizeRegionName(feature.properties.region_id)
      }
    }));

    const processedFlowMaps = flowMapsData.map(flow => ({
      ...flow,
      date: this.processDate(flow.date),
      source_region: normalizeRegionName(flow.source),
      target_region: normalizeRegionName(flow.target)
    })).filter(flow => flow.source_region && flow.target_region);

    const uniqueMonths = Array.from(new Set(transformedFeatures.map(f => f.properties.date?.slice(0, 7)).filter(Boolean))).sort();

    return {
      geoData: { type: 'FeatureCollection', features: transformedFeatures },
      flowMaps: processedFlowMaps,
      spatialWeights: weightsData,
      analysisResults: analysisResultsData,
      uniqueMonths,
      metadata: {
        processingTimestamp: new Date().toISOString(),
        featureCount: transformedFeatures.length,
        flowCount: processedFlowMaps.length,
        timeRange: { start: uniqueMonths[0], end: uniqueMonths[uniqueMonths.length - 1] }
      }
    };
  }

  transformGeometry(geometry) {
    if (!geometry || !geometry.type || !geometry.coordinates) return geometry;
    switch (geometry.type) {
      case 'Point':
        return { ...geometry, coordinates: this.transformCoordinates(geometry.coordinates) };
      case 'Polygon':
      case 'MultiPolygon':
        return { ...geometry, coordinates: geometry.coordinates.map(ring => ring.map(coord => this.transformCoordinates(coord))) };
      default:
        return geometry;
    }
  }

  transformCoordinates([x, y], sourceCRS = UTM_ZONE_38N) {
    try {
      return proj4(sourceCRS, WGS84, [x, y]);
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      return [x, y];
    }
  }

  processDate(dateString) {
    const date = parseISO(dateString);
    return isValid(date) ? date.toISOString() : null;
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cache.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy() {
    this.worker?.terminate();
    this.cache.clear();
    this.circuitBreakers.clear();
  }
}

// Export singleton instance
export const spatialDataManager = new SpatialDataManager();
export const useSpatialDataManager = () => spatialDataManager;