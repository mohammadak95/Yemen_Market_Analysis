// src/utils/spatialDataHandler.js

import Papa from 'papaparse';
import _ from 'lodash';
import { excludedRegions } from './appUtils';
import { 
  getPrecomputedDataPath, 
  getNetworkDataPath,
  getChoroplethDataPath,
  enhancedFetchJson,
  getDataPath
} from './dataUtils';
import { pathResolver } from './pathResolver';
import { pathValidator } from '../utils/pathValidator';
import { DEFAULT_REGRESSION_DATA } from '../types/dataTypes';

// Yemen region name mappings for normalization
const REGION_MAPPINGS = {
  // Sana'a variations
  "san'a'": "sana'a",
  "san_a__governorate": "sana'a",
  "sanaa": "sana'a",
  "sanʿaʾ": "amanat al asimah", // From second mapping
  "sana": "sana'a",
  "sanaa_city": "amanat al asimah", // From second mapping
  "capital_city": "amanat al asimah",
  "capital_secretariat": "amanat al asimah",
  "capital": "amanat al asimah",
  "amanat al asimah": "amanat al asimah", // Ensuring consistency
  "san'a' governorate": "sana'a",
  "sanʿaʾ": "sana'a",
  "sanʿaʾ governorate": "sana'a",

  // Lahj variations
  "lahij_governorate": "lahj",
  "lahij": "lahj",
  "lahej": "lahj", // From second mapping

  // Aden variations 
  "adan_governorate": "aden",

  // Hudaydah variations
  "al_hudaydah_governorate": "al hudaydah",
  "hudaydah": "al hudaydah",
  "hodeidah": "al hudaydah",
  "hodeida": "al hudaydah", // From second mapping
  "hudaidah": "al hudaydah", // From second mapping

  // Taizz variations
  "ta_izz_governorate": "taizz",
  "taiz": "taizz",
  "taʿizz": "taizz", // From second mapping

  // Shabwah variations
  "shabwah_governorate": "shabwah",
  "shabwa": "shabwah",

  // Hadramaut variations
  "hadhramaut": "hadramaut",
  "hadramout": "hadramaut",
  "hadramawt": "hadramaut", // From second mapping

  // Bayda variations
  "al_bayda__governorate": "al bayda",
  "bayda": "al bayda",
  "al bayda'": "al bayda", // From second mapping

  // Al Dhale'e variations
  "ad_dali__governorate": "al dhale'e",
  "dhale": "al dhale'e",
  "daleh": "al dhale'e",
  "ad dali": "al dhale'e", // From second mapping

  // Al Jawf variations
  "al_jawf_governorate": "al jawf",
  "jawf": "al jawf",

  // Al Mahrah variations
  "al_mahrah_governorate": "al maharah",
  "mahrah": "al maharah",
  "al mahra": "al maharah", // From second mapping

  // Marib variations
  "ma'rib_governorate": "marib",
  "maarib": "marib",
  "mareb": "marib", // From second mapping

  // Other governorates
  "abyan_governorate": "abyan",
  "abbyan_governorate": "abyan", // Potential typo handled
  "ibb_governorate": "ibb",
  "al_mahwit_governorate": "al mahwit",
  "mahwit": "al mahwit",
  "hajjah_governorate": "hajjah",
  "dhamar_governorate": "dhamar",
  "_amran_governorate": "amran",
  "raymah_governorate": "raymah",

  // Fix for Taizz variations
  "taizz": "ta'izz",
  "taiz": "ta'izz",
  "taʿizz": "ta'izz",

  // Fix for Al Dhale'e variations
  "al dhale'e": "ad dali'",
  "dhale": "ad dali'",
  "al dhale": "ad dali'",
  "ad dali": "ad dali'",
  "ad-dali": "ad dali'",

  // Fix for Sana'a variations
  "sana'a": "amanat al asimah",
  "sanaa": "amanat al asimah",
  "sana": "amanat al asimah",

  // Fix for Amran variations
  "amran": "'amran",
  "amran governorate": "'amran",

  // Fix for Marib variations
  "marib": "ma'rib",
  "maarib": "ma'rib",
  "mareb": "ma'rib",

  // Fix for Al Maharah variations
  "al maharah": "al mahrah",
  "maharah": "al mahrah",
  "al mahra": "al mahrah"
};

const DEFAULT_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
  crs: {
    type: 'name',
    properties: {
      name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
    }
  }
};

class SpatialDataHandler {
  // ===========================
  // Constructor and Initialization
  // ===========================

