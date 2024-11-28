// src/utils/spatialDataHandler.js

import Papa from 'papaparse';
import _ from 'lodash';
import { excludedRegions } from './appUtils';
import { 
  getPrecomputedDataPath, 
  getNetworkDataPath,
  getChoroplethDataPath,
  enhancedFetchJson,
  getDataPath,
  getRegressionDataPath
} from './dataUtils';
import { pathResolver } from './pathResolver';
import { pathValidator } from '../utils/pathValidator';
import { DEFAULT_REGRESSION_DATA } from '../types/dataTypes';
import { VISUALIZATION_MODES } from '../constants/index';
import { workerManager } from './workerManager';
import PolygonNormalizer, { polygonNormalizer } from './polygonNormalizer';

// Default GeoJSON structure
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
  static _pendingRequests = new Map();
  static _instance = null;

  static getInstance() {
    if (!SpatialDataHandler._instance) {
      SpatialDataHandler._instance = new SpatialDataHandler();
    }
    return SpatialDataHandler._instance;
  }

  constructor() {
    if (SpatialDataHandler._instance) {
      return SpatialDataHandler._instance;
    }

    this.cache = new Map();
    this.geometryCache = null;      // For polygon boundaries
    this.pointCache = null;         // For market point locations
    this.coordinateCache = new Map(); // For normalized coordinates
    this.regionMappingCache = new Map();
    this.excludedRegions = new Set(
      excludedRegions.map((region) => polygonNormalizer.getNormalizedName(region))
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

  async deduplicateRequest(key, requestFn) {
    if (SpatialDataHandler._pendingRequests.has(key)) {
      return SpatialDataHandler._pendingRequests.get(key);
    }
  
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheConfig.TTL) {
      return cached.data;
    }
  
    const request = requestFn().then(data => {
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      SpatialDataHandler._pendingRequests.delete(key);
      return data;
    }).catch(error => {
      SpatialDataHandler._pendingRequests.delete(key);
      throw error;
    });
  
    SpatialDataHandler._pendingRequests.set(key, request);
    return request;
  }

  // ===========================
  // Cache Management
  // ===========================

  cleanupCache = () => {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheConfig.TTL) {
        this.cache.delete(key);
      }
    }
  };

  clearCache = () => {
    this.cache.clear();
    this.geometryCache = null;
    this.regionMappingCache.clear();
    this.coordinateCache.clear();
    this.pointCache = null;
  };

  // ===========================
  // Normalization Methods
  // ===========================

  convertUTMtoLatLng = (easting, northing) => {
    // Constants for UTM Zone 38N to WGS84 conversion
    const k0 = 0.9996;
    const a = 6378137;
    const e = 0.081819191;
    const e1sq = 0.006739497;
    const falseEasting = 500000;
    const zone = 38;

    const x = easting - falseEasting;
    const y = northing;

    const M = y / k0;
    const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64));

    const phi1 = mu + (3 * e1sq / 2 - 27 * Math.pow(e1sq, 3) / 32) * Math.sin(2 * mu);
    const phi2 = phi1 + (21 * Math.pow(e1sq, 2) / 16 - 55 * Math.pow(e1sq, 4) / 32) * Math.sin(4 * mu);
    const phi = phi2 + (151 * Math.pow(e1sq, 3) / 96) * Math.sin(6 * mu);

    const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi) * Math.sin(phi));
    const T1 = Math.tan(phi) * Math.tan(phi);
    const C1 = (e * e * Math.cos(phi) * Math.cos(phi)) / (1 - e * e);
    const R1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.sin(phi) * Math.sin(phi), 1.5);
    const D = x / (N1 * k0);

    const lat = phi - (N1 * Math.tan(phi) / R1) * (
      (D * D) / 2 -
      (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e * e) * Math.pow(D, 4) / 24 +
      (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e * e - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720
    );
    const lon = ((zone * 6 - 183) + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
      (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e * e + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120)
    ) / Math.cos(phi) * (180 / Math.PI);

    return {
      lat: lat * (180 / Math.PI),
      lng: lon
    };
  };

  normalizeRegionName = (name) => {
    if (!name) return null;
    return polygonNormalizer.getNormalizedName(name);
  };

  normalizeCommodityName = (commodity) => {
    if (!commodity) return '';
    return commodity.toLowerCase()
      .replace(/[()]/g, '') 
      .replace(/\s+/g, '_')
      .trim();
  };

  // ===========================
  // Validation Methods
  // ===========================

  validateGeoJSON = (data) => {
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
  };

  validateFlowData = (flows) => {
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
  };

  validateMarket = (market) => {
    const normalized = this.normalizeRegionName(market);
    return (
      normalized &&
      !this.excludedRegions.has(normalized) &&
      this.coordinateCache.has(normalized)
    );
  };

  validateFlowMetrics = (flow) => {
    return (
      typeof flow.flow_weight === 'number' &&
      flow.flow_weight >= 0 &&
      typeof flow.flow_count === 'number' &&
      flow.flow_count > 0
    );
  };

  validatePreprocessedData = (data) => {
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
  };

  validateRegressionData = (data) => {
    if (!data?.model || !data?.spatial || !data?.residuals) {
      console.warn('Missing required regression data sections');
      return false;
    }
  
    // Validate model section
    const modelValid = (
      typeof data.model.r_squared === 'number' &&
      typeof data.model.adj_r_squared === 'number' &&
      typeof data.model.mse === 'number' &&
      typeof data.model.intercept === 'number' &&
      typeof data.model.observations === 'number' &&
      data.model.coefficients &&
      Object.keys(data.model.coefficients).length > 0
    );
  
    if (!modelValid) {
      console.warn('Invalid model structure');
      return false;
    }
  
    // Validate spatial section
    const spatialValid = (
      data.spatial.moran_i &&
      typeof data.spatial.moran_i.I === 'number' &&
      typeof data.spatial.moran_i['p-value'] === 'number' &&
      Array.isArray(data.spatial.vif)
    );
  
    if (!spatialValid) {
      console.warn('Invalid spatial structure');
      return false;
    }
  
    // Validate residuals section
    const residualsValid = (
      Array.isArray(data.residuals.raw) &&
      typeof data.residuals.byRegion === 'object' &&
      data.residuals.stats &&
      typeof data.residuals.stats.mean === 'number' &&
      typeof data.residuals.stats.variance === 'number' &&
      typeof data.residuals.stats.maxAbsolute === 'number'
    );
  
    if (!residualsValid) {
      console.warn('Invalid residuals structure');
      return false;
    }
  
    return true;
  };

  validateMarketClusters = (clusters) => {
    return clusters.every(cluster => (
      cluster.main_market && 
      Array.isArray(cluster.connected_markets) &&
      this.validateMarketConnections(cluster)
    ));
  };

  validateMarketConnections = (cluster) => {
    // Implement specific validation logic if needed
    return true;
  };

  // ===========================
  // Data Initialization
  // ===========================

  initializeGeometry = async () => {
    if (this.geometryCache && this.geometryCache.size > 0) {
      return this.geometryCache;
    }
  
    try {
      const geojsonPath = getChoroplethDataPath('geoBoundaries-YEM-ADM1.geojson');
      const response = await fetch(geojsonPath);
  
      if (!response.ok) {
        throw new Error(`Failed to load geometry: ${response.status}`);
      }
  
      const polygonData = await response.json();
  
      if (!this.geometryCache) {
        this.geometryCache = new Map();
      }
  
      const processedFeatures = new Map();
  
      polygonData.features.forEach(feature => {
        if (!feature?.properties?.shapeName) return;
  
        const normalizedName = polygonNormalizer.getNormalizedName(feature.properties.shapeName);
  
        console.log(`Original name: ${feature.properties.shapeName}, Normalized name: ${normalizedName}`);
  
        if (!normalizedName) {
          console.warn('Unable to normalize region name:', feature.properties.shapeName);
          return;
        }
  
        if (!processedFeatures.has(normalizedName)) {
          processedFeatures.set(normalizedName, {
            type: 'polygon',
            geometry: feature.geometry,
            properties: {
              originalName: feature.properties.shapeName,
              normalizedName,
              shapeISO: feature.properties.shapeISO,
              region_id: normalizedName, // Ensure region_id is set to normalizedName
            },
          });
        }
      });
  
      this.geometryCache = processedFeatures;
  
      // Update mapping cache
      processedFeatures.forEach((value, key) => {
        this.regionMappingCache.set(value.properties.originalName.toLowerCase(), key);
        this.regionMappingCache.set(key, key);
      });
  
      return this.geometryCache;
  
    } catch (error) {
      console.error('Failed to initialize geometry:', error);
      throw error;
    }
  };

  initializePoints = async () => {
    if (this.pointCache) return this.pointCache;

    try {
      const response = await fetch(getDataPath('unified_data.geojson'));
      if (!response.ok) {
        throw new Error(`Failed to load points: ${response.status}`);
      }

      const pointData = await response.json();
      this.pointCache = new Map();

      const processFeature = (feature) => {
        if (!feature?.properties?.admin1) return null;

        const normalizedName = this.normalizeRegionName(feature.properties.admin1);
        if (!normalizedName) return null;

        const utmCoords = feature.geometry.coordinates;
        const latLng = this.convertUTMtoLatLng(utmCoords[0], utmCoords[1]);

        return {
          type: 'point',
          coordinates: [latLng.lng, latLng.lat],
          properties: {
            originalName: feature.properties.admin1,
            normalizedName,
            population: feature.properties.population,
            population_percentage: feature.properties.population_percentage
          }
        };
      };

      // Process features in chunks
      const chunkSize = 1000;
      const features = pointData.features || [];
      
      for (let i = 0; i < features.length; i += chunkSize) {
        const chunk = features.slice(i, i + chunkSize);
        chunk.forEach(feature => {
          const processed = processFeature(feature);
          if (processed) {
            this.pointCache.set(processed.properties.normalizedName, processed);
            this.coordinateCache.set(processed.properties.normalizedName, processed.coordinates);
          }
        });
      }

      return this.pointCache;

    } catch (error) {
      console.error('Failed to initialize points:', error);
      throw error;
    }
  };

  initializeCoordinates = async () => {
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
  };

  // ===========================
  // Centroid Calculation
  // ===========================

  calculateCentroid = (coordinates) => {
    try {
      if (!Array.isArray(coordinates)) {
        console.warn('[SpatialHandler] Invalid coordinates format');
        return null;
      }

      // MultiPolygon handling
      if (Array.isArray(coordinates[0][0][0])) {
        const allPoints = coordinates.flat(2);
        const centroid = this.calculateCentroidFromPoints(allPoints);
        return this.convertUTMtoLatLng(centroid.x, centroid.y);
      }
      
      // Polygon handling
      if (Array.isArray(coordinates[0][0])) {
        const centroid = this.calculateCentroidFromPoints(coordinates[0]);
        return this.convertUTMtoLatLng(centroid.x, centroid.y);
      }

      return null;
    } catch (error) {
      console.error('[SpatialHandler] Centroid calculation failed:', error);
      return null;
    }
  };

  calculateCentroidFromPoints = (points) => {
    if (!Array.isArray(points) || points.length === 0) return null;

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const point of points) {
      if (Array.isArray(point) && point.length >= 2) {
        sumX += point[0];
        sumY += point[1];
        count++;
      }
    }

    if (count === 0) return null;

    return {
      x: sumX / count,
      y: sumY / count
    };
  };

  // ===========================
  // Data Loading Methods
  // ===========================

  loadPreprocessedData = async (commodity) => {
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
};

