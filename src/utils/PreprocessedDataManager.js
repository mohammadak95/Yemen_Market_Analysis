// src/utils/PreprocessedDataManager.js

import { configUtils } from './systemConfig';
import { monitoringSystem } from './MonitoringSystem';
import { getDataPath } from './dataUtils';

/**
 * DataProcessor class embedded directly to avoid import issues
 */
class DataProcessor {
  static cleanValue(value) {
    if (typeof value === 'number' && isNaN(value)) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.map(v => DataProcessor.cleanValue(v));
    }
    if (typeof value === 'object' && value !== null) {
      return DataProcessor.cleanObject(value);
    }
    return value;
  }

  static cleanObject(obj) {
    if (!obj) return obj;
    const cleaned = {};
    Object.entries(obj).forEach(([key, value]) => {
      cleaned[key] = DataProcessor.cleanValue(value);
    });
    return cleaned;
  }

  static safeJSONParse(text, options = {}) {
    try {
      // First try to parse JSON directly
      const parsed = JSON.parse(text);
      // Clean any NaN values
      return DataProcessor.cleanValue(parsed);
    } catch (error) {
      monitoringSystem.error('JSON parse error:', {
        error: error.message,
        sampleText: text.substring(0, 100)
      });
      if (options.throwOnError) {
        throw error;
      }
      return null;
    }
  }

  static validateAndCleanData(data, schema) {
    const cleaned = DataProcessor.cleanValue(data);
    
    if (!cleaned || typeof cleaned !== 'object') {
      throw new Error('Invalid data structure: must be an object');
    }

    Object.entries(schema).forEach(([key, type]) => {
      if (!(key in cleaned)) {
        throw new Error(`Missing required field: ${key}`);
      }
      if (typeof cleaned[key] !== type) {
        throw new Error(`Invalid type for ${key}: expected ${type}, got ${typeof cleaned[key]}`);
      }
    });

    return cleaned;
  }
}

class PreprocessedDataManager {
  constructor() {
    this.cache = new Map();
    this._isInitialized = false;
  }

  async init() {
    if (this._isInitialized) return;

    const metric = monitoringSystem.startMetric('init-preprocessed-manager');
    try {
      await configUtils.validateConfig();
      this._isInitialized = true;
      metric.finish({ status: 'success' });
      monitoringSystem.log('PreprocessedDataManager initialized successfully');
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Initialization failed:', error);
      throw error;
    }
  }

  async loadPreprocessedData(commodity) {
    if (!this._isInitialized) {
      throw new Error('PreprocessedDataManager must be initialized first');
    }

    const metric = monitoringSystem.startMetric('load-preprocessed-data');
    
    try {
      // Check cache first
      const cachedData = this.cache.get(commodity);
      if (cachedData) {
        monitoringSystem.log('Cache hit for commodity:', { commodity });
        return cachedData;
      }

      // Generate filename
      const filename = configUtils.getConfig('data.preprocessedPattern')
        .replace('{commodity}', this.normalizeCommodityName(commodity));

      // Construct full path
      const filePath = getDataPath(filename);
      monitoringSystem.log('Loading from path:', { filePath });

      // Fetch the data
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const text = await response.text();
      
      // Parse JSON safely
      const data = DataProcessor.safeJSONParse(text, {
        throwOnError: true
      });

      if (!data) {
        throw new Error('Failed to parse data');
      }

      // Process and validate the data
      const processedData = this.processPreprocessedData(data, commodity);
      
      // Cache the results
      this.cache.set(commodity, processedData);

      metric.finish({ status: 'success' });
      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Error loading preprocessed data:', error);
      throw error;
    }
  }

