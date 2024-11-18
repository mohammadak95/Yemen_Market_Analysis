// src/utils/OptimizedDataLoader.js

import { backgroundMonitor } from './backgroundMonitor';
import { workerManager } from './workers/enhancedWorkerSystem';
import Papa from 'papaparse';
import _ from 'lodash';

class OptimizedDataLoader {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  async loadSpatialData(selectedCommodity, selectedDate) {
    const metric = backgroundMonitor.startMetric('load-spatial-data');
    const cacheKey = `${selectedCommodity}_${selectedDate}`;

    try {
      // Check cache first
      if (this.cache.has(cacheKey)) {
        metric.finish({ status: 'success', source: 'cache' });
        return this.cache.get(cacheKey);
      }

      // Prevent duplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
      }

      // Load and process files
      const loadPromise = this.loadAndProcessData(selectedCommodity, selectedDate);
      this.pendingRequests.set(cacheKey, loadPromise);

      const result = await loadPromise;
      this.cache.set(cacheKey, result);
      
      metric.finish({ status: 'success', source: 'fetch' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async loadAndProcessData(commodity, date) {
    try {
      // Read time varying flows
      const flowsResponse = await window.fs.readFile('time_varying_flows.csv', { encoding: 'utf8' });
      const flows = Papa.parse(flowsResponse, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      }).data;

      // Read preprocessed commodity data
      const preprocessedFile = `preprocessed_yemen_market_data_${commodity.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      const preprocessedResponse = await window.fs.readFile(preprocessedFile, { encoding: 'utf8' });
      const preprocessedData = JSON.parse(preprocessedResponse);

      // Process data using worker
      const processedData = await workerManager.processData('PROCESS_SPATIAL', {
        flows: this.filterFlowsByDate(flows, date),
        preprocessed: preprocessedData,
        selectedDate: date
      });

      return {
        geoData: processedData.geoData,
        marketClusters: preprocessedData.market_clusters,
        detectedShocks: this.filterShocksByDate(preprocessedData.market_shocks, date),
        timeSeriesData: preprocessedData.time_series_data,
        flowMaps: processedData.flows,
        analysisResults: {
          spatialAutocorrelation: preprocessedData.spatial_autocorrelation,
          metadata: preprocessedData.metadata
        }
      };

    } catch (error) {
      console.error('Error loading spatial data:', error);
      throw error;
    }
  }

  filterFlowsByDate(flows, targetDate) {
    return flows.filter(flow => flow.date?.startsWith(targetDate));
  }

  filterShocksByDate(shocks, targetDate) {
    return shocks.filter(shock => shock.date?.startsWith(targetDate));
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const optimizedDataLoader = new OptimizedDataLoader();