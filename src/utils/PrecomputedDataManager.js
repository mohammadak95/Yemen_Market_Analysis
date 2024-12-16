// src/utils/PrecomputedDataManager.js

import { backgroundMonitor } from './backgroundMonitor';
import { pathResolver } from './pathResolver';
import { dataCache } from './dataCache';
import { validateNumber } from './numberValidation';
import { transformRegionName } from './spatialUtils';
import Papa from 'papaparse';
import _ from 'lodash';

class PrecomputedDataManager {
  constructor() {
    this.pendingRequests = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async loadData(commodity, date, options = {}) {
    const metric = backgroundMonitor.startMetric('precomputed-data-load');
    const cacheKey = `${commodity}_${date}`;

    try {
      // Check cache first
      if (!options.forceRefresh) {
        const cached = dataCache.get(commodity, date);
        if (cached) {
          metric.finish({ status: 'cache-hit' });
          return cached;
        }
      }

      // Deduplicate in-flight requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
      }

      // Create request promise
      const requestPromise = this._loadDataInternal(commodity, date, options);
      this.pendingRequests.set(cacheKey, requestPromise);

      try {
        const data = await requestPromise;
        dataCache.set(commodity, date, data);
        return data;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  async _loadDataInternal(commodity, date, options) {
    try {
      const path = pathResolver.getCommodityFilePath(commodity);
      let response = await this._fetchWithRetry(path);
      
      // Parse and validate data
      const data = await this._parseAndValidateData(response, commodity, date);
      
      // Process data based on type
      if (response.headers.get('content-type')?.includes('text/csv')) {
        return this._processCSVData(data, commodity, date);
      }
      
      return this._processJSONData(data, commodity, date);

    } catch (error) {
      backgroundMonitor.logError('data-load-error', {
        commodity,
        date,
        error: error.message
      });
      throw error;
    }
  }

  async _fetchWithRetry(path, attempt = 0) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (attempt >= this.retryAttempts) throw error;
      
      await new Promise(resolve => 
        setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
      );
      
      return this._fetchWithRetry(path, attempt + 1);
    }
  }

  async _parseAndValidateData(response, commodity, date) {
    const text = await response.text();
    
    try {
      if (response.headers.get('content-type')?.includes('text/csv')) {
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: error => reject(error)
          });
        });
      }
      
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse data: ${error.message}`);
    }
  }

  _processJSONData(data, commodity, date) {
    // Validate required fields
    const required = [
      'timeSeriesData',
      'marketShocks',
      'marketClusters',
      'flowAnalysis',
      'spatialAutocorrelation'
    ];

    const missing = required.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Process and normalize data
    return {
      timeSeriesData: this._processTimeSeries(data.timeSeriesData),
      marketShocks: this._processShocks(data.marketShocks),
      marketClusters: this._processClusters(data.marketClusters),
      flowAnalysis: this._processFlows(data.flowAnalysis),
      spatialAutocorrelation: data.spatialAutocorrelation,
      metadata: {
        ...data.metadata,
        commodity,
        date,
        processedAt: new Date().toISOString()
      }
    };
  }

  _processTimeSeries(data) {
    if (!Array.isArray(data)) return [];

    return data.map(entry => ({
      date: entry.date,
      region: transformRegionName(entry.region || entry.admin1),
      price: validateNumber(entry.price, 0),
      usdprice: validateNumber(entry.usdprice, 0),
      conflict_intensity: validateNumber(entry.conflict_intensity, 0)
    }));
  }

  _processShocks(shocks) {
    if (!Array.isArray(shocks)) return [];

    return shocks.map(shock => ({
      date: shock.date,
      region: transformRegionName(shock.region),
      shock_type: shock.shock_type,
      magnitude: validateNumber(shock.magnitude, 0),
      current_price: validateNumber(shock.current_price, 0),
      previous_price: validateNumber(shock.previous_price, 0)
    }));
  }

  _processClusters(clusters) {
    if (!Array.isArray(clusters)) return [];

    return clusters.map(cluster => ({
      cluster_id: cluster.cluster_id,
      main_market: transformRegionName(cluster.main_market),
      connected_markets: (cluster.connected_markets || [])
        .map(market => transformRegionName(market)),
      market_count: validateNumber(cluster.market_count, 0),
      metrics: {
        efficiency: validateNumber(cluster.metrics?.efficiency, 0),
        connectivity: validateNumber(cluster.metrics?.connectivity, 0),
        coverage: validateNumber(cluster.metrics?.coverage, 0)
      }
    }));
  }

  _processFlows(flows) {
    if (!Array.isArray(flows)) return [];

    return flows.map(flow => ({
      source: transformRegionName(flow.source),
      target: transformRegionName(flow.target),
      flow_weight: validateNumber(flow.flow_weight, 0),
      price_differential: validateNumber(flow.price_differential, 0)
    }));
  }

  _processCSVData(data, commodity, date) {
    // Group data by type using filename or data structure
    const grouped = _.groupBy(data, row => {
      if (row.shock_type) return 'marketShocks';
      if (row.cluster_id) return 'marketClusters';
      if (row.flow_weight) return 'flowAnalysis';
      return 'timeSeriesData';
    });

    return this._processJSONData({
      timeSeriesData: grouped.timeSeriesData || [],
      marketShocks: grouped.marketShocks || [],
      marketClusters: grouped.marketClusters || [],
      flowAnalysis: grouped.flowAnalysis || [],
      spatialAutocorrelation: {},
      metadata: {
        commodity,
        date,
        source: 'csv'
      }
    }, commodity, date);
  }
}

export const precomputedDataManager = new PrecomputedDataManager();