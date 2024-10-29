// src/services/spatialDataService.js

import * as d3 from 'd3-array';
import { useMemo } from 'react';
import { useWorkerProcessor } from '../hooks/useWorkerProcessor';

class SpatialDataService {
  constructor(worker) {
    this.worker = worker;
    this.cache = new Map();
  }

  async processFeatures(features, options = {}) {
    const cacheKey = this.generateCacheKey('features', features, options);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const processedFeatures = await this.worker.processGeoJSON({
        features,
        options
      });

      this.cache.set(cacheKey, processedFeatures);
      return processedFeatures;
    } catch (error) {
      console.error('Error processing features:', error);
      throw error;
    }
  }

  async calculateStatistics(features, variable) {
    const cacheKey = this.generateCacheKey('stats', features, { variable });
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const values = features
        .map(f => f.properties[variable])
        .filter(v => v != null);

      const stats = {
        min: d3.min(values),
        max: d3.max(values),
        mean: d3.mean(values),
        median: d3.median(values),
        q1: d3.quantile(values, 0.25),
        q3: d3.quantile(values, 0.75),
        standardDeviation: d3.deviation(values)
      };

      this.cache.set(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error calculating statistics:', error);
      throw error;
    }
  }

  async generateFlowMap(flowData, options = {}) {
    const cacheKey = this.generateCacheKey('flows', flowData, options);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const processedFlows = await this.worker.processFlowData({
        flows: flowData,
        options
      });

      this.cache.set(cacheKey, processedFlows);
      return processedFlows;
    } catch (error) {
      console.error('Error generating flow map:', error);
      throw error;
    }
  }

  async exportData(data, format = 'csv') {
    try {
      switch (format) {
        case 'csv':
          return await this.worker.generateCSV({ records: data });
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  generateCacheKey(type, data, options) {
    const optionsStr = JSON.stringify(options);
    const dataHash = this.hashData(data);
    return `${type}-${dataHash}-${optionsStr}`;
  }

  hashData(data) {
    // Simple hash function for cache keys
    return Array.isArray(data) ? 
      data.length.toString() + data[0]?.id : 
      JSON.stringify(data).length.toString();
  }

  clearCache() {
    this.cache.clear();
  }
}

// Hook to use the spatial data service
export const useSpatialDataService = () => {
  const { processGeoJSON, processFlowData, generateCSV } = useWorkerProcessor();
  
  const service = useMemo(() => new SpatialDataService({
    processGeoJSON,
    processFlowData,
    generateCSV
  }), [processGeoJSON, processFlowData, generateCSV]);

  return service;
};

export default SpatialDataService;