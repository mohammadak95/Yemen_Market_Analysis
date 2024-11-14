// src/utils/PrecomputedDataManager.js

import Papa from 'papaparse';
import LZString from 'lz-string';
import proj4 from 'proj4';
import JSON5 from 'json5';
import { backgroundMonitor } from './backgroundMonitor';
import { getDataPath } from './dataUtils';
import { dataLoadingMonitor } from './dataMonitoring';

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';

proj4.defs(UTM_ZONE_38N, '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs');

// Regions to exclude from processing
const excludedRegions = [
  'socotra',
  'unknown',
  'undefined',
  'other',
];

// Define region mappings
const REGION_MAPPINGS = {
  "sanaa": ["san'a'", "san_a__governorate", "sana'a", "sanʿaʾ", "amanat al asimah", "sana'a city", "amanat_al_asimah"],
  "lahj": ["lahij_governorate", "lahij", "lahj_governorate"],
  "aden": ["_adan_governorate", "aden", "'adan governorate", "adan_governorate"],
  "hodeidah": ["al_hudaydah_governorate", "al hudaydah", "hudaydah", "al_hudaydah"],
  "taizz": ["taizz_governorate", "taizz", "taiz", "ta'izz"],
  "shabwah": ["shabwah_governorate", "shabwah", "shabwa"],
  "hadramaut": ["hadhramaut", "hadramaut", "hadhramout"],
  "abyan": ["abyan_governorate", "abyan"],
  "al_jawf": ["al_jawf_governorate", "al jawf"],
  "ibb": ["ibb_governorate", "ibb"],
  "al_bayda": ["al_bayda__governorate", "al bayda", "al_bayda_governorate"],
  "al_dhale": ["ad_dali__governorate", "al dhale'e", "al_dhale_e", "ad dali governorate"],
  "al_mahwit": ["al_mahwit_governorate", "al mahwit"],
  "hajjah": ["hajjah_governorate", "hajjah"],
  "dhamar": ["dhamar_governorate", "dhamar"],
  "amran": ["_amran_governorate", "amran", "'amran"],
  "al_maharah": ["al_mahrah_governorate", "al maharah", "mahra"],
  "marib": ["ma'rib_governorate", "marib", "ma'rib", "marib_governorate"],
  "raymah": ["raymah_governorate", "raymah"],
  "socotra": ["socotra", "soqotra", "suqutra"]
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

class PrecomputedDataManager {
  constructor() {
    this.cache = new Map();
    this.circuitBreakers = new Map();
    this.pendingRequests = new Map();
    this.geometryCache = new Map();
    this.mappingCache = new Map();
    this._isInitialized = false;
    this.cacheTimeout = CACHE_DURATION;
    this._cacheInitialized = false;
    this.monitor = backgroundMonitor;
    this.config = {
      cache: { maxSize: 50, ttl: CACHE_DURATION, cleanupInterval: 300000 }, // 5 minutes
      circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 }, // 30 seconds
      retry: { maxAttempts: RETRY_ATTEMPTS, baseDelay: RETRY_DELAY },
    };
    this.initializeCleanupInterval();
  }

  async initialize() {
    if (this._isInitialized) return;
    try {
      this.monitor.init();
      this._isInitialized = true;
      this._cacheInitialized = true;
      console.log('PrecomputedDataManager initialized');
    } catch (error) {
      console.error('Failed to initialize PrecomputedDataManager:', error);
      this._cacheInitialized = false;
      throw error;
    }
  }

  isCacheInitialized() {
    return this._cacheInitialized;
  }

  isInitialized() {
    return this._isInitialized;
  }

  initializeCleanupInterval() {
    setInterval(() => this.cleanupCache(), this.config.cache.cleanupInterval);
  }

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
    const dataString = JSON.stringify(data);
    const shouldCompress = dataString.length > 100000; // Compress if data size > 100KB
    const cachedData = {
      data: shouldCompress ? LZString.compressToUTF16(dataString) : data,
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

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - (breaker.lastFailure || 0);
      if (timeSinceLastFailure > this.config.circuitBreaker.resetTimeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
        console.log(`Circuit breaker reset for key: ${key}`);
      } else {
        console.warn(
          `Circuit breaker open for ${key}, waiting ${
            (this.config.circuitBreaker.resetTimeout - timeSinceLastFailure) / 1000
          }s`
        );
        throw new Error(`Circuit breaker open for ${key}`);
      }
    }

    try {
      const result = await operation();
      breaker.failures = 0;
      breaker.isOpen = false;
      breaker.lastFailure = null;
      return result;
    } catch (error) {
      breaker.failures += 1;
      breaker.lastFailure = Date.now();

      console.warn(
        `Operation failed for key: ${key}. Failure count: ${breaker.failures}`
      );

      if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
        breaker.isOpen = true;
        this.monitor.logEvent('circuitBreakerOpened', {
          key,
          failures: breaker.failures,
          lastError: error.message,
        });
        console.warn(`Circuit breaker opened for key: ${key}`);
      }

      throw error;
    }
  }

  async processSpatialData(selectedCommodity, selectedDate, options = {}) {
    if (!this._isInitialized) {
      await this.initialize();
    }

    const metric = this.monitor.startMetric('process-spatial-data');
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

      const requestPromise = this.executeWithCircuitBreaker(cacheKey, () =>
        this.loadAndProcessData(selectedCommodity, selectedDate)
      );

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
      const dataPath = getDataPath(
        `preprocessed_by_commodity/preprocessed_yemen_market_data_${sanitizedCommodity}.json`
      );

      // Fetch preprocessed data
      const preprocessedData = await this.fetchWithRetry(dataPath);

      // Merge data with geometries
      const mergedData = await this.mergeData(preprocessedData, commodity, date);

      // Process the merged data
      const processedData = this.processData(mergedData, {
        selectedDate: date,
        selectedCommodity: commodity,
      });

      dataLoadingMonitor.completeRequest(metric.id, processedData);
      return processedData;
    } catch (error) {
      dataLoadingMonitor.logError(metric.id, error);
      throw error;
    }
  }

  sanitizeCommodityName(commodity) {
    return commodity
      .toLowerCase()
      .replace(/[(),\s]+/g, '_')
      .replace(/_+$/, '');
  }

  async fetchWithRetry(url, isCsv = false, attempts = 0) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      if (isCsv) {
        const text = await response.text();
        const parsedData = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        }).data;
        return parsedData;
      }

      const text = await response.text();
      // Use JSON5 in case the JSON contains comments or trailing commas
      const jsonData = JSON5.parse(text);
      return jsonData;
    } catch (error) {
      if (attempts < this.config.retry.maxAttempts - 1) {
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

  async mergeData(preprocessedData, selectedCommodity, selectedDate) {
    const metric = this.monitor.startMetric('merge-spatial-data');

    try {
      const geometries = await this.loadGeometries();
      const transformedData = this.transformPreprocessedData(
        preprocessedData,
        selectedDate
      );
      const mergedData = await this.mergeGeometries(
        transformedData,
        geometries,
        selectedDate
      );

      metric.finish({ status: 'success' });
      return mergedData;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  async loadGeometries() {
    const cacheKey = 'geometries';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const [boundaries, enhanced] = await Promise.all([
        this.fetchWithRetry(
          getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson')
        ),
        this.fetchWithRetry(
          getDataPath('enhanced_unified_data_with_residual.geojson')
        ),
      ]);

      const mergedGeometries = this.mergeGeometryData(boundaries, enhanced);
      this.cache.set(cacheKey, mergedGeometries);

      return mergedGeometries;
    } catch (error) {
      console.error('Error loading geometries:', error);
      throw error;
    }
  }

  mergeGeometryData(boundaries, enhanced) {
    const geometryMap = new Map();

    // Add base boundaries
    boundaries.features.forEach((feature) => {
      const id = this.normalizeRegionId(
        feature.properties.shapeName || feature.properties.region_id
      );
      if (id) {
        const transformedGeometry = this.transformGeometry(feature.geometry);
        geometryMap.set(id, {
          geometry: transformedGeometry,
          properties: { ...feature.properties },
        });
      }
    });

    // Enhance with additional data
    enhanced.features.forEach((feature) => {
      const id = this.normalizeRegionId(
        feature.properties.region_id || feature.properties.shapeName
      );
      if (id && geometryMap.has(id)) {
        const existing = geometryMap.get(id);
        geometryMap.set(id, {
          geometry: existing.geometry,
          properties: {
            ...existing.properties,
            ...feature.properties,
          },
        });
      }
    });

    return geometryMap;
  }

  transformGeometry(geometry) {
    if (!geometry || !geometry.type || !geometry.coordinates) return null;

    const cacheKey = JSON.stringify(geometry);
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey);
    }

    try {
      let transformedGeometry;

      switch (geometry.type) {
        case 'Point':
          transformedGeometry = {
            ...geometry,
            coordinates: this.transformCoordinates(geometry.coordinates),
          };
          break;

        case 'Polygon':
          transformedGeometry = {
            ...geometry,
            coordinates: geometry.coordinates.map((ring) =>
              ring.map((coord) => this.transformCoordinates(coord))
            ),
          };
          break;

        case 'MultiPolygon':
          transformedGeometry = {
            ...geometry,
            coordinates: geometry.coordinates.map((polygon) =>
              polygon.map((ring) => ring.map((coord) => this.transformCoordinates(coord)))
            ),
          };
          break;

        default:
          return geometry;
      }

      this.geometryCache.set(cacheKey, transformedGeometry);
      return transformedGeometry;
    } catch (error) {
      console.error('Geometry transformation error:', error);
      throw error;
    }
  }

  transformCoordinates([x, y], sourceCRS = UTM_ZONE_38N) {
    try {
      if (this.coordinatesInWGS84([x, y])) {
        return [x, y];
      }
      return proj4(sourceCRS, WGS84, [x, y]);
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      throw error;
    }
  }

  coordinatesInWGS84(coords) {
    if (!Array.isArray(coords)) return false;
    const [lng, lat] = coords;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  normalizeRegionId(id) {
    if (!id) return null;

    const cacheKey = id.toLowerCase();
    if (this.mappingCache.has(cacheKey)) {
      return this.mappingCache.get(cacheKey);
    }

    const normalized = this.normalizeString(id);

    let standardId = null;
    for (const [standard, variants] of Object.entries(REGION_MAPPINGS)) {
      if (
        standard === normalized ||
        variants.some((v) => this.normalizeString(v) === normalized)
      ) {
        standardId = standard;
        break;
      }
    }

    this.mappingCache.set(cacheKey, standardId || normalized);
    return standardId || normalized;
  }

  normalizeString(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['\u2018\u2019]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .trim();
  }

  transformPreprocessedData(data, targetDate) {
    const timeSeriesData = data.time_series_data || [];

    // Create features from market clusters
    const features = this.createFeaturesFromClusters(data.market_clusters, targetDate);

    return {
      geoData: {
        type: 'FeatureCollection',
        features,
      },
      marketClusters: data.market_clusters || [],
      detectedShocks: this.filterShocksByDate(data.market_shocks, targetDate),
      timeSeriesData,
      flowMaps: this.transformFlowData(data.flow_analysis),
      analysisResults: {
        spatialAutocorrelation: data.spatial_autocorrelation || {},
        metadata: data.metadata || {},
      },
    };
  }

  createFeaturesFromClusters(clusters = [], selectedDate) {
    return clusters.reduce((acc, cluster) => {
      const mainMarketId = this.normalizeRegionId(cluster.main_market);
      if (!mainMarketId) return acc;

      // Main Market Feature
      acc.push({
        type: 'Feature',
        properties: {
          id: mainMarketId,
          originalId: cluster.main_market,
          isMainMarket: true,
          clusterSize: cluster.market_count,
          marketRole: 'hub',
          priceData: this.getPriceDataForCluster(cluster, selectedDate),
          cluster_id: cluster.cluster_id,
        },
        geometry: null, // Geometry will be merged later
      });

      // Peripheral Markets Features
      cluster.connected_markets.forEach((market) => {
        const marketId = this.normalizeRegionId(market);
        if (marketId) {
          acc.push({
            type: 'Feature',
            properties: {
              id: marketId,
              originalId: market,
              isMainMarket: false,
              clusterSize: cluster.market_count,
              marketRole: 'peripheral',
              priceData: this.getPriceDataForCluster(cluster, selectedDate),
              cluster_id: cluster.cluster_id,
            },
            geometry: null, // Geometry will be merged later
          });
        }
      });

      return acc;
    }, []);
  }

  getPriceDataForCluster(cluster, selectedDate) {
    if (!cluster.priceData) return null;

    // Assuming priceData is an object with dates as keys
    return cluster.priceData[selectedDate] || null;
  }

  filterShocksByDate(shocks = [], targetDate) {
    if (!targetDate || !shocks) return [];

    return shocks
      .filter((shock) => {
        const regionId = this.normalizeRegionId(shock.region);
        return shock.date.startsWith(targetDate) && regionId;
      })
      .map((shock) => ({
        ...shock,
        region: this.normalizeRegionId(shock.region),
      }));
  }

  transformFlowData(flows = []) {
    if (!flows) return [];

    return flows
      .filter((flow) => {
        const sourceId = this.normalizeRegionId(flow.source);
        const targetId = this.normalizeRegionId(flow.target);
        return sourceId && targetId;
      })
      .map((flow) => ({
        source: this.normalizeRegionId(flow.source),
        target: this.normalizeRegionId(flow.target),
        flow_weight:
          typeof flow.total_flow === 'number' && !isNaN(flow.total_flow)
            ? flow.total_flow
            : 0,
        avg_flow:
          typeof flow.avg_flow === 'number' && !isNaN(flow.avg_flow)
            ? flow.avg_flow
            : 0,
        flow_count:
          typeof flow.flow_count === 'number' && !isNaN(flow.flow_count)
            ? flow.flow_count
            : 0,
        price_differential:
          typeof flow.avg_price_differential === 'number' && !isNaN(flow.avg_price_differential)
            ? flow.avg_price_differential
            : 0,
        original_source: flow.source,
        original_target: flow.target,
      }));
  }

  async mergeGeometries(transformedData, geometryMap, selectedDate) {
    const features = transformedData.geoData.features.map((feature) => {
      const id = this.normalizeRegionId(feature.properties.id);
      const geometryData = geometryMap.get(id);

      if (geometryData) {
        const properties = {
          ...feature.properties,
          ...geometryData.properties,
          normalizedId: id,
          originalId: feature.properties.id,
        };

        return {
          ...feature,
          geometry: geometryData.geometry,
          properties,
        };
      }

      console.warn(
        `No geometry found for region: ${id} (original: ${feature.properties.id})`
      );
      return feature;
    });

    const validFeatures = features.filter((feature) => feature.geometry !== null);

    return {
      ...transformedData,
      geoData: {
        type: 'FeatureCollection',
        features: validFeatures,
        metadata: {
          processedDate: new Date().toISOString(),
          totalFeatures: validFeatures.length,
          excludedRegions,
          projection: WGS84,
        },
      },
    };
  }

  processData(mergedData, { selectedDate, selectedCommodity }) {
    const { geoData, timeSeriesData } = mergedData;

    // Filter features by commodity
    const commodityFeatures = this.filterFeaturesByCommodity(
      geoData.features,
      selectedCommodity
    );

    // Get available months from filtered features
    const availableMonths = [
      ...new Set(commodityFeatures.map((f) => f.properties.date).filter(Boolean)),
    ].sort();

    // Get relevant features for date
    const relevantFeatures = selectedDate
      ? commodityFeatures.filter((f) => f.properties.date === selectedDate)
      : commodityFeatures;

    const processedData = {
      timeSeriesData: this.processTimeSeries(commodityFeatures),
      geoData: {
        type: 'FeatureCollection',
        features: relevantFeatures,
        metadata: {
          date: selectedDate,
          commodity: selectedCommodity,
          total_features: relevantFeatures.length,
        },
      },
      marketClusters: this.createMarketClustersFromFeatures(relevantFeatures),
      flowMaps: this.processFlows(relevantFeatures),
      spatialMetrics: this.processSpatialMetrics(relevantFeatures),
      analysisMetrics: {
        coverage: relevantFeatures.length / geoData.features.length,
        temporalRange: availableMonths.length,
        spatialCoverage: new Set(relevantFeatures.map((f) => f.properties.admin1)).size,
      },
      metadata: {
        date: selectedDate,
        commodity: selectedCommodity,
        total_features: relevantFeatures.length,
      },
      availableMonths,
    };

    return processedData;
  }

  filterFeaturesByCommodity(features, commodity) {
    if (!commodity) return features;
    return features.filter(
      (f) => f.properties.commodity?.toLowerCase() === commodity.toLowerCase()
    );
  }

  processTimeSeries(features) {
    const timeSeriesMap = new Map();

    features.forEach((feature) => {
      const { date, price, usdprice, conflict_intensity } = feature.properties;
      if (!date) return;

      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, {
          month: date,
          avgUsdPrice: usdprice || 0,
          price: price || 0,
          volatility: 0,
          conflict_intensity: conflict_intensity || 0,
          sampleSize: 1,
        });
      } else {
        const existing = timeSeriesMap.get(date);
        existing.avgUsdPrice += usdprice || 0;
        existing.price += price || 0;
        existing.conflict_intensity += conflict_intensity || 0;
        existing.sampleSize++;
      }
    });

    return Array.from(timeSeriesMap.values())
      .map((entry) => ({
        ...entry,
        avgUsdPrice: entry.avgUsdPrice / entry.sampleSize,
        price: entry.price / entry.sampleSize,
        conflict_intensity: entry.conflict_intensity / entry.sampleSize,
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }

  createMarketClustersFromFeatures(features) {
    // Group features by region
    const regionGroups = new Map();
    features.forEach((feature) => {
      const { admin1: region } = feature.properties;
      if (!region) return;

      if (!regionGroups.has(region)) {
        regionGroups.set(region, {
          markets: new Set(),
          dates: new Set(),
        });
      }

      regionGroups.get(region).markets.add(region);
      regionGroups.get(region).dates.add(feature.properties.date);
    });

    // Convert to cluster format
    return Array.from(regionGroups.entries()).map(([region, data]) => ({
      cluster_id: region,
      main_market: region,
      market_count: data.dates.size,
      connected_markets: [],
      metrics: {
        temporal_coverage: data.dates.size,
        spatial_coverage: data.markets.size,
      },
    }));
  }

  processFlows(features) {
    const flowMap = new Map();

    features.forEach((feature) => {
      const { admin1: region, price, date } = feature.properties;
      if (!region || !price || !date) return;

      const key = `${region}_${date}`;
      if (!flowMap.has(key)) {
        flowMap.set(key, {
          source: region,
          date,
          prices: [price],
          count: 1,
        });
      } else {
        const existing = flowMap.get(key);
        existing.prices.push(price);
        existing.count++;
      }
    });

    // Convert to flow objects
    return Array.from(flowMap.values()).map((flow) => ({
      source: flow.source,
      target: flow.source, // Self-loop for now
      date: flow.date,
      flow_weight: flow.count,
      avg_price: flow.prices.reduce((a, b) => a + b, 0) / flow.count,
    }));
  }

  processSpatialMetrics(features) {
    const regionMetrics = new Map();

    features.forEach((feature) => {
      const { admin1: region, price, conflict_intensity } = feature.properties;
      if (!region) return;

      if (!regionMetrics.has(region)) {
        regionMetrics.set(region, {
          prices: [],
          conflict: [],
        });
      }

      if (price) regionMetrics.get(region).prices.push(price);
      if (conflict_intensity) regionMetrics.get(region).conflict.push(conflict_intensity);
    });

    // Convert to metrics format
    const metrics = {
      global: {
        regions: regionMetrics.size,
        total_observations: features.length,
      },
      local: {},
    };

    regionMetrics.forEach((data, region) => {
      metrics.local[region] = {
        observations: data.prices.length,
        mean_price: data.prices.length
          ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length
          : 0,
        mean_conflict: data.conflict.length
          ? data.conflict.reduce((a, b) => a + b, 0) / data.conflict.length
          : 0,
      };
    });

    return metrics;
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cache.ttl) {
        this.cache.delete(key);
        console.log(`Cache entry expired and removed: ${key}`);
      }
    }

    // Clear geometry cache periodically
    this.geometryCache.clear();
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.circuitBreakers.clear();
    this.geometryCache.clear();
    this._cacheInitialized = false;
  }

  destroy() {
    this.clearCache();
    this._isInitialized = false;
    this._cacheInitialized = false;
    console.log('PrecomputedDataManager destroyed and caches cleared.');
  }
}

export const precomputedDataManager = new PrecomputedDataManager();