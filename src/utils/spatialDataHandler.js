// src/utils/spatialDataHandler.js

import Papa from 'papaparse';
import _ from 'lodash';
import { excludedRegions } from './appUtils';
import { 
  getPrecomputedDataPath, 
  getNetworkDataPath,
  getChoroplethDataPath,
  enhancedFetchJson 
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
  

class SpatialDataHandler {
  constructor() {
    this.cache = new Map();
    this.geometryCache = null;
    this.regionMappingCache = new Map();
    this.excludedRegions = new Set(
      excludedRegions.map((region) => this.normalizeRegionName(region))
    );
    this.missingGeometryWarnings = new Set();
    this.debugMode = process.env.NODE_ENV === 'development';
  }

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

  async initializeGeometry() {
    if (this.geometryCache) return this.geometryCache;
  
    try {
      const geojsonPath = getChoroplethDataPath('geoBoundaries-YEM-ADM1.geojson');
      
      if (this.debugMode) {
        console.log('[SpatialHandler] Loading geometry:', { path: geojsonPath });
      }
  
      // Read GeoJSON file
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
  
  cleanShapeName(name) {
    if (!name) return '';
    return name
      .replace(/_governorate$/i, '')
      .replace(/\s+governorate$/i, '')
      .replace(/^_+/, '')
      .replace(/_+/g, ' ')
      .trim();
  }

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

  async loadPreprocessedData(commodity) {
    try {
      const normalizedCommodity = this.normalizeCommodityName(commodity);
      const filePath = `/data/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedCommodity}.json`;
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      
      // Replace NaN values with null before parsing
      const sanitizedText = text
        .replace(/:\s*NaN/g, ': null')
        .replace(/:\s*Infinity/g, ': null')
        .replace(/:\s*-Infinity/g, ': null');
      
      const data = JSON.parse(sanitizedText);
      
      if (!this.validatePreprocessedData(data)) {
        throw new Error('Invalid data structure');
      }
      
      return data;
    } catch (error) {
      console.error('Preprocessed data load failed:', error);
      throw error;
    }
  }
  
  async loadFlowData(selectedCommodity = null) {
    try {
      if (this.debugMode) {
        console.log('[SpatialHandler] Loading flow data:', { selectedCommodity });
      }

      // Load CSV data
      const data = await pathResolver.loadFile(
        'network_data', 
        'time_varying_flows.csv',
        { contentType: 'csv' }
      );

      // Validate and process data
      const processedData = this.processFlowData(data);

      // Filter by commodity if needed
      if (selectedCommodity) {
        return this.filterFlowsByCommodity(processedData, selectedCommodity);
      }

      return processedData;

    } catch (error) {
      console.error('[SpatialHandler] Flow data load failed:', {
        error: error.message,
        stack: error.stack,
        selectedCommodity
      });
      throw error;
    }
  }

  validatePreprocessedData(data) {
    if (!data || typeof data !== 'object') return false;
    
    const required = [
      'time_series_data',
      'market_clusters',
      'market_shocks'
    ];
  
    const missing = required.filter(field => !data[field]);
    if (missing.length) {
      console.warn('Missing fields:', missing);
      return false;
    }
  
    if (!Array.isArray(data.time_series_data)) {
      console.warn('time_series_data is not an array');
      return false;
    }
  
    return true;
  }

  processFlowData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Invalid flow data structure: expected array');
    }

    return data
      .filter(Boolean)
      .map(row => this.processFlowRow(row))
      .filter(Boolean);
  }

  filterFlowsByCommodity(data, commodity) {
    const normalizedCommodity = commodity.toLowerCase().trim();
    return data.filter(row => {
      const rowCommodity = row.commodity?.toLowerCase?.()?.trim?.();
      return rowCommodity === normalizedCommodity;
    });
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

  sanitizeNumericValue(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null;
    }
    return typeof value === 'number' ? value : Number(value);
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

  processFlowAnalysis(flows) {
    if (!Array.isArray(flows)) return [];

    return flows.map(flow => ({
      source: this.normalizeRegionName(flow.source),
      target: this.normalizeRegionName(flow.target),
      total_flow: this.sanitizeNumericValue(flow.total_flow),
      avg_flow: this.sanitizeNumericValue(flow.avg_flow),
      flow_count: flow.flow_count,
      avg_price_differential: this.sanitizeNumericValue(flow.avg_price_differential)
    })).filter(flow => flow.source && flow.target);
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

  async getSpatialData(selectedCommodity, date) {
    const commodity = selectedCommodity?.toLowerCase().trim() || 'beans (kidney red)'; // Fixed default
    const cacheKey = `${commodity}_${date || 'all'}`;
    
    try {
      console.log('Loading data for:', { commodity, date, cacheKey });
  
      // Load preprocessed data
      const preprocessed = await this.loadPreprocessedData(commodity);
      
      // Validate essential fields
      if (!preprocessed?.time_series_data) {
        throw new Error(`Invalid data structure: ${Object.keys(preprocessed || {})}`);
      }

      const filteredData = this.filterByDate(preprocessed.time_series_data, date);
  
      // Process data
      const result = {
        time_series_data: filteredData,
        market_clusters: preprocessed.market_clusters || [],
        market_shocks: preprocessed.market_shocks || [],
        cluster_efficiency: preprocessed.cluster_efficiency || [],
        flow_analysis: preprocessed.flow_analysis || [],
        spatial_autocorrelation: preprocessed.spatial_autocorrelation || {},
        seasonal_analysis: preprocessed.seasonal_analysis || {},
        market_integration: preprocessed.market_integration || {},
        metadata: preprocessed.metadata || {},
        regression_analysis: preprocessed.regression_analysis || DEFAULT_REGRESSION_DATA
      };
  
      // Add debug logging
      console.log('Processed result:', {
        timeSeriesCount: result.time_series_data.length,
        hasMarketClusters: Boolean(result.market_clusters.length)
      });
  
      return result;
  
    } catch (error) {
      console.error('Failed to get spatial data:', error);
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

  clearCache() {
    this.cache.clear();
    this.geometryCache = null;
    this.regionMappingCache.clear();
  }

  validateMarketClusters(clusters) {
    return clusters.every(cluster => (
      cluster.main_market && 
      Array.isArray(cluster.connected_markets) &&
      this.validateMarketConnections(cluster)
    ));
  }
}

export const spatialHandler = new SpatialDataHandler();