// src/utils/SpatialDataManager.js

import Papa from 'papaparse';
import { parseISO, isValid } from 'date-fns';
import LZString from 'lz-string';
import proj4 from 'proj4';
import { workerSystem } from '../workers/enhancedWorkerSystem';
import { backgroundMonitor } from './backgroundMonitor';

// Constants
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const DATA_VERSION = 'v1';
const COMPRESSION_THRESHOLD = 100 * 1024; // 100KB
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs';
const YEMEN_TM = '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs';

// Setup projections
proj4.defs('UTM38N', UTM_ZONE_38N);
proj4.defs('YEMEN_TM', YEMEN_TM);

// Region name normalization map
const REGION_MAPPING = {
  "san'a'": 'sanaa',
  'san_a__governorate': 'sanaa',
  "sana'a": 'sanaa',
  'sanʿaʾ': 'sanaa',
  'amanat_al_asimah': 'amanat al asimah',
  'lahij': 'lahj',
  '_adan': 'aden',
  'ta_izz': 'taizz',
  'al_hudaydah': 'al hudaydah',
  'al_jawf': 'al jawf',
  'shabwah': 'shabwah',
  'hadhramaut': 'hadramaut'
};

class SpatialDataManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.geometryCache = new Map();
    this.currentCacheSize = 0;
    this.isInitialized = false;
    this.monitor = backgroundMonitor;

    // Initialize cleanup interval
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Initialize the SpatialDataManager
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await workerSystem.initialize();
      this.monitor.init();
      this.isInitialized = true;
      console.log('SpatialDataManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SpatialDataManager:', error);
      this.monitor.logError('spatial-manager-init-failed', { error });
      throw error;
    }
  }

  /**
   * Process spatial data for a selected commodity and date
   */
  async processSpatialData(selectedCommodity, selectedDate, options = {}) {
    const metric = this.monitor.startMetric('process-spatial-data');
    const cacheKey = `spatial_${selectedCommodity}_${selectedDate}`;

    try {
      // Check cache first
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        metric.finish({ status: 'success', source: 'cache' });
        return cachedData;
      }

      // Prevent duplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
      }

      const requestPromise = this.processDataWithRetry(
        selectedCommodity,
        selectedDate,
        options
      );
      this.pendingRequests.set(cacheKey, requestPromise);

      const result = await requestPromise;
      this.setCachedData(cacheKey, result);

      metric.finish({ status: 'success', source: 'processed' });
      return result;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      this.monitor.logError('process-spatial-data-failed', { error });
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Process data with retry logic
   */
  async processDataWithRetry(selectedCommodity, selectedDate, options, attempt = 0) {
    try {
      const paths = this.getDataPaths();
      const rawData = await this.fetchDataSources(paths);
  
      // Filter data for the selected commodity
      const filteredFeatures = rawData.unifiedData.features.filter(
        (feature) => feature.properties.commodity === selectedCommodity
      );
  
      // Update the unifiedData to contain only filtered features
      rawData.unifiedData.features = filteredFeatures;
  
      // Process data using worker system
      const processedData = await workerSystem.processData('PROCESS_SPATIAL', {
        geoData: filteredFeatures,
        flows: rawData.flowMapsData,
        weights: rawData.weightsData,
        selectedCommodity,
        selectedDate,
      }, options.onProgress);
  
      // Return the structured data with geoData property
      return {
        geoData: {
          type: 'FeatureCollection',
          features: processedData,
        },
        analysis: rawData.analysisResultsData,
        flowMaps: this.processFlowData(rawData.flowMapsData, selectedCommodity, selectedDate),
      };
    } catch (error) {
      if (attempt < RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.processDataWithRetry(selectedCommodity, selectedDate, options, attempt + 1);
      }
      throw error;
    }
  }
  

  /**
   * Fetch all required data sources
   */
  async fetchDataSources(paths) {
    const [
      geoBoundariesData,
      unifiedData,
      weightsData,
      flowMapsData,
      analysisResultsData
    ] = await Promise.all([
      this.fetchWithRetry(paths.geoBoundaries),
      this.fetchWithRetry(paths.unified),
      this.fetchWithRetry(paths.weights),
      this.fetchWithRetry(paths.flowMaps, true), // CSV data
      this.fetchWithRetry(paths.analysis)
    ]);

    return {
      geoBoundariesData,
      unifiedData,
      weightsData,
      flowMapsData,
      analysisResultsData
    };
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(url, isCsv = false, attempt = 0) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      const text = await response.text();
      if (!text) {
        throw new Error(`Empty response body for URL: ${url}`);
      }
  
      if (isCsv) {
        try {
          return Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
          }).data;
        } catch (parseError) {
          console.error(`CSV parsing error for ${url}:`, parseError);
          throw parseError;
        }
      } else {
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error(`JSON parsing error for ${url}:`, parseError);
          throw parseError;
        }
      }
    } catch (error) {
      if (attempt < RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, isCsv, attempt + 1);
      }
      throw error;
    }
  }
  

  /**
   * Process flow data
   */
  processFlowData(flowMapsData, selectedCommodity, selectedDate) {
    return flowMapsData
      .filter(flow =>
        flow.commodity === selectedCommodity &&
        flow.date.startsWith(selectedDate)
      )
      .map(flow => ({
        date: flow.date,
        source: this.normalizeRegionName(flow.source),
        source_lat: parseFloat(flow.source_lat),
        source_lng: parseFloat(flow.source_lng),
        target: this.normalizeRegionName(flow.target),
        target_lat: parseFloat(flow.target_lat),
        target_lng: parseFloat(flow.target_lng),
        flow_weight: parseFloat(flow.flow_weight),
        price_differential: parseFloat(flow.price_differential)
      }));
  }

  /**
   * Cache management methods
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      this.currentCacheSize -= this.getDataSize(cached.data);
      return null;
    }

    return cached.compressed
      ? JSON.parse(LZString.decompressFromUTF16(cached.data))
      : cached.data;
  }

  setCachedData(key, data) {
    const dataSize = this.getDataSize(data);
    const shouldCompress = dataSize > COMPRESSION_THRESHOLD;

    // Manage cache size
    while (this.currentCacheSize + dataSize > MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      const oldEntry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.currentCacheSize -= this.getDataSize(oldEntry.data);
    }

    const cachedData = {
      data: shouldCompress
        ? LZString.compressToUTF16(JSON.stringify(data))
        : data,
      timestamp: Date.now(),
      compressed: shouldCompress
    };

    this.cache.set(key, cachedData);
    this.currentCacheSize += dataSize;
  }

  /**
   * Normalize region names
   */
  normalizeRegionName(name) {
    if (!name) return '';

    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`]/g, '')
      .replace(/[\s_-]+/g, '_')
      .trim();

    return REGION_MAPPING[normalized] || normalized;
  }

  /**
   * Get data paths based on environment
   */
  getDataPaths() {
    const PUBLIC_URL = process.env.PUBLIC_URL || '';
    const isGitHubPages = PUBLIC_URL.includes('github.io');
    const basePath = isGitHubPages ? `${PUBLIC_URL}/results` : '/results';

    return {
      geoBoundaries: `${basePath}/choropleth_data/geoBoundaries-YEM-ADM1.geojson?v=${DATA_VERSION}`,
      unified: `${basePath}/enhanced_unified_data_with_residual.geojson?v=${DATA_VERSION}`,
      weights: `${basePath}/spatial_weights/transformed_spatial_weights.json?v=${DATA_VERSION}`,
      flowMaps: `${basePath}/network_data/time_varying_flows.csv?v=${DATA_VERSION}`,
      analysis: `${basePath}/spatial_analysis_results.json?v=${DATA_VERSION}`
    };
  }

  /**
   * Calculate data size
   */
  getDataSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Transform coordinates with caching
   */
  transformCoordinates(coordinates, fromProjection = 'UTM38N') {
    const key = `${coordinates.join(',')}_${fromProjection}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key);
    }

    try {
      const transformed = proj4(fromProjection, WGS84, coordinates);
      
      if (this.geometryCache.size >= 1000) {
        const firstKey = this.geometryCache.keys().next().value;
        this.geometryCache.delete(firstKey);
      }
      
      this.geometryCache.set(key, transformed);
      return transformed;
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      return coordinates;
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        this.currentCacheSize -= this.getDataSize(value.data);
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get current cache statistics
   */
  getCacheStats() {
    return {
      size: this.currentCacheSize,
      entries: this.cache.size,
      geometryEntries: this.geometryCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Clean up and destroy manager
   */
  destroy() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.geometryCache.clear();
    this.currentCacheSize = 0;
    this.isInitialized = false;
    console.log('SpatialDataManager cleaned up and destroyed');
  }
}

// Create and export singleton instance
export const spatialDataManager = new SpatialDataManager();

// Export hook for React components
export const useSpatialDataManager = () => spatialDataManager;