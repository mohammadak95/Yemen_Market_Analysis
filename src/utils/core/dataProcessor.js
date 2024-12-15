// src/utils/core/dataProcessor.js

import { backgroundMonitor } from './monitoringUtils';

class DataProcessor {
  constructor() {
    this.cache = new Map();
  }

  // Data transformation methods
  transformData(data, options = {}) {
    const metric = backgroundMonitor.startMetric('data-transform');
    try {
      const { type, format, validate = true } = options;
      
      // Generate cache key
      const cacheKey = this.getCacheKey(data, options);
      
      // Check cache
      if (this.cache.has(cacheKey)) {
        metric.finish({ status: 'cache-hit' });
        return this.cache.get(cacheKey);
      }

      // Validate data if required
      if (validate) {
        this.validateData(data, type);
      }

      // Process data based on type
      let processed;
      switch (type) {
        case 'spatial':
          processed = this.processSpatialData(data, format);
          break;
        case 'timeSeries':
          processed = this.processTimeSeriesData(data, format);
          break;
        case 'network':
          processed = this.processNetworkData(data, format);
          break;
        default:
          processed = this.processGenericData(data, format);
      }

      // Cache results
      this.cache.set(cacheKey, processed);
      
      metric.finish({ status: 'success' });
      return processed;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  // Data validation methods
  validateData(data, type) {
    if (!data) throw new Error('No data provided');
    
    switch (type) {
      case 'spatial':
        return this.validateSpatialData(data);
      case 'timeSeries':
        return this.validateTimeSeriesData(data);
      case 'network':
        return this.validateNetworkData(data);
      default:
        return this.validateGenericData(data);
    }
  }

  validateSpatialData(data) {
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid spatial data: missing features array');
    }
    return true;
  }

  validateTimeSeriesData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Invalid time series data: expected array');
    }
    if (!data.every(d => d.date && d.value)) {
      throw new Error('Invalid time series data: missing required fields');
    }
    return true;
  }

  validateNetworkData(data) {
    if (!data.nodes || !data.edges) {
      throw new Error('Invalid network data: missing nodes or edges');
    }
    return true;
  }

  validateGenericData(data) {
    return true;
  }

  // Data processing methods
  processSpatialData(data, format) {
    const processed = {
      type: 'spatial',
      features: data.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          processed: true,
          timestamp: new Date().toISOString()
        }
      })),
      metadata: this.extractMetadata(data)
    };

    return format ? this.formatSpatialData(processed) : processed;
  }

  processTimeSeriesData(data, format) {
    const processed = {
      type: 'timeSeries',
      series: data.map(point => ({
        ...point,
        date: new Date(point.date),
        value: Number(point.value)
      })),
      metadata: this.extractMetadata(data)
    };

    return format ? this.formatTimeSeriesData(processed) : processed;
  }

  processNetworkData(data, format) {
    const processed = {
      type: 'network',
      nodes: data.nodes.map(node => ({
        ...node,
        id: String(node.id)
      })),
      edges: data.edges.map(edge => ({
        ...edge,
        source: String(edge.source),
        target: String(edge.target)
      })),
      metadata: this.extractMetadata(data)
    };

    return format ? this.formatNetworkData(processed) : processed;
  }

  processGenericData(data, format) {
    const processed = {
      type: 'generic',
      data,
      metadata: this.extractMetadata(data)
    };

    return format ? this.formatGenericData(processed) : processed;
  }

  // Formatting methods
  formatSpatialData(data) {
    return {
      ...data,
      formatted: true,
      features: data.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          formatted: true
        }
      }))
    };
  }

  formatTimeSeriesData(data) {
    return {
      ...data,
      formatted: true,
      series: data.series.map(point => ({
        ...point,
        formattedDate: point.date.toISOString(),
        formattedValue: point.value.toFixed(2)
      }))
    };
  }

  formatNetworkData(data) {
    return {
      ...data,
      formatted: true
    };
  }

  formatGenericData(data) {
    return {
      ...data,
      formatted: true
    };
  }

  // Helper methods
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

  extractMetadata(data) {
    return {
      timestamp: new Date().toISOString(),
      recordCount: Array.isArray(data) ? data.length : 1,
      dataType: typeof data,
      processingTime: Date.now()
    };
  }

  // Cache management
  clearCache() {
    this.cache.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      lastUpdated: new Date().toISOString()
    };
  }
}

export default new DataProcessor();