loadFlowDataWithRecovery = async (commodity) => {
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
};

loadFlowData = async (commodity) => {
try {
// Get preprocessed data path
const preprocessedPath = getPrecomputedDataPath(commodity);

// Use the cache if available
const cacheKey = `flow_${commodity}`;
const cachedData = this.cache.get(cacheKey);
if (cachedData) {
  return cachedData.data;
}

const response = await fetch(preprocessedPath);
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();

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
};

loadBackupFlowData = async (commodity) => {
try {
// Define backup data path or logic here
const backupPath = `/data/backup_flow_data_${this.normalizeCommodityName(commodity)}.json`;
const response = await fetch(backupPath);
if (!response.ok) {
  throw new Error(`Backup HTTP error! status: ${response.status}`);
}
const data = await response.json();
return this.processFlowAnalysis(data.flow_analysis);
} catch (error) {
console.error('[SpatialHandler] Failed to load backup flow data:', error);
throw error;
}
};

loadRegressionAnalysis = async (selectedCommodity) => {
if (!selectedCommodity) {
console.warn('No commodity selected for regression analysis');
return DEFAULT_REGRESSION_DATA;
}

const metric = backgroundMonitor.startMetric('regression-data-fetch');

try {
// Get the cache key
const cacheKey = `regression_${selectedCommodity}`;
const cached = this.cache.get(cacheKey);

if (cached?.data) {
  console.debug('Using cached regression data for:', selectedCommodity);
  return cached.data;
}

// Get the regression data path
const analysisPath = getRegressionDataPath();
console.debug('Loading regression data from:', analysisPath);

// Fetch the data
const response = await fetch(analysisPath);
if (!response.ok) {
  console.error(`HTTP error! status: ${response.status}`);
  return DEFAULT_REGRESSION_DATA;
}

const text = await response.text();

// Sanitize and parse the JSON text
const sanitizedText = this.sanitizeJsonText(text);
let parsedData;
try {
  parsedData = JSON.parse(sanitizedText);
  if (!Array.isArray(parsedData)) {
    console.error('Invalid data format: expected array');
    return DEFAULT_REGRESSION_DATA;
  }
} catch (parseError) {
  console.error('JSON parse error:', parseError);
  return DEFAULT_REGRESSION_DATA;
}

// Normalize commodity name for comparison
const normalizedSearchCommodity = this.normalizeCommodityName(selectedCommodity);
console.debug('Normalized commodity name:', normalizedSearchCommodity);

// Find matching commodity data
const commodityAnalysis = parsedData.find(item => {
  const normalizedItemCommodity = this.normalizeCommodityName(item.commodity);
  return normalizedItemCommodity === normalizedSearchCommodity;
});

if (!commodityAnalysis) {
  console.warn(`No regression analysis found for commodity: ${selectedCommodity}`);
  return DEFAULT_REGRESSION_DATA;
}

// Transform the data to match our expected format
const processedAnalysis = {
  model: {
    coefficients: commodityAnalysis.coefficients || {},
    intercept: this.sanitizeNumericValue(commodityAnalysis.intercept),
    p_values: commodityAnalysis.p_values || {},
    r_squared: this.sanitizeNumericValue(commodityAnalysis.r_squared),
    adj_r_squared: this.sanitizeNumericValue(commodityAnalysis.adj_r_squared),
    mse: this.sanitizeNumericValue(commodityAnalysis.mse),
    observations: commodityAnalysis.observations || 0
  },
  spatial: {
    moran_i: commodityAnalysis.moran_i || { I: 0, 'p-value': 1 },
    vif: Array.isArray(commodityAnalysis.vif) ? commodityAnalysis.vif : []
  },
  residuals: this.processResiduals(commodityAnalysis.residual || [])
};

// Validate the processed data
if (!this.validateRegressionData(processedAnalysis)) {
  console.warn('Invalid regression data structure:', processedAnalysis);
  return DEFAULT_REGRESSION_DATA;
}

// Cache the valid results
this.cache.set(cacheKey, {
  data: processedAnalysis,
  timestamp: Date.now()
});

metric.finish({ status: 'success' });
return processedAnalysis;

} catch (error) {
console.error('Failed to load regression analysis:', error);
metric.finish({ status: 'error', error: error.message });
return DEFAULT_REGRESSION_DATA;
}
};

// ===========================
// Data Processing Methods
// ===========================

processFlowDataSafely = (data) => {
return data.map(row => {
try {
  return this.processFlowRow(row);
} catch (error) {
  console.warn('[SpatialHandler] Error processing flow row:', error);
  return null;
}
}).filter(Boolean);
};

processFlowData = (data) => {
if (!Array.isArray(data)) {
throw new Error('Invalid flow data structure: expected array');
}

return data.map(row => {
const source = this.normalizeRegionName(row.source);
const target = this.normalizeRegionName(row.target);

// Get coordinates from cache
const sourceCoords = this.coordinateCache.get(source);
const targetCoords = this.coordinateCache.get(target);

if (!sourceCoords || !targetCoords) {
  console.warn(`Missing coordinates for flow: ${source} -> ${target}`);
}

return {
  source,
  target,
  source_lat: sourceCoords?.lat || null,
  source_lng: sourceCoords?.lng || null,
  target_lat: targetCoords?.lat || null,
  target_lng: targetCoords?.lng || null,
  flow_weight: Number(row.flow_weight) || 0,
  // Keep other fields as needed
};
}).filter(flow => 
flow.source_lat != null && 
flow.source_lng != null && 
flow.target_lat != null && 
flow.target_lng != null &&
!this.excludedRegions.has(flow.source) &&
!this.excludedRegions.has(flow.target)
);
};

processFlowRow = (row) => {
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
};

processFlowAnalysis = (flows) => {
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
};

async processTimeSeriesData(data) {
  try {
    // Validate input data structure
    if (!data?.features || !Array.isArray(data.features)) {
      console.error('Invalid data format: Expected "features" array');
      return [];
    }

    console.debug('Starting timeSeriesData processing:', {
      featureCount: data.features.length,
      firstFeature: data.features?.[0]?.properties,
    });

    // Process each feature
    const timeSeriesData = data.features.map((feature) => {
      try {
        // Validate required properties
        if (!feature?.properties?.date || !feature?.properties?.region_id) {
          console.warn('Feature missing required properties:', feature);
          return null;
        }

        // Parse date and generate month string
        const date = new Date(feature.properties.date);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date format for feature:', feature);
          return null;
        }
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Normalize region ID
        const region_id = this.normalizeRegionName(
          feature.properties.region_id || feature.properties.admin1
        );

        // Construct the processed entry
        return {
          region: region_id, // Use normalized region ID
          month,
          usdPrice: feature.properties.usdprice ?? null,
          conflictIntensity: feature.properties.conflict_intensity ?? null,
          additionalProperties: {
            ...feature.properties,
            region: region_id, // Keep normalized region ID consistent
            population: feature.properties.population ?? null,
            conflict_intensity: feature.properties.conflict_intensity ?? null,
            commodity: feature.properties.commodity ?? null,
            regime: feature.properties.exchange_rate_regime || 'unified',
          },
        };
      } catch (featureError) {
        console.warn('Error processing feature:', feature, featureError);
        return null; // Skip invalid feature
      }
    }).filter(Boolean); // Remove null entries

    // Validate and filter processed data
    const validData = timeSeriesData.filter((entry) => {
      const isValid = Boolean(
        entry.region &&
        entry.usdPrice !== null &&
        !isNaN(entry.usdPrice)
      );

      if (!isValid) {
        console.warn('Invalid time series entry:', entry);
      }

      return isValid;
    });

    // Sort by region and month for consistent output
    const sortedData = _.sortBy(validData, ['region', 'month']);

    // Log summary
    console.debug('Time series processing complete:', {
      inputFeatures: data.features.length,
      outputEntries: sortedData.length,
      uniqueRegions: new Set(sortedData.map((d) => d.region)).size,
      uniqueMonths: new Set(sortedData.map((d) => d.month)).size,
      sampleEntries: sortedData.slice(0, 3),
    });

    return sortedData;
  } catch (error) {
    console.error('Error processing time series data:', error);
    throw error;
  }
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

processResiduals(residualData) {
if (!Array.isArray(residualData)) return { raw: [], byRegion: {}, stats: {} };

const rawResiduals = residualData.map(r => ({
region_id: r.region_id,
date: new Date(r.date).toISOString(),
residual: Number(r.residual)
}));

// Group residuals by region
const byRegion = _.groupBy(rawResiduals, 'region_id');

// Calculate statistics
const residualValues = rawResiduals.map(r => r.residual);
const stats = {
mean: _.mean(residualValues) || 0,
variance: this.calculateVariance(residualValues),
maxAbsolute: Math.max(...residualValues.map(Math.abs)) || 0
};

return { raw: rawResiduals, byRegion, stats };
}

calculateVariance(values) {
if (!values.length) return 0;
const mean = _.mean(values);
return _.sum(values.map(v => Math.pow(v - mean, 2))) / values.length;
}

async processVisualizationData(data, mode, filters = {}) {
try {
const visualData = await workerManager.calculateVisualization(data, {
  mode,
  filters
});
return visualData;
} catch (error) {
console.error('Error calculating visualization:', error);
throw error;
}
}

async processPriceVisualization(data, filters) {
const { timeSeriesData } = data;
if (!timeSeriesData?.length) return null;

// Process time series data for price visualization
const processedData = {
timeSeries: this.processTimeSeriesForVisualization(timeSeriesData),
metrics: calculateVisualizationMetrics.calculatePriceMetrics(timeSeriesData),
trends: this.calculatePriceTrends(timeSeriesData),
statistics: {
  volatility: this.calculateVolatilityMetrics(timeSeriesData),
  seasonality: this.detectSeasonalPatterns(timeSeriesData)
}
};

if (filters.timeRange) {
processedData.timeSeries = this.filterTimeSeriesData(
  processedData.timeSeries,
  filters.timeRange
);
}

return processedData;
}

async processIntegrationVisualization(data, filters) {
const {
marketIntegration,
flowAnalysis,
spatialAutocorrelation
} = data;

return {
correlationMatrix: this.processCorrelationMatrix(
  marketIntegration.price_correlation,
  filters
),
flowMetrics: this.processFlowMetrics(flowAnalysis, filters),
spatialMetrics: {
  moran: spatialAutocorrelation.global.moran_i,
  clusters: this.processSpatialClusters(
    spatialAutocorrelation.local,
    filters
  )
},
integrationScores: this.calculateIntegrationScores(data)
};
}

async processClusterVisualization(data, filters) {
const { marketClusters, clusterEfficiency } = data;

return {
clusters: this.processMarketClusters(marketClusters, filters),
efficiency: this.processClusterEfficiency(clusterEfficiency),
metrics: {
  coverage: this.calculateMarketCoverage(marketClusters),
  stability: this.calculateClusterStability(marketClusters),
  connectivity: this.calculateClusterConnectivity(marketClusters)
},
spatialDistribution: this.analyzeClusterDistribution(marketClusters)
};
}

async processShockVisualization(data, filters) {
const { marketShocks, timeSeriesData } = data;

return {
shocks: this.processMarketShocks(marketShocks, filters),
patterns: this.analyzeShockPatterns(marketShocks),
impact: this.calculateShockImpact(marketShocks, timeSeriesData),
propagation: this.analyzeShockPropagation(marketShocks),
riskMetrics: this.calculateMarketRiskMetrics(marketShocks)
};
}

async createUnifiedGeoJSON(timeSeriesData) {
await Promise.all([
this.initializeGeometry(),
this.initializePoints()
]);

const features = [];

// Create features combining polygons and points
for (const [regionName, polygonData] of this.geometryCache.entries()) {
const pointData = this.pointCache.get(regionName);
const timeSeriesForRegion = timeSeriesData.find(d => 
  this.normalizeRegionName(d.region || d.admin1) === regionName
);

features.push({
  type: 'Feature',
  geometry: polygonData.geometry,
  properties: {
    region_id: regionName,
    originalName: polygonData.properties.originalName,
    normalizedName: regionName,
    shapeISO: polygonData.properties.shapeISO,
    center: pointData ? pointData.coordinates : null,
    population: pointData ? pointData.properties.population : null,
    data: timeSeriesForRegion || {}
  }
});
}

return {
type: 'FeatureCollection',
features,
crs: {
  type: 'name',
  properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
}
};
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
  const cacheKey = `spatial_${commodity}_${date || 'all'}`;

  return this.deduplicateRequest(cacheKey, async () => {
    try {
      console.debug('Loading spatial data:', { commodity, date, cacheKey });

      // Load enhanced unified data
      const dataPath = getDataPath('enhanced_unified_data_with_residual.geojson');
      const response = await fetch(dataPath, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to load enhanced data: ${response.status}`);
      }

      const enhancedData = await response.json();

      // Filter data for the selected commodity
      const filteredData = {
        ...enhancedData,
        features: enhancedData.features.filter((feature) => {
          const featureCommodity = this.normalizeCommodityName(feature.properties?.commodity || '');
          const targetCommodity = this.normalizeCommodityName(commodity);
          return featureCommodity === targetCommodity;
        }),
      };

      // Log filtering stats
      console.debug('Filtered data stats:', {
        originalCount: enhancedData.features.length,
        filteredCount: filteredData.features.length,
        commodity: this.normalizeCommodityName(commodity),
      });

      if (!filteredData.features || filteredData.features.length === 0) {
        console.warn(`No features found for commodity: ${commodity}`);
        return {
          flowMaps: [],
          timeSeriesData: [],
          marketClusters: [],
          marketShocks: [],
          spatialAutocorrelation: {},
          commodities: [], // Return an empty commodities array
          metadata: {
            commodity,
            date: date || 'all',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Extract commodities from the data
      const commodities = this.extractCommodities(enhancedData);

      // Process time series data from enhanced data
      const timeSeriesData = await this.processTimeSeriesData(filteredData);

      // Log processed time series data summary
      console.debug('Time series data processed:', {
        entries: timeSeriesData.length,
        uniqueRegions: new Set(timeSeriesData.map((d) => d.region)).size,
        uniqueMonths: new Set(timeSeriesData.map((d) => d.month)).size,
        firstEntry: timeSeriesData[0],
        lastEntry: timeSeriesData[timeSeriesData.length - 1],
      });

      // Load preprocessed data for other analyses
      const preprocessed = await this.loadPreprocessedData(commodity);

      const result = {
        flowMaps: preprocessed.flow_analysis
          ? this.processFlowAnalysis(preprocessed.flow_analysis)
          : [],
        timeSeriesData, // Use time series data from enhanced data
        marketClusters: preprocessed.market_clusters || [],
        marketShocks: preprocessed.market_shocks || [],
        spatialAutocorrelation: preprocessed.spatial_autocorrelation || {},
        commodities, // Include the extracted commodities
        metadata: {
          commodity,
          date: date || 'all',
          timestamp: new Date().toISOString(),
        },
      };

      // Final verification of result
      console.debug('Spatial data result:', {
        timeSeriesCount: result.timeSeriesData.length,
        flowMapsCount: result.flowMaps.length,
        marketClustersCount: result.marketClusters.length,
        marketShocksCount: result.marketShocks.length,
      });

      return result;
    } catch (error) {
      console.error('[SpatialHandler] Failed to get spatial data:', error);
      throw error;
    }
  });
}

extractCommodities(data) {
  const commoditiesSet = new Set();
  if (data.features && Array.isArray(data.features)) {
    data.features.forEach((feature) => {
      if (feature.properties && feature.properties.commodity) {
        commoditiesSet.add(feature.properties.commodity.toLowerCase());
      }
    });
  }
  return Array.from(commoditiesSet);
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

processTimeSeriesForVisualization(timeSeriesData) {
return timeSeriesData.map(entry => ({
date: entry.month,
value: entry.avgUsdPrice,
volatility: entry.volatility,
conflictIntensity: entry.conflict_intensity,
sampleSize: entry.sampleSize
}));
}

processCorrelationMatrix(correlationData, filters) {
const matrix = { ...correlationData };
const minCorrelation = filters.minCorrelation || 0;

// Filter correlations based on threshold
Object.keys(matrix).forEach(market => {
matrix[market] = Object.fromEntries(
  Object.entries(matrix[market]).filter(
    ([_, value]) => Math.abs(value) >= minCorrelation
  )
);
});

return matrix;
}

processFlowMetrics(flowData, filters) {
const minFlow = filters.minFlowWeight || 0;

const filteredFlows = flowData.filter(flow => 
flow.total_flow >= minFlow
);

return {
flows: filteredFlows,
summary: this.calculateFlowSummaryStats(filteredFlows),
intensity: this.calculateFlowIntensityMatrix(filteredFlows)
};
}

calculateIntegrationScores(data) {
const {
marketIntegration,
flowAnalysis,
spatialAutocorrelation
} = data;

return {
overall: marketIntegration.integration_score,
byMarket: this.calculateMarketSpecificScores(data),
temporal: this.analyzeTemporalIntegration(data),
spatial: this.analyzeSpatialIntegration(
  spatialAutocorrelation,
  flowAnalysis
)
};
}

getCoordinates(location) {
const normalizedLocation = this.normalizeRegionName(location);
const coordinates = this.geometryCache?.get(normalizedLocation) || this.pointCache?.get(normalizedLocation);
return coordinates ? coordinates : null;
}


}

// Export the singleton instance using getInstance
export const spatialHandler = SpatialDataHandler.getInstance();
export default SpatialDataHandler;
