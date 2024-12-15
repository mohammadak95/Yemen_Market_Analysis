// src/utils/core/spatialProcessor.js

import { backgroundMonitor } from './monitoringUtils';

class SpatialProcessor {
  constructor() {
    this.cache = new Map();
    this.geometryCache = new Map();
  }

  // Main processing methods
  processSpatialData(data, options = {}) {
    const metric = backgroundMonitor.startMetric('spatial-processing');
    try {
      const {
        validate = true,
        optimize = true,
        cacheResults = true
      } = options;

      // Generate cache key
      const cacheKey = this.getCacheKey(data, options);
      
      // Check cache
      if (cacheResults && this.cache.has(cacheKey)) {
        metric.finish({ status: 'cache-hit' });
        return this.cache.get(cacheKey);
      }

      // Process data
      let processed = data;

      // Validate if required
      if (validate) {
        this.validateGeometry(processed);
      }

      // Transform data
      processed = this.transformGeometry(processed);

      // Optimize if required
      if (optimize) {
        processed = this.optimizeGeometry(processed);
      }

      // Cache results if required
      if (cacheResults) {
        this.cache.set(cacheKey, processed);
      }

      metric.finish({ status: 'success' });
      return processed;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  // Validation methods
  validateGeometry(data) {
    if (!data || !data.type || !data.features) {
      throw new Error('Invalid GeoJSON structure');
    }

    if (data.type !== 'FeatureCollection') {
      throw new Error('Expected FeatureCollection type');
    }

    if (!Array.isArray(data.features)) {
      throw new Error('Features must be an array');
    }

    // Validate each feature
    data.features.forEach((feature, index) => {
      if (!feature.type || feature.type !== 'Feature') {
        throw new Error(`Invalid feature type at index ${index}`);
      }

      if (!feature.geometry || !feature.geometry.type || !feature.geometry.coordinates) {
        throw new Error(`Invalid geometry at feature index ${index}`);
      }

      this.validateCoordinates(feature.geometry.coordinates, feature.geometry.type, index);
    });

    return true;
  }

  validateCoordinates(coordinates, type, featureIndex) {
    switch (type) {
      case 'Point':
        this.validatePoint(coordinates, featureIndex);
        break;
      case 'LineString':
        this.validateLineString(coordinates, featureIndex);
        break;
      case 'Polygon':
        this.validatePolygon(coordinates, featureIndex);
        break;
      case 'MultiPolygon':
        this.validateMultiPolygon(coordinates, featureIndex);
        break;
      default:
        throw new Error(`Unsupported geometry type: ${type} at feature index ${featureIndex}`);
    }
  }

  validatePoint(coordinates, featureIndex) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new Error(`Invalid point coordinates at feature index ${featureIndex}`);
    }
  }

  validateLineString(coordinates, featureIndex) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error(`Invalid LineString coordinates at feature index ${featureIndex}`);
    }
    coordinates.forEach((point, i) => this.validatePoint(point, `${featureIndex}:${i}`));
  }

  validatePolygon(coordinates, featureIndex) {
    if (!Array.isArray(coordinates) || coordinates.length < 1) {
      throw new Error(`Invalid Polygon coordinates at feature index ${featureIndex}`);
    }
    coordinates.forEach((ring, i) => this.validateLineString(ring, `${featureIndex}:${i}`));
  }

  validateMultiPolygon(coordinates, featureIndex) {
    if (!Array.isArray(coordinates)) {
      throw new Error(`Invalid MultiPolygon coordinates at feature index ${featureIndex}`);
    }
    coordinates.forEach((polygon, i) => this.validatePolygon(polygon, `${featureIndex}:${i}`));
  }

  // Transformation methods
  transformGeometry(data) {
    return {
      type: 'FeatureCollection',
      features: data.features.map(feature => this.transformFeature(feature)),
      properties: {
        ...data.properties,
        transformed: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  transformFeature(feature) {
    return {
      type: 'Feature',
      geometry: this.transformGeometryObject(feature.geometry),
      properties: {
        ...feature.properties,
        transformed: true
      },
      id: feature.id || this.generateFeatureId()
    };
  }

  transformGeometryObject(geometry) {
    return {
      type: geometry.type,
      coordinates: this.transformCoordinates(geometry.coordinates, geometry.type)
    };
  }

  transformCoordinates(coordinates, type) {
    switch (type) {
      case 'Point':
        return this.roundCoordinates(coordinates);
      case 'LineString':
        return coordinates.map(point => this.roundCoordinates(point));
      case 'Polygon':
        return coordinates.map(ring => ring.map(point => this.roundCoordinates(point)));
      case 'MultiPolygon':
        return coordinates.map(polygon => 
          polygon.map(ring => ring.map(point => this.roundCoordinates(point)))
        );
      default:
        return coordinates;
    }
  }

  // Optimization methods
  optimizeGeometry(data) {
    return {
      ...data,
      features: data.features.map(feature => this.optimizeFeature(feature))
    };
  }

  optimizeFeature(feature) {
    const optimized = {
      ...feature,
      geometry: this.optimizeGeometryObject(feature.geometry)
    };

    // Cache optimized feature
    this.geometryCache.set(feature.id || this.generateFeatureId(), optimized);

    return optimized;
  }

  optimizeGeometryObject(geometry) {
    return {
      ...geometry,
      coordinates: this.simplifyCoordinates(geometry.coordinates, geometry.type)
    };
  }

  // Helper methods
  roundCoordinates(coordinates) {
    return coordinates.map(coord => Number(coord.toFixed(6)));
  }

  simplifyCoordinates(coordinates, type) {
    // Implement Douglas-Peucker or similar algorithm based on type
    return coordinates;
  }

  generateFeatureId() {
    return `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getCacheKey(data, options) {
    return JSON.stringify({
      dataHash: this.hashData(data),
      options
    });
  }

  hashData(data) {
    return typeof data === 'object' ? 
      JSON.stringify(data) : 
      String(data);
  }

  // Cache management
  clearCache() {
    this.cache.clear();
    this.geometryCache.clear();
  }

  getCacheStats() {
    return {
      dataCache: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys())
      },
      geometryCache: {
        size: this.geometryCache.size,
        keys: Array.from(this.geometryCache.keys())
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

export default new SpatialProcessor();