  processPreprocessedData(data, commodity) {
    const schema = {
      time_series_data: 'object',
      market_clusters: 'object',
      flow_analysis: 'object',
      spatial_autocorrelation: 'object'
    };

    try {
      // Clean and validate data
      const cleanedData = DataProcessor.validateAndCleanData(data, schema);

      // Process individual sections
      return {
        timeSeriesData: this.processTimeSeriesData(cleanedData.time_series_data),
        marketClusters: this.processMarketClusters(
          cleanedData.market_clusters,
          cleanedData.cluster_efficiency
        ),
        flowAnalysis: this.processFlowAnalysis(cleanedData.flow_analysis),
        spatialAutocorrelation: this.processSpatialMetrics(cleanedData.spatial_autocorrelation),
        seasonalAnalysis: cleanedData.seasonal_analysis,
        marketIntegration: cleanedData.market_integration,
        metadata: {
          ...cleanedData.metadata,
          commodity,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to process data for ${commodity}: ${error.message}`);
    }
  }

  processTimeSeriesData(timeSeriesData) {
    if (!Array.isArray(timeSeriesData)) {
      return [];
    }

    return timeSeriesData
      .map(entry => ({
        month: entry.month,
        date: new Date(entry.month),
        avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
        volatility: this.cleanNumber(entry.volatility),
        garchVolatility: this.cleanNumber(entry.garch_volatility),
        conflictIntensity: this.cleanNumber(entry.conflict_intensity),
        sampleSize: entry.sampleSize || 1,
        priceStability: this.cleanNumber(entry.price_stability)
      }))
      .filter(entry => !isNaN(entry.date.getTime()))
      .sort((a, b) => a.date - b.date);
  }

  processMarketClusters(clusters = [], efficiency = []) {
    if (!Array.isArray(clusters)) {
      return [];
    }

    return clusters.map(cluster => {
      const clusterEfficiency = efficiency.find(
        e => e.cluster_id === cluster.cluster_id
      ) || {};

      return {
        ...cluster,
        efficiency: {
          internalConnectivity: this.cleanNumber(clusterEfficiency.internal_connectivity),
          marketCoverage: this.cleanNumber(clusterEfficiency.market_coverage),
          priceConvergence: this.cleanNumber(clusterEfficiency.price_convergence),
          stability: this.cleanNumber(clusterEfficiency.stability),
          efficiencyScore: this.cleanNumber(clusterEfficiency.efficiency_score)
        }
      };
    });
  }

  processFlowAnalysis(flows) {
    if (!Array.isArray(flows)) {
      return [];
    }

    return flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      totalFlow: this.cleanNumber(flow.total_flow),
      avgFlow: this.cleanNumber(flow.avg_flow),
      flowCount: flow.flow_count || 0,
      avgPriceDifferential: this.cleanNumber(flow.avg_price_differential)
    }));
  }

  processSpatialMetrics(spatial) {
    if (!spatial?.global) {
      return null;
    }

    return {
      global: {
        moranI: this.cleanNumber(spatial.global.moran_i),
        pValue: this.cleanNumber(spatial.global.p_value),
        zScore: this.cleanNumber(spatial.global.z_score),
        significance: Boolean(spatial.global.significance)
      },
      local: this.processLocalMetrics(spatial.local),
      hotspots: this.processHotspots(spatial.hotspots)
    };
  }

  processLocalMetrics(localMetrics = {}) {
    const processed = {};
    Object.entries(localMetrics).forEach(([region, metrics]) => {
      processed[region] = {
        localI: this.cleanNumber(metrics.local_i),
        pValue: this.cleanNumber(metrics.p_value),
        clusterType: metrics.cluster_type || 'undefined'
      };
    });
    return processed;
  }

  processHotspots(hotspots = {}) {
    const processed = {};
    Object.entries(hotspots).forEach(([region, stats]) => {
      processed[region] = {
        giStar: this.cleanNumber(stats.gi_star),
        category: stats.category || 'undefined'
      };
    });
    return processed;
  }

  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      value = value.replace(/[^\d.-]/g, '');
    }
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  normalizeCommodityName(commodity) {
    return commodity
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  clearCache() {
    this.cache.clear();
    monitoringSystem.log('Cache cleared', { manager: 'PreprocessedDataManager' });
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemory: Array.from(this.cache.values())
        .reduce((acc, val) => acc + JSON.stringify(val).length, 0)
    };
  }
}

// Export singleton instance
export const preprocessedDataManager = new PreprocessedDataManager();