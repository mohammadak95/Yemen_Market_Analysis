// src/utils/PreprocessedDataManager.js

import { configUtils } from './systemConfig';
import { monitoringSystem } from './MonitoringSystem';
import _ from 'lodash';
import { getDataPath } from './dataUtils'; // Ensure this utility is available

class PreprocessedDataManager {
  constructor() {
    this.cache = new Map();
    this._isInitialized = false;
  }

  /**
   * Initialize the preprocessed data manager
   */
  async init() {
    if (this._isInitialized) return;

    const metric = monitoringSystem.startMetric('init-preprocessed-manager');
    try {
      // Validate configuration
      configUtils.validateConfig();
      this._isInitialized = true;
      metric.finish({ status: 'success' });
      monitoringSystem.log('PreprocessedDataManager initialized successfully.', {}, 'init');
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Initialization failed for PreprocessedDataManager.', error, 'init');
      throw error;
    }
  }

  /**
   * Load preprocessed data for a specific commodity
   */
  async loadPreprocessedData(commodity) {
    if (!this._isInitialized) {
      throw new Error('PreprocessedDataManager must be initialized first');
    }

    const metric = monitoringSystem.startMetric('load-preprocessed-data');
    try {
      // Check cache first
      const cachedData = this.cache.get(commodity);
      if (cachedData) {
        monitoringSystem.log(`Preprocessed data cache hit for commodity: ${commodity}`, {}, 'loadPreprocessedData');
        return cachedData;
      }

      // Generate filename from pattern
      const filename = configUtils.getConfig('data.preprocessedPattern')
        .replace('{commodity}', this.normalizeCommodityName(commodity));

      const filePath = getDataPath(filename); // Construct the full file path

      monitoringSystem.log(`Loading preprocessed data from ${filePath} for commodity: ${commodity}`, {}, 'loadPreprocessedData');

      // Load data using fetch API
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch preprocessed data for ${commodity}: ${response.statusText}`);
      }
      const text = await response.text();
      const data = JSON.parse(text);

      // Validate and process the data
      const processedData = this.processPreprocessedData(data, commodity);

      // Cache the results
      this.cache.set(commodity, processedData);

      metric.finish({ status: 'success' });
      monitoringSystem.log(`Preprocessed data loaded and cached for commodity: ${commodity}`, {}, 'loadPreprocessedData');
      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error(`Error loading preprocessed data for ${commodity}.`, error, 'loadPreprocessedData');
      throw error;
    }
  }

  /**
   * Process and validate preprocessed data
   */
  processPreprocessedData(data, commodity) {
    const {
      time_series_data,
      market_clusters,
      cluster_efficiency,
      flow_analysis,
      spatial_autocorrelation,
      seasonal_analysis,
      market_integration,
      metadata
    } = data;

    // Validate required sections
    this.validateDataStructure(data);

    // Process time series data
    const processedTimeSeries = this.processTimeSeriesData(time_series_data);

    // Process market clusters with efficiency data
    const processedClusters = this.processMarketClusters(
      market_clusters,
      cluster_efficiency
    );

    // Process flow analysis
    const processedFlows = this.processFlowAnalysis(flow_analysis);

    // Process spatial metrics
    const processedSpatial = this.processSpatialMetrics(spatial_autocorrelation);

    // Combine all processed data
    return {
      timeSeriesData: processedTimeSeries,
      marketClusters: processedClusters,
      flowAnalysis: processedFlows,
      spatialAutocorrelation: processedSpatial,
      seasonalAnalysis: seasonal_analysis,
      marketIntegration: market_integration,
      metadata: {
        ...metadata,
        commodity,
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Process time series data with enhanced validation
   */
  processTimeSeriesData(timeSeriesData) {
    if (!Array.isArray(timeSeriesData)) {
      throw new Error('Time series data must be an array');
    }

    return timeSeriesData.map(entry => ({
      month: entry.month,
      date: new Date(entry.month),
      avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
      volatility: this.cleanNumber(entry.volatility),
      garchVolatility: entry.garch_volatility,
      conflictIntensity: this.cleanNumber(entry.conflict_intensity),
      sampleSize: entry.sampleSize || 1,
      priceStability: this.cleanNumber(entry.price_stability)
    })).sort((a, b) => a.date - b.date);
  }

  /**
   * Process market clusters with efficiency metrics
   */
  processMarketClusters(clusters, efficiency) {
    if (!Array.isArray(clusters)) {
      throw new Error('Market clusters must be an array');
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

  /**
   * Process flow analysis data
   */
  processFlowAnalysis(flows) {
    if (!Array.isArray(flows)) {
      throw new Error('Flow analysis must be an array');
    }

    return flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      totalFlow: this.cleanNumber(flow.total_flow),
      avgFlow: this.cleanNumber(flow.avg_flow),
      flowCount: flow.flow_count,
      avgPriceDifferential: this.cleanNumber(flow.avg_price_differential)
    }));
  }

  /**
   * Process spatial autocorrelation metrics
   */
  processSpatialMetrics(spatial) {
    if (!spatial?.global) {
      throw new Error('Invalid spatial autocorrelation data');
    }

    return {
      global: {
        moranI: this.cleanNumber(spatial.global.moran_i),
        pValue: spatial.global.p_value,
        zScore: spatial.global.z_score,
        significance: spatial.global.significance === "True"
      },
      local: Object.entries(spatial.local || {}).reduce((acc, [region, metrics]) => {
        acc[region] = {
          localI: this.cleanNumber(metrics.local_i),
          pValue: this.cleanNumber(metrics.p_value),
          clusterType: metrics.cluster_type
        };
        return acc;
      }, {}),
      hotspots: Object.entries(spatial.hotspots || {}).reduce((acc, [region, stats]) => {
        acc[region] = {
          giStar: stats.gi_star,
          category: stats.category
        };
        return acc;
      }, {})
    };
  }

  /**
   * Validate the overall data structure
   */
  validateDataStructure(data) {
    const requiredSections = [
      'time_series_data',
      'market_clusters',
      'cluster_efficiency',
      'flow_analysis',
      'spatial_autocorrelation',
      'seasonal_analysis',
      'market_integration',
      'metadata'
    ];

    const missingSections = requiredSections.filter(section => !(section in data));
    
    if (missingSections.length > 0) {
      throw new Error(`Missing required sections: ${missingSections.join(', ')}`);
    }
  }

  /**
   * Clean numeric values
   */
  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Normalize commodity name for file access
   */
  normalizeCommodityName(commodity) {
    return commodity
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    monitoringSystem.log('PreprocessedDataManager cache cleared.', {}, 'clearCache');
  }

  /**
   * Get cache statistics
   */
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