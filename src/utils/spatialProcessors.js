// src/utils/spatialProcessors.js

import proj4 from 'proj4';
import { backgroundMonitor } from '../utils/backgroundMonitor';

// Define Yemen local projection
const YEMEN_TM = "+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs";
const WGS84 = "EPSG:4326";

class EnhancedSpatialProcessor {
  constructor() {
    this.cache = new Map();
    this.featureMap = new Map();
    this.timeSeriesIndex = new Map();
    
    // Initialize projection
    proj4.defs("YEMEN_TM", YEMEN_TM);
    
    // Enhanced region name mapping
    this.regionMapping = {
      "san'a": "sanaa",
      "sana'a": "sanaa",
      "sanʿaʾ": "sanaa",
      "al_dhale'e": "al_dhalee",
      "ad_dali": "al_dhalee",
      "soqatra": "socotra",
      "socotra_island": "socotra",
      "al_hudaydah": "hodeidah",
      "al_mahwit": "mahwit",
      "al_maharah": "mahra",
      "hadramaut": "hadhramaut",
      "hadhramout": "hadhramaut",
      "shabwah": "shabwa"
    };
  }

  /**
   * Enhanced region ID normalization
   */
  normalizeRegionId(id) {
    if (!id) return null;
    
    // Initial normalization
    const normalized = id.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/['\u2018\u2019]/g, '') // Remove special quotes
      .replace(/[^a-z0-9]/g, '_')      // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')             // Collapse multiple underscores
      .replace(/^_|_$/g, '');          // Remove leading/trailing underscores

    // Apply special case mapping
    return this.regionMapping[normalized] || normalized;
  }

  /**
   * Transform coordinates from Yemen TM to WGS84
   */
  transformCoordinates(coords) {
    try {
      if (!coords || !Array.isArray(coords)) return null;

      // Handle different geometry types
      if (typeof coords[0] === 'number') {
        // Single point
        return proj4("YEMEN_TM", WGS84, coords);
      } else if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
        // LineString or similar
        return coords.map(point => proj4("YEMEN_TM", WGS84, point));
      } else {
        // Polygon or similar
        return coords.map(ring => ring.map(point => proj4("YEMEN_TM", WGS84, point)));
      }
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      return coords; // Return original coords if transformation fails
    }
  }

