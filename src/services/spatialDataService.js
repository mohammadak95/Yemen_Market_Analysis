// src/services/spatialDataService.js

import * as d3 from 'd3-array';
import { useMemo } from 'react';
import { useWorkerProcessor } from '@/hooks';

class SpatialDataService {
  constructor(worker) {
    this.worker = worker;
    this.cache = new Map();
    this.pendingRequests = new Map();
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

      const enhanced = await this._enhanceFeatures(processedFeatures);
      this.cache.set(cacheKey, enhanced);
      return enhanced;
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

      const mean = d3.mean(values);
      const variance = d3.variance(values);
      const n = values.length;

      // Calculate skewness
      const skewness = this._calculateSkewness(values, mean, variance);
      
      // Calculate kurtosis
      const kurtosis = this._calculateKurtosis(values, mean, variance);

      const stats = {
        min: d3.min(values),
        max: d3.max(values),
        mean,
        median: d3.median(values),
        q1: d3.quantile(values, 0.25),
        q3: d3.quantile(values, 0.75),
        standardDeviation: Math.sqrt(variance),
        skewness,
        kurtosis,
        summary: {
          count: n,
          uniqueValues: new Set(values).size,
          hasNegatives: values.some(v => v < 0),
          hasZeros: values.includes(0),
          range: d3.max(values) - d3.min(values)
        }
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

      const enhancedFlows = processedFlows.map(flow => ({
        ...flow,
        metadata: {
          processed: true,
          strength: this._calculateFlowStrength(flow),
          direction: this._calculateFlowDirection(flow),
          intensity: this._normalizeFlowIntensity(flow, processedFlows)
        }
      }));

      this.cache.set(cacheKey, enhancedFlows);
      return enhancedFlows;
    } catch (error) {
      console.error('Error generating flow map:', error);
      throw error;
    }
  }