  constructor() {
    this.cache = new Map();
    this.coordinateCache = new Map();
    this.geometryCache = null;
    this.regionMappingCache = new Map();
    this.excludedRegions = new Set(
      excludedRegions.map((region) => this.normalizeRegionName(region))
    );
    this.defaultGeoJSON = DEFAULT_GEOJSON;
    this.missingGeometryWarnings = new Set();
    this.debugMode = process.env.NODE_ENV === 'development';
    this.cacheConfig = {
      TTL: 3600000, // 1 hour
      maxSize: 100, // Maximum number of cached items
      cleanupInterval: 300000 // 5 minutes
    };
    
    // Start cache cleanup interval
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupCache(), this.cacheConfig.cleanupInterval);
    }
  }

  // ===========================
  // Cache Management
  // ===========================

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheConfig.TTL) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
    this.geometryCache = null;
    this.regionMappingCache.clear();
  }

  // ===========================
  // Normalization Methods
  // ===========================

  normalizeRegionName(name) {
    if (!name) return null;

    // Convert to lowercase and clean up
    const cleaned = name.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/governorate$/i, '')
      .replace(/province$/i, '')
      .trim();

    // Check direct mapping
    if (REGION_MAPPINGS[cleaned]) {
      return REGION_MAPPINGS[cleaned];
    }

    // Handle Arabic characters and diacritics
    const normalized = cleaned
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
      .replace(/[_-]+/g, ' ')           // Normalize separators
      .replace(/ʿ/g, "'")               // Normalize special quotes
      .replace(/['']/g, "'");           // Normalize quotes

    return REGION_MAPPINGS[normalized] || normalized;
  }

  normalizeCommodityName(commodity) {
    return commodity.toLowerCase()
      .replace(/[()]/g, '') 
      .replace(/\s+/g, '_')
      .trim();
  }

  // ===========================
  // Validation Methods
  // ===========================

  validateGeoJSON(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.type !== 'FeatureCollection') return false;
    if (!Array.isArray(data.features)) return false;
    if (data.features.length === 0) return false;

    // Check first feature structure
    const firstFeature = data.features[0];
    if (!firstFeature.type || !firstFeature.properties || !firstFeature.geometry) {
      return false;
    }

    return true;
  }

  validateFlowData(flows) {
    if (!Array.isArray(flows)) return false;
    
    const validations = flows.map(flow => {
      const sourceValid = this.validateMarket(flow.source);
      const targetValid = this.validateMarket(flow.target);
      const metricsValid = this.validateFlowMetrics(flow);
      
      return {
        valid: sourceValid && targetValid && metricsValid,
        source: sourceValid,
        target: targetValid,
        metrics: metricsValid,
        messages: []
      };
    });
  
    return {
      valid: validations.every(v => v.valid),
      details: validations
    };
  }
  
  validateMarket(market) {
    const normalized = this.normalizeRegionName(market);
    return (
      normalized &&
      !this.excludedRegions.has(normalized) &&
      this.coordinateCache.has(normalized)
    );
  }
  
  validateFlowMetrics(flow) {
    return (
      typeof flow.flow_weight === 'number' &&
      flow.flow_weight >= 0 &&
      typeof flow.flow_count === 'number' &&
      flow.flow_count > 0
    );
  }

  validatePreprocessedData(data) {
    if (!data || typeof data !== 'object') return false;
    
    const required = [
      'time_series_data',
      'market_clusters',
      'market_shocks',
      'spatial_autocorrelation',
      'market_integration'
    ];
  
    // Enhanced validation
    const validation = {
      missingFields: required.filter(field => !data[field]),
      invalidTypes: required.filter(field => {
        const value = data[field];
        switch (field) {
          case 'time_series_data':
            return !Array.isArray(value);
          case 'market_clusters':
            return !Array.isArray(value);
          case 'market_shocks':
            return !Array.isArray(value);
          case 'spatial_autocorrelation':
            return !value?.global || !value?.local;
          case 'market_integration':
            return !value?.price_correlation;
          default:
            return false;
        }
      })
    };
  
    if (validation.missingFields.length > 0) {
      console.warn('Missing required fields:', validation.missingFields);
      return false;
    }
  
    if (validation.invalidTypes.length > 0) {
      console.warn('Invalid field types:', validation.invalidTypes);
      return false;
    }
  
    return true;
  }

  validateRegressionData(data) {
    if (!data?.model || !data?.spatial || !data?.residuals) {
      return false;
    }
  
    return (
      // Model validation
      typeof data.model.r_squared === 'number' &&
      typeof data.model.adj_r_squared === 'number' &&
      typeof data.model.mse === 'number' &&
      typeof data.model.intercept === 'number' &&
      typeof data.model.observations === 'number' &&
      // Spatial validation
      data.spatial.moran_i &&
      Array.isArray(data.spatial.vif) &&
      // Residuals validation
      Array.isArray(data.residuals.raw) &&
      typeof data.residuals.stats === 'object'
    );
  }

  validateMarketClusters(clusters) {
    return clusters.every(cluster => (
      cluster.main_market && 
      Array.isArray(cluster.connected_markets) &&
      this.validateMarketConnections(cluster)
    ));
  }

  // ===========================
  // Data Initialization
  // ===========================

  async initializeGeometry() {
    if (this.geometryCache) return this.geometryCache;
  
    try {
      const geojsonPath = getChoroplethDataPath('geoBoundaries-YEM-ADM1.geojson');
      
      if (this.debugMode) {
        console.log('[SpatialHandler] Loading geometry:', { path: geojsonPath });
      }
  
      // Fetch GeoJSON data
      let geojsonData;
      try {
        const response = await fetch(geojsonPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        geojsonData = await response.json();
      } catch (fetchError) {
        console.error('[SpatialHandler] Failed to fetch GeoJSON:', fetchError);
        throw new Error('Failed to load geometry data');
      }
  
      // Validate GeoJSON structure
      if (!this.validateGeoJSON(geojsonData)) {
        throw new Error('Invalid GeoJSON data structure');
      }
  
      this.geometryCache = new Map();
      this.regionMappingCache.clear();
  
      // Process valid features
      const processedFeatures = geojsonData.features
        .filter(feature => feature?.properties?.shapeName && feature.geometry)
        .map(feature => {
          // Clean up shapeName
          const cleanedName = this.cleanShapeName(feature.properties.shapeName);
          const normalizedName = this.normalizeRegionName(cleanedName);
  
          if (this.debugMode && cleanedName !== normalizedName) {
            console.log('[SpatialHandler] Name normalization:', {
              original: feature.properties.shapeName,
              cleaned: cleanedName,
              normalized: normalizedName
            });
          }
  
          return {
            original: feature.properties.shapeName,
            cleaned: cleanedName,
            normalized: normalizedName,
            geometry: feature.geometry
          };
        });
  
      // Store in cache
      processedFeatures.forEach(feature => {
        this.geometryCache.set(feature.normalized, {
          geometry: feature.geometry,
          properties: {
            shapeName: feature.cleaned,
            normalizedName: feature.normalized,
            originalName: feature.original
          }
        });
  
        // Cache additional mappings
        this.regionMappingCache.set(feature.original.toLowerCase(), feature.normalized);
        this.regionMappingCache.set(feature.normalized, feature.normalized);
        this.regionMappingCache.set(feature.cleaned.toLowerCase(), feature.normalized);
      });
  
      if (this.debugMode) {
        console.log('[SpatialHandler] Geometry initialized:', {
          featureCount: processedFeatures.length,
          regions: Array.from(this.geometryCache.keys())
        });
      }
  
      return this.geometryCache;
  
    } catch (error) {
      console.error('[SpatialHandler] Geometry initialization failed:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async initializeCoordinates() {
    if (this.coordinateCache.size > 0) return;
    
    try {
      const geojsonData = await this.initializeGeometry();
      
      // Process coordinates from GeoJSON features
      geojsonData.forEach(feature => {
        const regionName = this.normalizeRegionName(
          feature.properties?.shapeName
        );
        if (regionName && feature.geometry?.coordinates) {
          // Store centroid for region
          const centroid = this.calculateCentroid(
            feature.geometry.coordinates
          );
          this.coordinateCache.set(regionName, centroid);
        }
      });
    } catch (error) {
      console.error('[SpatialHandler] Failed to initialize coordinates:', error);
      throw error;
    }
  }

  // ===========================
  // Centroid Calculation
  // ===========================

  calculateCentroid(coordinates) {
    try {
      // Handle different geometry types
      if (!Array.isArray(coordinates)) {
        console.warn('[SpatialHandler] Invalid coordinates format');
        return null;
      }
  
      // Important fix: GeoJSON is in EPSG:32638 but we need WGS84
      const transform = (point) => {
        const [x, y] = point;
        return [y, x]; // Placeholder - needs actual transformation
      };
  
      // MultiPolygon - array of polygons
      if (Array.isArray(coordinates[0][0][0])) {
        const allPoints = coordinates.flat(2);
        return this.calculateCentroidFromPoints(allPoints.map(transform));
      }
      
      // Polygon - array of rings
      if (Array.isArray(coordinates[0][0])) {
        return this.calculateCentroidFromPoints(coordinates[0].map(transform));
      }
  
      return null;
    } catch (error) {
      console.error('[SpatialHandler] Centroid calculation failed:', error);
      return null;
    }
  }

  calculateCentroidFromPoints(points) {
    if (!Array.isArray(points) || points.length === 0) return null;

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const point of points) {
      if (Array.isArray(point) && point.length >= 2) {
        // GeoJSON coordinates are [longitude, latitude]
        sumX += point[0];
        sumY += point[1];
        count++;
      }
    }

    if (count === 0) return null;

    return {
      longitude: sumX / count,
      latitude: sumY / count
    };
  }

  // ===========================
  // Data Loading Methods
  // ===========================

  async loadPreprocessedData(commodity) {
    try {
      const normalizedCommodity = this.normalizeCommodityName(commodity);
      const filePath = `/data/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedCommodity}.json`;
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      
      // Use the new sanitizeJsonText method
      const sanitizedText = this.sanitizeJsonText(text);
      
      try {
        const data = JSON.parse(sanitizedText);
        
        if (!this.validatePreprocessedData(data)) {
          throw new Error('Invalid data structure');
        }
        
        return this.enhanceWithRealtimeMetrics(data);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse data: ' + parseError.message);
      }
    } catch (error) {
      console.error('Preprocessed data load failed:', error);
      throw error;
    }
  }

  async loadFlowDataWithRecovery(commodity) {
    try {
      const data = await this.loadFlowData(commodity);
      return data;
    } catch (error) {
      console.error('[SpatialHandler] Flow data load failed:', error);
      
      // Attempt recovery from backup or alternative source
      try {
        const backupData = await this.loadBackupFlowData(commodity);
        return backupData;
      } catch (backupError) {
        console.error('[SpatialHandler] Backup flow data load failed:', backupError);
        return [];
      }
    }
  }

  async loadFlowData(commodity) {
    try {
      // Get preprocessed data path
      const preprocessedPath = this.getPreprocessedDataPath(commodity);
      
      // Use the cache if available
      const cacheKey = `flow_${commodity}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await window.fs.readFile(preprocessedPath, { encoding: 'utf8' });
      const data = JSON.parse(this.sanitizeJsonText(response));

      if (!data.flow_analysis) {
        throw new Error('Flow analysis data not found in preprocessed file');
      }

      // Process flow data
      const processedFlows = this.processFlowAnalysis(data.flow_analysis);

      // Cache the results
      this.cache.set(cacheKey, {
        data: processedFlows,
        timestamp: Date.now()
      });

      return processedFlows;

    } catch (error) {
      console.error('[SpatialHandler] Failed to load flow data:', error);
      throw error;
    }
  }

  async loadRegressionAnalysis(commodity) {
    try {
      const cacheKey = `regression_${commodity}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached?.data && Date.now() - cached.timestamp < this.cacheConfig.TTL) {
        return cached.data;
      }
  
      // Add retry mechanism
      const retryOptions = {
        maxAttempts: 3,
        delay: 1000,
        backoff: 2
      };
  
      let lastError;
      for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
        try {
          const data = await this.fetchRegressionData(commodity);
          if (data && this.validateRegressionData(data)) {
            this.cache.set(cacheKey, {
              data,
              timestamp: Date.now()
            });
            return data;
          }
        } catch (error) {
          lastError = error;
          if (attempt < retryOptions.maxAttempts) {
            await new Promise(resolve => 
              setTimeout(resolve, retryOptions.delay * Math.pow(retryOptions.backoff, attempt - 1))
            );
          }
        }
      }
  
      throw lastError || new Error('Failed to load regression data');
    } catch (error) {
      console.error('[SpatialHandler] Regression analysis load failed:', {
        error: error.message,
        commodity
      });
      return DEFAULT_REGRESSION_DATA;
    }
  }

  // ===========================
  // Data Processing Methods
  // ===========================

  processFlowDataSafely(data) {
    return data.map(row => {
      try {
        return this.processFlowRow(row);
      } catch (error) {
        console.warn('[SpatialHandler] Error processing flow row:', error);
        return null;
      }
    }).filter(Boolean);
  }

  processFlowData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Invalid flow data structure: expected array');
    }

    return data.map(row => ({
      source: this.normalizeRegionName(row.source),
      target: this.normalizeRegionName(row.target),
      source_coordinates: this.coordinateCache.get(row.source),
      target_coordinates: this.coordinateCache.get(row.target),
      flow_weight: Number(row.flow_weight) || 0,
      // [Keep existing fields]
    })).filter(flow => 
      flow.source_coordinates && 
      flow.target_coordinates &&
      !this.excludedRegions.has(flow.source) &&
      !this.excludedRegions.has(flow.target)
    );
  }

  processFlowRow(row) {
    if (!row || typeof row !== 'object') return null;

    const source = this.normalizeRegionName(row.source);
    const target = this.normalizeRegionName(row.target);

    // Skip excluded regions
    if (this.excludedRegions.has(source) || this.excludedRegions.has(target)) {
      return null;
    }

    return {
      source,
      target,
      commodity: row.commodity?.trim?.(),
      price_differential: Number(row.price_differential) || 0,
      source_price: Number(row.source_price) || 0,
      target_price: Number(row.target_price) || 0,
      flow_weight: Number(row.flow_weight) || 0
    };
  }

  processFlowAnalysis(flows) {
    if (!Array.isArray(flows)) {
      console.warn('[SpatialHandler] Invalid flow data structure');
      return [];
    }

    return flows.map(flow => ({
      source: this.normalizeRegionName(flow.source),
      target: this.normalizeRegionName(flow.target),
      total_flow: this.sanitizeNumericValue(flow.total_flow),
      avg_flow: this.sanitizeNumericValue(flow.avg_flow),
      flow_count: flow.flow_count || 0,
      avg_price_differential: this.sanitizeNumericValue(flow.avg_price_differential)
    })).filter(flow => 
      flow.source && 
      flow.target && 
      !this.excludedRegions.has(flow.source) && 
      !this.excludedRegions.has(flow.target)
    );
  }

  processTimeSeriesData(data) {
    if (!Array.isArray(data)) return [];

    return data.map(entry => ({
      month: entry.month,
      avgUsdPrice: this.sanitizeNumericValue(entry.avgUsdPrice),
      volatility: this.sanitizeNumericValue(entry.volatility),
      sampleSize: entry.sampleSize,
      conflict_intensity: this.sanitizeNumericValue(entry.conflict_intensity),
      garch_volatility: this.sanitizeNumericValue(entry.garch_volatility),
      price_stability: this.sanitizeNumericValue(entry.price_stability)
    }));
  }

  processMarketShocks(shocks) {
    if (!Array.isArray(shocks)) return [];

    return shocks.map(shock => ({
      region: this.normalizeRegionName(shock.region),
      date: shock.date,
      shock_type: shock.shock_type,
      magnitude: this.sanitizeNumericValue(shock.magnitude),
      previous_price: this.sanitizeNumericValue(shock.previous_price),
      current_price: this.sanitizeNumericValue(shock.current_price)
    })).filter(shock => shock.region && shock.magnitude);
  }

  processClusterEfficiency(efficiency) {
    if (!Array.isArray(efficiency)) return [];

    return efficiency.map(cluster => ({
      cluster_id: cluster.cluster_id,
      internal_connectivity: this.sanitizeNumericValue(cluster.internal_connectivity),
      market_coverage: this.sanitizeNumericValue(cluster.market_coverage),
      price_convergence: this.sanitizeNumericValue(cluster.price_convergence),
      stability: this.sanitizeNumericValue(cluster.stability),
      efficiency_score: this.sanitizeNumericValue(cluster.efficiency_score)
    }));
  }

  processSpatialAutocorrelation(autocorrelation) {
    if (!autocorrelation?.global || !autocorrelation?.local) {
      return { global: null, local: null };
    }

    const processedGlobal = {
      moran_i: this.sanitizeNumericValue(autocorrelation.global.moran_i),
      p_value: autocorrelation.global.p_value,
      z_score: autocorrelation.global.z_score,
      significance: autocorrelation.global.significance
    };

    const processedLocal = {};
    for (const [region, values] of Object.entries(autocorrelation.local)) {
      const normalizedRegion = this.normalizeRegionName(region);
      processedLocal[normalizedRegion] = {
        local_i: this.sanitizeNumericValue(values.local_i),
        p_value: values.p_value,
        cluster_type: values.cluster_type
      };
    }

    return {
      global: processedGlobal,
      local: processedLocal
    };
  }

  processSeasonalAnalysis(seasonal) {
    if (!seasonal?.seasonal_pattern) return null;

    return {
      seasonal_strength: this.sanitizeNumericValue(seasonal.seasonal_strength),
      trend_strength: this.sanitizeNumericValue(seasonal.trend_strength),
      peak_month: seasonal.peak_month,
      trough_month: seasonal.trough_month,
      seasonal_pattern: seasonal.seasonal_pattern.map(value => 
        this.sanitizeNumericValue(value)
      )
    };
  }

  processConflictMetrics(metrics) {
    if (!Array.isArray(metrics)) return [];

    return metrics.map(metric => ({
      month: metric.month,
      adjusted_price: this.sanitizeNumericValue(metric.adjusted_price)
    }));
  }

  processMarketIntegration(integration) {
    if (!integration?.price_correlation) return null;

    const processedCorrelation = {};
    for (const [region, correlations] of Object.entries(integration.price_correlation)) {
      const normalizedRegion = this.normalizeRegionName(region);
      processedCorrelation[normalizedRegion] = {};
      
      for (const [r, value] of Object.entries(correlations)) {
        const normalizedR = this.normalizeRegionName(r);
        processedCorrelation[normalizedRegion][normalizedR] = 
          this.sanitizeNumericValue(value);
      }
    }

    return {
      price_correlation: processedCorrelation,
      flow_density: this.sanitizeNumericValue(integration.flow_density),
      accessibility: integration.accessibility,
      integration_score: this.sanitizeNumericValue(integration.integration_score)
    };
  }

  processRegressionAnalysis(data) {
    if (!data) return DEFAULT_REGRESSION_DATA;
  
    try {
      return {
        model: {
          coefficients: data.coefficients || {},
          intercept: this.sanitizeNumericValue(data.intercept),
          p_values: data.p_values || {},
          r_squared: this.sanitizeNumericValue(data.r_squared),
          adj_r_squared: this.sanitizeNumericValue(data.adj_r_squared),
          mse: this.sanitizeNumericValue(data.mse),
          observations: data.observations || 0
        },
        spatial: {
          moran_i: {
            I: this.sanitizeNumericValue(data.moran_i?.I),
            'p-value': this.sanitizeNumericValue(data.moran_i?.['p-value'])
          },
          vif: Array.isArray(data.vif) ? data.vif.map(v => ({
            Variable: v.Variable,
            VIF: this.sanitizeNumericValue(v.VIF)
          })) : []
        },
        residuals: this.processResiduals(data.residual || [])
      };
    } catch (error) {
      console.error('[SpatialHandler] Error processing regression analysis:', error);
      return DEFAULT_REGRESSION_DATA;
    }
  }

  processResiduals(residuals) {
    if (!Array.isArray(residuals)) return [];

    // Process and group residuals by region
    const byRegion = residuals.reduce((acc, r) => {
      if (!r.region_id || !r.date) return acc;
      
      if (!acc[r.region_id]) {
        acc[r.region_id] = [];
      }
      
      acc[r.region_id].push({
        date: new Date(r.date).toISOString(),
        residual: this.sanitizeNumericValue(r.residual)
      });
      
      return acc;
    }, {});

    // Calculate residual statistics
    const allResiduals = residuals.map(r => r.residual).filter(r => !isNaN(r));
    const stats = {
      mean: allResiduals.reduce((a, b) => a + b, 0) / allResiduals.length || 0,
      variance: this.calculateVariance(allResiduals),
      maxAbsolute: Math.max(...allResiduals.map(Math.abs)) || 0
    };

    return {
      raw: residuals.map(r => ({
        region_id: r.region_id,
        date: new Date(r.date).toISOString(),
        residual: this.sanitizeNumericValue(r.residual)
      })),
      byRegion,
      stats
    };
  }

  calculateVariance(arr) {
    if (!arr.length) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  }

  // ===========================
  // Data Enhancement Methods
  // ===========================

  async enhanceWithRealtimeMetrics(data) {
    try {
      // Deep clone the data to avoid mutations
      const enhancedData = _.cloneDeep(data);

      // Check if we need to enhance the data
      if (this.shouldEnhanceData(enhancedData)) {
        // Add GARCH volatility if missing
        if (!enhancedData.time_series_data?.[0]?.garch_volatility) {
          enhancedData.time_series_data = this.addGarchVolatility(enhancedData.time_series_data);
        }

        // Add price stability if missing
        if (!enhancedData.time_series_data?.[0]?.price_stability) {
          enhancedData.time_series_data = this.addPriceStability(enhancedData.time_series_data);
        }

        // Enhance market integration metrics if needed
        if (!enhancedData.market_integration?.integration_score) {
          enhancedData.market_integration = await this.enhanceMarketIntegration(enhancedData.market_integration);
        }

        // Add metadata about enhancement
        enhancedData.metadata = {
          ...enhancedData.metadata,
          enhanced: true,
          enhancement_date: new Date().toISOString(),
          enhancement_version: '1.0'
        };
      }

      return enhancedData;
    } catch (error) {
      console.warn('Error enhancing data:', error);
      // Return original data if enhancement fails
      return data;
    }
  }

  shouldEnhanceData(data) {
    // Check if data needs enhancement based on missing metrics
    return !data.time_series_data?.[0]?.garch_volatility ||
           !data.time_series_data?.[0]?.price_stability ||
           !data.market_integration?.integration_score;
  }

  addGarchVolatility(timeSeriesData) {
    if (!Array.isArray(timeSeriesData)) return timeSeriesData;

    return timeSeriesData.map(entry => ({
      ...entry,
      garch_volatility: entry.garch_volatility ?? this.calculateGarchVolatility(entry)
    }));
  }

  calculateGarchVolatility(entry) {
    // Simple volatility calculation as fallback
    const price = entry.avgUsdPrice;
    if (!price) return 0;
    return Math.abs(price - (entry.previous_price ?? price)) / price;
  }

  addPriceStability(timeSeriesData) {
    if (!Array.isArray(timeSeriesData)) return timeSeriesData;

    return timeSeriesData.map((entry, index) => ({
      ...entry,
      price_stability: entry.price_stability ?? this.calculatePriceStability(timeSeriesData, index)
    }));
  }

  calculatePriceStability(timeSeriesData, currentIndex) {
    // Simple rolling stability calculation
    const windowSize = 3;
    const startIndex = Math.max(0, currentIndex - windowSize + 1);
    const window = timeSeriesData.slice(startIndex, currentIndex + 1);
    
    const prices = window.map(d => d.avgUsdPrice).filter(p => p != null);
    if (prices.length < 2) return 1;

    const std = Math.sqrt(
      prices.reduce((sum, price) => sum + Math.pow(price - prices[0], 2), 0) / prices.length
    );
    
    return 1 / (1 + std);
  }

  async enhanceMarketIntegration(marketIntegration) {
    if (!marketIntegration) return {};

    return {
      ...marketIntegration,
      integration_score: marketIntegration.integration_score ?? 
        this.calculateIntegrationScore(marketIntegration)
    };
  }

  calculateIntegrationScore(marketIntegration) {
    const weights = {
      price_correlation: 0.4,
      flow_density: 0.3,
      accessibility: 0.3
    };

    // Calculate weighted average of available metrics
    let score = 0;
    let totalWeight = 0;

    if (marketIntegration.price_correlation) {
      score += weights.price_correlation * this.calculateAverageCorrelation(marketIntegration.price_correlation);
      totalWeight += weights.price_correlation;
    }

    if (typeof marketIntegration.flow_density === 'number') {
      score += weights.flow_density * marketIntegration.flow_density;
      totalWeight += weights.flow_density;
    }

    if (marketIntegration.accessibility) {
      score += weights.accessibility * this.calculateAverageAccessibility(marketIntegration.accessibility);
      totalWeight += weights.accessibility;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  calculateAverageCorrelation(correlationMatrix) {
    if (!correlationMatrix || typeof correlationMatrix !== 'object') return 0;

    let sum = 0;
    let count = 0;

    Object.values(correlationMatrix).forEach(correlations => {
      if (typeof correlations === 'object') {
        Object.values(correlations).forEach(value => {
          if (typeof value === 'number' && !isNaN(value)) {
            sum += value;
            count++;
          }
        });
      }
    });

    return count > 0 ? sum / count : 0;
  }

  calculateAverageAccessibility(accessibility) {
    if (!accessibility || typeof accessibility !== 'object') return 0;

    const values = Object.values(accessibility)
      .filter(value => typeof value === 'number' && !isNaN(value));

    return values.length > 0 ? 
      values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  // ===========================
  // Data Sanitization Methods
  // ===========================

  sanitizeNumericValues(data) {
    if (!data || typeof data !== 'object') return;

    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object') {
        // Recursively process nested objects and arrays
        this.sanitizeNumericValues(value);
      } else if (typeof value === 'number') {
        // Replace invalid numeric values with null
        if (Number.isNaN(value) || !Number.isFinite(value)) {
          data[key] = null;
        }
      }
    }
  }

  sanitizeNumericValue(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null;
    }
    return typeof value === 'number' ? value : Number(value);
  }

  sanitizeJsonText(text) {
    if (!text) return '';
    
    return text
      // Replace NaN values with null
      .replace(/:\s*NaN/g, ': null')
      // Replace Infinity values with null
      .replace(/:\s*Infinity/g, ': null')
      .replace(/:\s*-Infinity/g, ': null')
      // Handle undefined values
      .replace(/:\s*undefined/g, ': null')
      // Clean up any potential invalid numeric strings
      .replace(/:\s*"(NaN|Infinity|-Infinity)"/g, ': null')
      // Handle empty values
      .replace(/:\s*""/g, ': null')
      // Clean up any trailing commas in arrays or objects
      .replace(/,(\s*[}\]])/g, '$1');
  }

  // ===========================
  // Utility Methods
  // ===========================

  cleanShapeName(name) {
    if (!name) return '';
    return name
      .replace(/_governorate$/i, '')
      .replace(/\s+governorate$/i, '')
      .replace(/^_+/, '')
      .replace(/_+/g, ' ')
      .trim();
  }

  filterFlowsByCommodity(data, commodity) {
    const normalizedCommodity = commodity.toLowerCase().trim();
    return data.filter(row => {
      const rowCommodity = row.commodity?.toLowerCase?.()?.trim?.();
      return rowCommodity === normalizedCommodity;
    });
  }

  filterByDate(data, targetDate) {
    if (!targetDate || !Array.isArray(data)) return data;

    const parsedTargetDate = new Date(targetDate);
    if (isNaN(parsedTargetDate)) {
      console.warn('[SpatialHandler] Invalid target date:', targetDate);
      return data;
    }

    return data.filter((item) => {
      const itemDateStr = item.date || item.month || item.date_observed;
      if (!itemDateStr) return false;

      const itemDate = new Date(itemDateStr);
      if (isNaN(itemDate)) return false;

      return (
        itemDate.getFullYear() === parsedTargetDate.getFullYear() &&
        itemDate.getMonth() === parsedTargetDate.getMonth()
      );
    });
  }

  // ===========================
  // Data Processing Pipeline
  // ===========================

  async getSpatialData(selectedCommodity, date) {
    const commodity = selectedCommodity?.toLowerCase().trim() || 'beans (kidney red)';
    const cacheKey = `${commodity}_${date || 'all'}`;
    
    try {
      // Load preprocessed data 
      const preprocessed = await this.loadPreprocessedData(commodity);
      
      // Validate and process flow data specifically
      const flowData = preprocessed.flow_analysis ? 
        this.processFlowAnalysis(preprocessed.flow_analysis) : [];

      const result = {
        ...preprocessed,
        flowMaps: flowData,
        timeSeriesData: preprocessed.time_series_data || [],
        marketClusters: preprocessed.market_clusters || [],
        marketShocks: preprocessed.market_shocks || [],
        spatialAutocorrelation: preprocessed.spatial_autocorrelation || {},
        geoJSON: preprocessed.geoJSON || await this.getDefaultGeoJSON(), // Add this line
        metadata: {
          ...preprocessed.metadata,
          flowDataUpdated: new Date().toISOString()
        }
      };

      return result;
    } catch (error) {
      console.error('[SpatialHandler] Failed to get spatial data:', error);
      throw error;
    }
  }

  processAllData(geometryData, preprocessed, flows, date) {
    if (!preprocessed?.time_series_data) {
      throw new Error('Missing time series data');
    }
    const filteredFlows = this.filterByDate(flows, date);
    const processedData = this.processMarketClusters(
      preprocessed.market_clusters,
      preprocessed.time_series_data,
      date
    );

    return {
      timeSeriesData: preprocessed.time_series_data,
      marketClusters: preprocessed.market_clusters,
      marketShocks: preprocessed.market_shocks,
      clusterEfficiency: preprocessed.cluster_efficiency,
      flowAnalysis: preprocessed.flow_analysis,
      spatialAutocorrelation: preprocessed.spatial_autocorrelation,
      seasonalAnalysis: preprocessed.seasonal_analysis,
      marketIntegration: preprocessed.market_integration,
      metadata: preprocessed.metadata,
      geoJSON: this.createGeoJSON(processedData.features),
      flowMaps: flows
    };
  }

  processMarketClusters(clusters, timeData, date) {
    if (!Array.isArray(clusters) || !Array.isArray(timeData)) {
      throw new Error('Invalid clusters or time data');
    }

    const features = [];
    const processedClusters = [];
    const relevantTimeData = this.filterByDate(timeData, date);

    for (const cluster of clusters) {
      try {
        const clusterFeatures = this.processClusterFeatures(cluster, relevantTimeData);
        features.push(...clusterFeatures);

        const mainMarketFeature = clusterFeatures.find(
          (f) => f.properties.isMainMarket && 
                 f.properties.region_id === this.normalizeRegionName(cluster.main_market)
        );

        const mainMarketCoordinates = mainMarketFeature?.geometry?.coordinates;

        processedClusters.push({
          ...cluster,
          processed_markets: clusterFeatures.map((f) => f.properties.region_id),
          main_market_coordinates: mainMarketCoordinates
            ? { lat: mainMarketCoordinates[1], lng: mainMarketCoordinates[0] }
            : null,
        });
      } catch (error) {
        console.warn(`[SpatialHandler] Error processing cluster:`, { 
          cluster_id: cluster.cluster_id,
          error: error.message 
        });
      }
    }

    return {
      clusters: processedClusters,
      features,
      timeData: relevantTimeData,
    };
  }

  processClusterFeatures(cluster, timeData) {
    if (!cluster?.main_market || !Array.isArray(cluster.connected_markets)) {
      throw new Error('Invalid cluster structure');
    }

    const features = [];
    const processedMarkets = new Set();

    const addFeature = (marketId, isMain) => {
      if (!marketId || processedMarkets.has(marketId)) return;

      const normalizedMarketId = this.normalizeRegionName(marketId);
      if (!normalizedMarketId) return;

      const geometry = this.geometryCache.get(normalizedMarketId);
      if (!geometry) {
        console.warn(`[SpatialHandler] No geometry found for market: "${marketId}" (normalized: "${normalizedMarketId}")`);
        return;
      }

      const marketData = timeData.find(d => 
        this.normalizeRegionName(d.region || d.admin1) === normalizedMarketId
      ) || {};

      features.push({
        type: 'Feature',
        properties: {
          region_id: normalizedMarketId,
          originalName: geometry.properties.originalName,
          isMainMarket: isMain,
          cluster_id: cluster.cluster_id,
          market_count: cluster.market_count,
          ...marketData,
        },
        geometry: geometry.geometry
      });

      processedMarkets.add(marketId);
    };

    // Process main market first
    addFeature(cluster.main_market, true);

    // Process connected markets
    cluster.connected_markets.forEach(market => {
      addFeature(market, false);
    });

    return features;
  }

  createGeoJSON(features) {
    if (!Array.isArray(features)) {
      throw new Error('Invalid features array');
    }

    return {
      type: 'FeatureCollection',
      features: features
        .filter((f) => f && f.geometry)
        .map((f) => {
          const properties = {
            ...f.properties,
            region_id: this.normalizeRegionName(
              f.properties.region_id || f.properties.admin1 || f.properties.region
            ),
            date: f.properties.date || f.properties.month || null,
            commodity: f.properties.commodity || null,
          };

          let geometry = { ...f.geometry };
          if (geometry.type === 'Point') {
            const [lng, lat] = geometry.coordinates;
            geometry.coordinates = [lat, lng];
          }

          return {
            type: 'Feature',
            properties,
            geometry,
          };
        }),
    };
  }

  processRegressionAnalysis(data) {
    if (!data) return DEFAULT_REGRESSION_DATA;
  
    try {
      return {
        model: {
          coefficients: data.coefficients || {},
          intercept: this.sanitizeNumericValue(data.intercept),
          p_values: data.p_values || {},
          r_squared: this.sanitizeNumericValue(data.r_squared),
          adj_r_squared: this.sanitizeNumericValue(data.adj_r_squared),
          mse: this.sanitizeNumericValue(data.mse),
          observations: data.observations || 0
        },
        spatial: {
          moran_i: {
            I: this.sanitizeNumericValue(data.moran_i?.I),
            'p-value': this.sanitizeNumericValue(data.moran_i?.['p-value'])
          },
          vif: Array.isArray(data.vif) ? data.vif.map(v => ({
            Variable: v.Variable,
            VIF: this.sanitizeNumericValue(v.VIF)
          })) : []
        },
        residuals: this.processResiduals(data.residual || [])
      };
    } catch (error) {
      console.error('[SpatialHandler] Error processing regression analysis:', error);
      return DEFAULT_REGRESSION_DATA;
    }
  }

  // ===========================
  // Regression Data Handling
  // ===========================

  async retryRegressionLoad(commodity, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try {
        const data = await this.loadRegressionAnalysis(commodity);
        if (data !== DEFAULT_REGRESSION_DATA) {
          return data;
        }
      } catch (error) {
        console.warn(`Retry ${i + 1}/${attempts} failed for commodity "${commodity}":`, error);
      }
    }
    // After all retries, return default data
    return DEFAULT_REGRESSION_DATA;
  }

  // ===========================
  // Market Clusters Validation
  // ===========================

  validateMarketConnections(cluster) {
    // Implement validation logic for market connections if needed
    // Placeholder implementation
    return true;
  }

  // ===========================
  // Main Data Retrieval Method
  // ===========================

  async getSpatialData(selectedCommodity, date) {
    const commodity = selectedCommodity?.toLowerCase().trim() || 'beans (kidney red)';
    const cacheKey = `${commodity}_${date || 'all'}`;
    
    try {
      // Load preprocessed data 
      const preprocessed = await this.loadPreprocessedData(commodity);
      
      // Validate and process flow data specifically
      const flowData = preprocessed.flow_analysis ? 
        this.processFlowAnalysis(preprocessed.flow_analysis) : [];

      const result = {
        ...preprocessed,
        flowMaps: flowData,
        // Ensure other data remains unchanged
        timeSeriesData: preprocessed.time_series_data || [],
        marketClusters: preprocessed.market_clusters || [],
        marketShocks: preprocessed.market_shocks || [],
        spatialAutocorrelation: preprocessed.spatial_autocorrelation || {},
        metadata: {
          ...preprocessed.metadata,
          flowDataUpdated: new Date().toISOString()
        }
      };

      return result;

    } catch (error) {
      console.error('[SpatialHandler] Failed to get spatial data:', error);
      throw error;
    }
  }

  async getDefaultGeoJSON() {
    try {
      const geometry = await this.initializeGeometry();
      if (!geometry) {
        return this.defaultGeoJSON;
      }
      return this.createGeoJSON(Array.from(geometry.values()));
    } catch (error) {
      console.warn('[SpatialHandler] Failed to get default GeoJSON:', error);
      return this.defaultGeoJSON;
    }
  }

  // ===========================
  // GeoJSON Creation
  // ===========================

  createGeoJSON(features) {
    if (!Array.isArray(features)) {
      throw new Error('Invalid features array');
    }

    return {
      type: 'FeatureCollection',
      features: features
        .filter((f) => f && f.geometry)
        .map((f) => {
          const properties = {
            ...f.properties,
            region_id: this.normalizeRegionName(
              f.properties.region_id || f.properties.admin1 || f.properties.region
            ),
            date: f.properties.date || f.properties.month || null,
            commodity: f.properties.commodity || null,
          };

          let geometry = { ...f.geometry };
          if (geometry.type === 'Point') {
            const [lng, lat] = geometry.coordinates;
            geometry.coordinates = [lat, lng];
          }

          return {
            type: 'Feature',
            properties,
            geometry,
          };
        }),
    };
  }

  // ===========================
  // Additional Helper Methods
  // ===========================

  // [Any additional helper methods can be placed here]

}

export const spatialHandler = new SpatialDataHandler();