// src/utils/SpatialDataManager.js

import Papa from 'papaparse';
import { parseISO, isValid } from 'date-fns';
import LZString from 'lz-string';
import proj4 from 'proj4';
import { workerManager } from '../workers/enhancedWorkerSystem';
import { backgroundMonitor } from './backgroundMonitor';

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';
const YEMEN_TM = 'EPSG:2098';

proj4.defs(
  UTM_ZONE_38N,
  '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs'
);
proj4.defs(
  YEMEN_TM,
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs'
);

// Config
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const DATA_VERSION = 'v1'; // Update this when data changes

// Normalize region names to ensure consistency
const normalizeRegionName = (name) => {
  if (!name) return '';

  // Special cases mapping
  const specialCases = {
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
    'hadhramaut': 'hadramaut',
  };

  let normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/['`]/g, '') // Remove special quotes
    .replace(/[\s_-]+/g, '_') // Replace spaces/hyphens with underscore
    .trim();

  return specialCases[normalized] || normalized;
};

// Validate spatial weights data structure
const validateSpatialWeights = (weights) => {
  const errors = [];
  if (!weights || typeof weights !== 'object')
    return { isValid: false, errors: ['Invalid structure'] };
  Object.entries(weights).forEach(([region, data]) => {
    if (
      !data.neighbors?.every(
        (neighbor) => typeof neighbor === 'string' && weights[neighbor]
      )
    ) {
      errors.push(`Invalid neighbors for region ${region}`);
    }
  });
  return { isValid: errors.length === 0, errors };
};

// Get data path with versioning for cache busting
const getDataPath = (fileName) => {
  const PUBLIC_URL = process.env.PUBLIC_URL || '';
  const isGitHubPages = PUBLIC_URL.includes('github.io');
  const isOffline =
    typeof navigator !== 'undefined' ? !navigator.onLine : false;
  let basePath = isOffline
    ? '/results'
    : isGitHubPages
    ? `${PUBLIC_URL}/results`
    : process.env.NODE_ENV === 'production'
    ? '/Yemen_Market_Analysis/results'
    : '/results';
  return `${basePath}/${fileName.replace(/^\/+/, '')}?version=${DATA_VERSION}`;
};

// Centralized spatial data manager with cache, retry, and workers
class SpatialDataManager {
  constructor() {
    this.cache = new Map();
    this.circuitBreakers = new Map();
    this.worker = workerManager; // Use the WorkerManager instance
    this.monitor = backgroundMonitor;

    // Configurations
    this.config = {
      cache: { maxSize: 50, ttl: CACHE_DURATION, cleanupInterval: 300000 }, // 5 minutes
      circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 }, // 30 seconds
      retry: { maxAttempts: RETRY_ATTEMPTS, baseDelay: RETRY_DELAY },
      worker: { timeout: 30000 }, // 30 seconds
    };

    this.geometryCache = new Map(); // Memoization cache for geometry transformations

    // Add worker initialization
    this.initialize().catch(error => {
      console.error('Failed to initialize SpatialDataManager:', error);
      this.monitor.logError('spatial-manager-init-failed', { error });
    });
  }

  async initialize() {
    try {
      await this.ensureWorkerInitialized();
      this.initializeCleanupInterval();
      this.monitor.init();
      console.log('SpatialDataManager initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize SpatialDataManager:', error);
      this.monitor.logError('spatial-manager-init-failed', { error });
      throw error;
    }
  }

  async ensureWorkerInitialized() {
    if (this.worker && !this.worker.isInitialized && typeof this.worker.initialize === 'function') {
      await this.worker.initialize();
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
    return cached.compressed
      ? JSON.parse(LZString.decompressFromUTF16(cached.data))
      : cached.data;
  }

  setCachedData(key, data) {
    const shouldCompress = JSON.stringify(data).length > 100000; // Compress if data size > 100KB
    const cachedData = {
      data: shouldCompress
        ? LZString.compressToUTF16(JSON.stringify(data))
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

  // Circuit breaker
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
    
    // Check if circuit breaker is open
    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - (breaker.lastFailure || 0);
      if (timeSinceLastFailure > this.config.circuitBreaker.resetTimeout) {
        // Reset circuit breaker after timeout
        breaker.isOpen = false;
        breaker.failures = 0;
        console.log(`Circuit breaker reset for key: ${key}`);
      } else {
        console.warn(`Circuit breaker open for ${key}, waiting ${(this.config.circuitBreaker.resetTimeout - timeSinceLastFailure) / 1000}s`);
        throw new Error(`Circuit breaker open for ${key}`);
      }
    }

    try {
      const result = await operation();
      // Reset on success
      breaker.failures = 0;
      breaker.isOpen = false;
      breaker.lastFailure = null;
      return result;
    } catch (error) {
      // Increment failure count
      breaker.failures = (breaker.failures || 0) + 1;
      breaker.lastFailure = Date.now();
      
      console.warn(
        `Operation failed for key: ${key}. Failure count: ${breaker.failures}`
      );

      // Check if should open circuit breaker
      if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
        breaker.isOpen = true;
        this.monitor.logEvent('circuitBreakerOpened', { 
          key,
          failures: breaker.failures,
          lastError: error.message 
        });
        console.warn(`Circuit breaker opened for key: ${key}`);
      }

      throw error;
    }
  }

  async fetchData(paths) {
    const fetchMetric = this.monitor.startMetric('fetch-spatial-data');

    try {
      const [
        geoBoundariesData,
        unifiedData,
        weightsData,
        flowMapsData,
        analysisResultsData,
      ] = await Promise.all([
        this.fetchWithRetry(paths.geoBoundaries),
        this.fetchWithRetry(paths.unified),
        this.fetchWithRetry(paths.weights),
        this.fetchWithRetry(paths.flowMaps, true),
        this.fetchWithRetry(paths.analysis),
      ]);

      fetchMetric.finish({ status: 'success' });

      return {
        geoBoundariesData,
        unifiedData,
        weightsData,
        flowMapsData,
        analysisResultsData,
      };
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
      if (attempts < this.config.retry.maxAttempts) {
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

  // Process flow data to meet component requirements
  processFlowData(flowMapsData, selectedCommodity, selectedDate) {
    if (!flowMapsData) return [];

    // Filter flows by commodity and date
    const filteredFlows = flowMapsData.filter(
      (flow) =>
        flow.commodity === selectedCommodity &&
        flow.date.startsWith(selectedDate)
    );

    // Normalize and parse numeric fields
    const processedFlows = filteredFlows.map((flow) => ({
      date: flow.date,
      source: normalizeRegionName(flow.source),
      source_lat: parseFloat(flow.source_lat),
      source_lng: parseFloat(flow.source_lng),
      target: normalizeRegionName(flow.target),
      target_lat: parseFloat(flow.target_lat),
      target_lng: parseFloat(flow.target_lng),
      price_differential: parseFloat(flow.price_differential),
      source_price: parseFloat(flow.source_price),
      target_price: parseFloat(flow.target_price),
      flow_weight: parseFloat(flow.flow_weight),
    }));

    return processedFlows;
  }

  // Process geo data
  processGeoData(unifiedData, selectedCommodity, selectedDate) {
    if (!unifiedData || !unifiedData.features) return { features: [] };

    // Filter features by commodity and date
    const filteredFeatures = unifiedData.features.filter(
      (feature) =>
        feature.properties?.commodity === selectedCommodity &&
        feature.properties?.date?.startsWith(selectedDate)
    );

    return { ...unifiedData, features: filteredFeatures };
  }

  // Process analysis data
  processAnalysisData(analysisData, selectedCommodity) {
    if (!analysisData) return [];

    // Filter analysis data by commodity
    const filteredAnalysis = analysisData.filter(
      (a) => a.commodity === selectedCommodity && a.regime === 'unified'
    );

    return filteredAnalysis;
  }

  // Extract unique months from geo data
  extractUniqueMonths(geoData) {
    const months = new Set();
    geoData.features.forEach((feature) => {
      const dateStr = feature.properties?.date;
      if (dateStr) {
        const month = dateStr.slice(0, 7); // Extract YYYY-MM
        months.add(month);
      }
    });
    return Array.from(months).sort();
  }

  // Extract unique commodities from geo data
  extractUniqueCommodities(geoData) {
    const commodities = new Set();
    geoData.features.forEach((feature) => {
      const commodity = feature.properties?.commodity;
      if (commodity) {
        commodities.add(commodity);
      }
    });
    return Array.from(commodities).sort();
  }

  // Extract unique regimes from geo data
  extractUniqueRegimes(geoData) {
    const regimes = new Set();
    geoData.features.forEach((feature) => {
      const regime = feature.properties?.regime;
      if (regime) {
        regimes.add(regime);
      }
    });
    return Array.from(regimes).sort();
  }

  processDate(dateString) {
    if (!dateString) return null;
    let date = parseISO(dateString);
    if (!isValid(date)) {
      // Try parsing as 'YYYY-MM-DD' format
      date = new Date(dateString);
    }
    return isValid(date) ? date.toISOString() : null;
  }

  // Geometry Transformation
  transformGeometry(geometry = 'point', sourceCRS = UTM_ZONE_38N) {
    if (!geometry || !geometry.type || !geometry.coordinates) return geometry;

    const cacheKey = JSON.stringify(geometry);
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey);
    }

    let transformedGeometry = geometry;

    try {
      // Only transform if coordinates are not in WGS84
      const coordinatesInWGS84 = this.coordinatesInWGS84(geometry.coordinates);

      if (!coordinatesInWGS84) {
        transformedGeometry = {
          ...geometry,
          coordinates: this.transformCoordinates(
            geometry.coordinates,
            sourceCRS
          ),
        };
      }

      this.geometryCache.set(cacheKey, transformedGeometry);
      return transformedGeometry;
    } catch (error) {
      console.error('Geometry transformation error:', error);
      this.monitor.logError('geometry-transform', { error, geometry });
      return geometry;
    }
  }

  coordinatesInWGS84(coords) {
    if (!Array.isArray(coords)) return false;
    const [lng, lat] = coords;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  transformCoordinates([x, y], sourceCRS = UTM_ZONE_38N) {
    try {
      return proj4(sourceCRS, WGS84, [x, y]);
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
  }

  destroy() {
    this.cache.clear();
    this.circuitBreakers.clear();
    this.geometryCache.clear();
    console.log('SpatialDataManager destroyed and caches cleared.');
  }

  async processSpatialData(selectedCommodity, selectedDate) {
    const cacheKey = `spatial_data_${selectedCommodity?.toLowerCase()}_${selectedDate}`;
    const metric = this.monitor.startMetric('process-spatial-data');

    try {
      // Check cache
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        metric.finish({ status: 'success', source: 'cache' });
        return cachedData;
      }

      // Execute with circuit breaker
      return await this.executeWithCircuitBreaker(cacheKey, async () => {
        const paths = {
          geoBoundaries: getDataPath(
            'choropleth_data/geoBoundaries-YEM-ADM1.geojson'
          ),
          unified: getDataPath('enhanced_unified_data_with_residual.geojson'),
          weights: getDataPath(
            'spatial_weights/transformed_spatial_weights.json'
          ),
          flowMaps: getDataPath('network_data/time_varying_flows.csv'),
          analysis: getDataPath('spatial_analysis_results.json'),
        };

        // Fetch data
        const rawData = await this.fetchData(paths);

        // Use worker for processing
        const processedData = await this.worker.processData(
          'PROCESS_SPATIAL',
          {
            geoData: rawData.unifiedData,
            flows: rawData.flowMapsData,
            weights: rawData.weightsData,
            selectedCommodity,
            selectedDate,
          }
        );

        // Compile the processed data
        const finalData = {
          ...processedData,
          analysis: rawData.analysisResultsData,
          flowMaps: rawData.flowMapsData
        };

        // Cache the results
        this.setCachedData(cacheKey, finalData);

        metric.finish({ status: 'success', source: 'processed' });
        return finalData;
      });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      this.monitor.logError('process-spatial-data-failed', { error });
      throw error;
    }
  }
}

export const spatialDataManager = new SpatialDataManager();
export const useSpatialDataManager = () => spatialDataManager;