  async loadSpatialData(commodity) {
    const cacheKey = `spatial-${commodity}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const request = this._fetchAndProcessData(commodity);
    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;
      this.cache.set(cacheKey, data);
      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async exportData(data, format = 'csv') {
    try {
      switch (format) {
        case 'csv':
          return await this.worker.generateCSV({ records: data });
        case 'geojson':
          return {
            type: 'FeatureCollection',
            features: data.map(item => ({
              type: 'Feature',
              geometry: item.geometry,
              properties: {
                ...item.properties,
                exportedAt: new Date().toISOString()
              }
            }))
          };
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async _fetchAndProcessData(commodity) {
    try {
      const [spatialWeights, analysisResults] = await Promise.all([
        this._fetchJson('/results/spatial_weights/transformed_spatial_weights.json'),
        this._fetchJson('/results/spatial_analysis_results.json')
      ]);

      const validatedWeights = this._validateSpatialWeights(spatialWeights);
      const filteredAnalysis = analysisResults.find(r => 
        r.commodity?.toLowerCase() === commodity?.toLowerCase() &&
        r.regime === 'unified'
      );

      if (!filteredAnalysis) {
        throw new Error(`No analysis results found for commodity: ${commodity}`);
      }

      const processed = {
        weights: validatedWeights,
        analysis: {
          ...filteredAnalysis,
          spatialMetrics: {
            moranI: filteredAnalysis.moran_i?.I || filteredAnalysis.moran_i?.value,
            pValue: filteredAnalysis.moran_i?.['p-value'] || filteredAnalysis.moran_i?.p_value,
            spatialLag: filteredAnalysis.coefficients?.spatial_lag_price
          },
          timeRange: this._getTimeRange(filteredAnalysis.residual),
          residualStats: this._calculateResidualStats(filteredAnalysis.residual)
        },
        metadata: {
          processingTimestamp: new Date().toISOString(),
          regionCount: Object.keys(validatedWeights).length
        }
      };

      return processed;
    } catch (error) {
      console.error('Failed to load spatial data:', error);
      throw error;
    }
  }

  _validateSpatialWeights(weights) {
    const validated = {};
    
    for (const [region, data] of Object.entries(weights)) {
      const validNeighbors = data.neighbors.filter(neighbor => {
        const isValid = weights[neighbor]?.neighbors?.includes(region);
        if (!isValid) {
          console.warn(`Invalid neighbor relationship: ${region} -> ${neighbor}`);
        }
        return isValid;
      });

      validated[region] = {
        neighbors: validNeighbors,
        metadata: {
          connectionCount: validNeighbors.length,
          lastValidated: new Date().toISOString(),
          isConnected: validNeighbors.length > 0
        }
      };
    }

    return validated;
  }

  _calculateSkewness(values, mean, variance) {
    const n = values.length;
    const std = Math.sqrt(variance);
    const cubedDeviations = values.map(x => Math.pow((x - mean) / std, 3));
    return (d3.sum(cubedDeviations) / n);
  }

  _calculateKurtosis(values, mean, variance) {
    const n = values.length;
    const std = Math.sqrt(variance);
    const fourthMoment = values.map(x => Math.pow((x - mean) / std, 4));
    return (d3.sum(fourthMoment) / n) - 3;
  }

  _calculateFlowStrength(flow) {
    return flow.value ? Math.log(Math.abs(flow.value) + 1) : 0;
  }

  _calculateFlowDirection(flow) {
    const angle = Math.atan2(
      flow.target_lat - flow.source_lat,
      flow.target_lng - flow.source_lng
    );
    return (angle * 180 / Math.PI + 360) % 360;
  }

  _normalizeFlowIntensity(flow, allFlows) {
    const maxValue = Math.max(...allFlows.map(f => Math.abs(f.value)));
    return maxValue ? Math.abs(flow.value) / maxValue : 0;
  }

  _getTimeRange(residuals) {
    if (!residuals?.length) return null;

    const dates = residuals.map(r => new Date(r.date));
    return {
      start: new Date(Math.min(...dates)),
      end: new Date(Math.max(...dates)),
      duration: Math.max(...dates) - Math.min(...dates)
    };
  }

  _calculateResidualStats(residuals) {
    if (!residuals?.length) return null;

    const values = residuals.map(r => r.residual);
    const mean = d3.mean(values);
    const variance = d3.variance(values);

    return {
      min: d3.min(values),
      max: d3.max(values),
      mean,
      median: d3.median(values),
      q1: d3.quantile(values, 0.25),
      q3: d3.quantile(values, 0.75),
      std: Math.sqrt(variance),
      skewness: this._calculateSkewness(values, mean, variance),
      kurtosis: this._calculateKurtosis(values, mean, variance)
    };
  }

  async _enhanceFeatures(features) {
    return features.map(feature => ({
      ...feature,
      metadata: {
        processed: true,
        timestamp: new Date().toISOString(),
        validGeometry: this._validateGeometry(feature.geometry),
        propertyCount: Object.keys(feature.properties).length
      }
    }));
  }

  _validateGeometry(geometry) {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return false;
    }
    
    switch (geometry.type) {
      case 'Point':
        return Array.isArray(geometry.coordinates) && 
               geometry.coordinates.length === 2;
      case 'Polygon':
        return Array.isArray(geometry.coordinates) && 
               geometry.coordinates.every(ring => 
                 Array.isArray(ring) && ring.length >= 4);
      default:
        return false;
    }
  }

  generateCacheKey(type, data, options) {
    const optionsStr = JSON.stringify(options);
    const dataHash = this.hashData(data);
    return `${type}-${dataHash}-${optionsStr}`;
  }

  hashData(data) {
    if (Array.isArray(data)) {
      const firstItem = data[0];
      return `${data.length}-${firstItem?.id || JSON.stringify(firstItem).length}`;
    }
    return JSON.stringify(data).length.toString();
  }

  async _fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

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