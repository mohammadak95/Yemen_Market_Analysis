// src/services/spatialDataService.js

import { backgroundMonitor } from '../utils/backgroundMonitor';
import { createWorker, processDataWithWorker } from '../workers/workerLoader';
import LZString from 'lz-string';
import { normalizeRegionName, validateSpatialWeights } from '../utils/spatialUtils';
import { transformCoordinates } from '../utils/coordinateTransforms';
import { enhanceFetchError } from '../utils/errorUtils';
import { getDataPath } from '../utils/dataUtils';
import Papa from 'papaparse';
import { parseISO, isValid } from 'date-fns';

class SpatialDataService {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.circuitBreakers = new Map();
    this.retryQueue = new Map();
    this.worker = null;
    this.monitor = backgroundMonitor;
    
    // Configuration
    this.config = {
      cache: {
        maxSize: 50,
        ttl: 30 * 60 * 1000, // 30 minutes
        cleanupInterval: 5 * 60 * 1000 // 5 minutes
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000
      },
      retry: {
        maxAttempts: 3,
        baseDelay: 1000
      },
      worker: {
        timeout: 30000
      }
    };

    this.initializeService();
  }

  async initializeService() {
    try {
      this.worker = await createWorker();
      this.initializeCleanupInterval();
      this.monitor.init();
    } catch (error) {
      console.error('Failed to initialize spatial service:', error);
    }
  }

  initializeCleanupInterval() {
    setInterval(() => this.cleanupCache(), this.config.cache.cleanupInterval);
  }

  // Cache Management
  async getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.config.cache.ttl) {
      this.cache.delete(key);
      return null;
    }

    try {
      return cached.compressed ? 
        JSON.parse(LZString.decompressFromUTF16(cached.data)) : 
        cached.data;
    } catch (error) {
      this.cache.delete(key);
      return null;
    }
  }

  setCachedData(key, data) {
    const shouldCompress = JSON.stringify(data).length > 100000;
    const cachedData = {
      data: shouldCompress ? 
        LZString.compressToUTF16(JSON.stringify(data)) : 
        data,
      timestamp: Date.now(),
      compressed: shouldCompress
    };

    this.cache.set(key, cachedData);
    this.enforceMaxCacheSize();
  }

  enforceMaxCacheSize() {
    if (this.cache.size > this.config.cache.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      while (this.cache.size > this.config.cache.maxSize) {
        const [oldestKey] = entries.shift();
        this.cache.delete(oldestKey);
      }
    }
  }

  // Circuit Breaker
  getCircuitBreaker(key) {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        failures: 0,
        lastFailure: null,
        isOpen: false
      });
    }
    return this.circuitBreakers.get(key);
  }

  async executeWithCircuitBreaker(key, operation) {
    const breaker = this.getCircuitBreaker(key);
    
    if (breaker.isOpen) {
      if (Date.now() - breaker.lastFailure > this.config.circuitBreaker.resetTimeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
      } else {
        throw new Error(`Circuit breaker open for ${key}`);
      }
    }

    try {
      const result = await operation();
      breaker.failures = 0;
      breaker.isOpen = false;
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
        breaker.isOpen = true;
      }
      throw error;
    }
  }

  // Data Processing
  async processSpatialData(selectedCommodity) {
    const cacheKey = `spatial_data_${selectedCommodity?.toLowerCase()}`;
    const cachedData = await this.getCachedData(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    return this.executeWithCircuitBreaker(cacheKey, async () => {
      const paths = {
        geoBoundaries: getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
        unified: getDataPath('enhanced_unified_data_with_residual.geojson'),
        weights: getDataPath('spatial_weights/transformed_spatial_weights.json'),
        flowMaps: getDataPath('network_data/time_varying_flows.csv'),
        analysis: getDataPath('spatial_analysis_results.json')
      };

      // Fetch all data with monitoring
      const startTime = performance.now();
      this.monitor.logMetric('spatial-fetch-start', { selectedCommodity });

      try {
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
          this.fetchWithRetry(paths.flowMaps, true),
          this.fetchWithRetry(paths.analysis)
        ]);

        const processedData = await this.processAllData({
          geoBoundariesData,
          unifiedData,
          weightsData,
          flowMapsData,
          analysisResultsData,
          selectedCommodity
        });

        this.monitor.logMetric('spatial-fetch-complete', {
          duration: performance.now() - startTime,
          dataSize: JSON.stringify(processedData).length
        });

        this.setCachedData(cacheKey, processedData);
        return processedData;

      } catch (error) {
        this.monitor.logError('spatial-fetch-failed', error);
        throw error;
      }
    });
  }

  async fetchWithRetry(url, isCsv = false, attempts = 0) {
    try {
      const response = await fetch(url);
      await enhanceFetchError(response);

      if (isCsv) {
        const text = await response.text();
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: reject
          });
        });
      }

      return await response.json();

    } catch (error) {
      if (attempts < this.config.retry.maxAttempts) {
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retry.baseDelay * Math.pow(2, attempts))
        );
        return this.fetchWithRetry(url, isCsv, attempts + 1);
      }
      throw error;
    }
  }

  async processAllData({
    geoBoundariesData,
    unifiedData,
    weightsData,
    flowMapsData,
    analysisResultsData,
    selectedCommodity
  }) {
    // Validate inputs
    if (!geoBoundariesData?.features || !unifiedData?.features) {
      throw new Error('Invalid GeoJSON structure');
    }

    const weightsValidation = validateSpatialWeights(weightsData);
    if (!weightsValidation.isValid) {
      throw new Error(`Invalid spatial weights: ${weightsValidation.errors.join(', ')}`);
    }

    // Process features
    const filteredFeatures = this.processFeatures(unifiedData.features, selectedCommodity);
    
    // Transform coordinates
    const transformedFeatures = filteredFeatures.map(feature => ({
      ...feature,
      geometry: transformCoordinates.transformGeometry(feature.geometry),
      properties: {
        ...feature.properties,
        date: this.processDate(feature.properties.date),
        region_id: normalizeRegionName(feature.properties.region_id)
      }
    }));

    // Process flow maps
    const processedFlowMaps = flowMapsData.map(flow => ({
      ...flow,
      date: this.processDate(flow.date),
      source_region: normalizeRegionName(flow.source),
      target_region: normalizeRegionName(flow.target)
    })).filter(flow => flow.source_region && flow.target_region);

    // Extract unique months
    const uniqueMonths = Array.from(new Set(
      transformedFeatures
        .map(f => f.properties.date?.slice(0, 7))
        .filter(Boolean)
    )).sort();

    return {
      geoData: {
        type: 'FeatureCollection',
        features: transformedFeatures
      },
      flowMaps: processedFlowMaps,
      spatialWeights: weightsData,
      analysisResults: analysisResultsData,
      uniqueMonths,
      metadata: {
        processingTimestamp: new Date().toISOString(),
        featureCount: transformedFeatures.length,
        flowCount: processedFlowMaps.length,
        timeRange: {
          start: uniqueMonths[0],
          end: uniqueMonths[uniqueMonths.length - 1]
        }
      }
    };
  }

  processFeatures(features, selectedCommodity) {
    return features.filter(feature => {
      const commodity = feature.properties?.commodity?.toLowerCase();
      return commodity === selectedCommodity?.toLowerCase();
    });
  }

  processDate(dateString) {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? date.toISOString() : null;
    } catch {
      return null;
    }
  }

  // Cleanup
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cache.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy() {
    this.worker?.terminate();
    this.cache.clear();
    this.circuitBreakers.clear();
    this.pendingRequests.clear();
    this.retryQueue.clear();
  }
}

// Export singleton instance
export const spatialDataService = new SpatialDataService();

// React hook for using the service
export const useSpatialDataService = () => {
  return spatialDataService;
};