  /**
   * Enhanced time series data aggregation
   */
  aggregateTimeSeriesData(timeSeriesData, interval = 'month') {
    if (!Array.isArray(timeSeriesData)) return [];

    const aggregated = timeSeriesData.reduce((acc, entry) => {
      const date = new Date(entry.month);
      if (isNaN(date.getTime())) return acc;

      const key = date.toISOString().slice(0, 7);
      
      if (!acc[key]) {
        acc[key] = {
          date: key,
          avgUsdPrice: 0,
          volatility: 0,
          sampleSize: 0,
          count: 0,
          minPrice: Infinity,
          maxPrice: -Infinity
        };
      }

      const price = Number(entry.avgUsdPrice) || 0;
      acc[key].avgUsdPrice += price;
      acc[key].volatility += Number(entry.volatility) || 0;
      acc[key].sampleSize += Number(entry.sampleSize) || 0;
      acc[key].count++;
      acc[key].minPrice = Math.min(acc[key].minPrice, price);
      acc[key].maxPrice = Math.max(acc[key].maxPrice, price);

      return acc;
    }, {});

    // Calculate averages and convert to array
    return Object.values(aggregated)
      .map(entry => ({
        month: entry.date,
        avgUsdPrice: entry.avgUsdPrice / entry.count,
        volatility: entry.volatility / entry.count,
        sampleSize: Math.round(entry.sampleSize / entry.count),
        priceRange: {
          min: entry.minPrice,
          max: entry.maxPrice
        }
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Process and validate geometry data
   */
  processGeometries(geometryData) {
    if (!geometryData) return new Map();

    // Handle both Map and GeoJSON formats
    if (geometryData instanceof Map) {
      return geometryData;
    }

    const geometryMap = new Map();

    try {
      // If it's a GeoJSON FeatureCollection
      if (geometryData.type === 'FeatureCollection' && Array.isArray(geometryData.features)) {
        geometryData.features.forEach(feature => {
          if (feature.properties && feature.geometry) {
            const regionId = this.normalizeRegionId(
              feature.properties.shapeName || 
              feature.properties.shapeID || 
              feature.properties.region_id
            );
            
            if (regionId) {
              geometryMap.set(regionId, {
                geometry: feature.geometry,
                properties: feature.properties
              });
            }
          }
        });
      } 
      // If it's already a processed object
      else if (typeof geometryData === 'object') {
        Object.entries(geometryData).forEach(([key, value]) => {
          const regionId = this.normalizeRegionId(key);
          if (regionId && value.geometry) {
            geometryMap.set(regionId, value);
          }
        });
      }

    } catch (error) {
      console.error('Error processing geometries:', error);
    }

    return geometryMap;
  }

  /**
   * Updated processSpatialData method
   */
  async processSpatialData(data, options = {}) {
    const metric = backgroundMonitor.startMetric('process-spatial-data');
    
    try {
      // Process geometries first
      const geometryMap = this.processGeometries(options.geometries);
      
      // Aggregate time series data
      const timeSeriesData = this.aggregateTimeSeriesData(data.time_series_data);
      
      // Process market shocks
      const processedShocks = this.processMarketShocks(data.market_shocks);
      
      // Build feature collection with processed geometries
      const geoData = await this.buildFeatureCollection(data, {
        ...options,
        geometries: geometryMap,
        transform: true
      });

      // Process flow data with transformed coordinates
      const flowData = this.processFlowData(data.flow_analysis, geoData);

      metric.finish({ status: 'success' });

      return {
        geoData,
        timeSeriesData,
        marketShocks: processedShocks,
        flowMaps: flowData,
        spatialAutocorrelation: data.spatial_autocorrelation || {},
        metadata: {
          ...data.metadata,
          processedDate: new Date().toISOString(),
          regionMapping: Object.keys(this.regionMapping),
          geometryCoverage: Array.from(geometryMap.keys())
        }
      };
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Process spatial data with enhanced features
   */
  async processSpatialData(data, options = {}) {
    const metric = backgroundMonitor.startMetric('process-spatial-data');
    
    try {
      // Aggregate time series data
      const timeSeriesData = this.aggregateTimeSeriesData(data.time_series_data);
      
      // Process market shocks
      const processedShocks = this.processMarketShocks(data.market_shocks);
      
      // Build feature collection with transformed coordinates
      const geoData = await this.buildFeatureCollection(data, {
        ...options,
        transform: true
      });

      // Process flow data with transformed coordinates
      const flowData = this.processFlowData(data.flow_analysis, geoData);

      metric.finish({ status: 'success' });

      return {
        geoData,
        timeSeriesData,
        marketShocks: processedShocks,
        flowMaps: flowData,
        spatialAutocorrelation: data.spatial_autocorrelation || {},
        metadata: {
          ...data.metadata,
          processedDate: new Date().toISOString(),
          regionMapping: Object.keys(this.regionMapping)
        }
      };
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Enhanced feature creation with coordinate transformation
   */
  createMarketFeature(marketId, isMainMarket, cluster, options) {
    const normalizedId = this.normalizeRegionId(marketId);
    const geometryData = options.geometries?.get(normalizedId);
    let geometry = geometryData?.geometry;

    // Add fallback coordinates if no geometry is found
    if (!geometry && options.requireGeometry) {
      console.warn(`No geometry found for market: ${marketId}, using fallback coordinates`);
      geometry = {
        type: 'Point',
        coordinates: this.getFallbackCoordinates(normalizedId)
      };
    }

    if (geometry && options.transform) {
      geometry = {
        ...geometry,
        coordinates: this.transformCoordinates(geometry.coordinates)
      };
    }

    return {
      type: 'Feature',
      properties: {
        id: normalizedId,
        originalId: marketId,
        isMainMarket,
        clusterSize: cluster.market_count,
        marketRole: isMainMarket ? 'hub' : 'peripheral',
        cluster_id: cluster.cluster_id,
        // Add any additional properties from the geometry data
        ...(geometryData?.properties || {})
      },
      geometry
    };
  }

  /**
   * Enhanced flow data processing with coordinate transformation
   */
  processFlowData(flows, geoData) {
    if (!Array.isArray(flows)) return [];

    const featureMap = new Map(
      geoData.features.map(f => [f.properties.id, f])
    );

    return flows
      .filter(flow => {
        const sourceFeature = featureMap.get(this.normalizeRegionId(flow.source));
        const targetFeature = featureMap.get(this.normalizeRegionId(flow.target));
        return sourceFeature && targetFeature;
      })
      .map(flow => {
        const sourceFeature = featureMap.get(this.normalizeRegionId(flow.source));
        const targetFeature = featureMap.get(this.normalizeRegionId(flow.target));

        const sourceCoords = this.extractCentroid(sourceFeature.geometry);
        const targetCoords = this.extractCentroid(targetFeature.geometry);

        return {
          source: this.normalizeRegionId(flow.source),
          target: this.normalizeRegionId(flow.target),
          sourceCoords,
          targetCoords,
          flow_weight: Number(flow.total_flow) || 0,
          avg_flow: Number(flow.avg_flow) || 0,
          flow_count: Number(flow.flow_count) || 0,
          price_differential: Number(flow.avg_price_differential) || 0
        };
      })
      .filter(flow => flow.sourceCoords && flow.targetCoords);
  }

  /**
   * Fallback coordinates for Yemen regions
   */
  getFallbackCoordinates(regionId) {
    const fallbackCoords = {
      sanaa: [44.2067, 15.3694],
      aden: [45.0366, 12.7797],
      taizz: [44.0075, 13.5766],
      hodeidah: [42.9552, 14.7979],
      // Add other regions as needed
    };

    return fallbackCoords[regionId] || [44.191, 15.3694]; // Default to Sana'a if unknown
  }
}

export const enhancedSpatialProcessor = new EnhancedSpatialProcessor();