// src/utils/SpatialSystem.js

import { monitoringSystem } from './MonitoringSystem';
import _ from 'lodash';
import { unifiedDataManager } from './UnifiedDataManager';

/**
 * Unified system for spatial data processing, validation, and integration
 */
class SpatialSystem {
  constructor() {
    this.monitor = monitoringSystem;
    this._isInitialized = false;

    // Configuration
    this.config = {
      validation: {
        minTimeSeriesLength: 12,
        maxClusterSize: 20,
        minClusterSize: 2,
        flowThreshold: 0.1,
        pValueThreshold: 0.05,
        minCoverage: 0.8
      },
      integration: {
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 100
      },
      visualization: {
        modes: {
          PRICES: 'prices',
          FLOWS: 'flows',
          CLUSTERS: 'clusters',
          SHOCKS: 'shocks'
        }
      }
    };
  }

  /**
   * Initialize the spatial system
   */
  async initialize() {
    if (this._isInitialized) return;

    const metric = this.monitor.startMetric('spatial-system-init');
    
    try {
      // Initialize dependencies
      await unifiedDataManager.init();
      
      this._isInitialized = true;
      metric.finish({ status: 'success' });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Process and validate spatial data
   */
  async processSpatialData(rawData, options = {}) {
    const metric = this.monitor.startMetric('process-spatial-data');

    try {
      // Validate input data
      const validationResult = await this.validateData(rawData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid data: ${validationResult.errors.join(', ')}`);
      }

      // Process different components
      const [
        timeSeriesData,
        marketClusters,
        flowAnalysis,
        spatialMetrics
      ] = await Promise.all([
        this.processTimeSeriesData(rawData.timeSeriesData, options),
        this.processMarketClusters(rawData.marketClusters, options),
        this.processFlowAnalysis(rawData.flowAnalysis, options),
        this.processSpatialMetrics(rawData.spatialAutocorrelation, options)
      ]);

      // Calculate derived metrics
      const derivedMetrics = this.calculateDerivedMetrics({
        timeSeriesData,
        marketClusters,
        flowAnalysis,
        spatialMetrics
      });

      const result = {
        timeSeriesData,
        marketClusters,
        flowAnalysis,
        spatialMetrics,
        derivedMetrics,
        metadata: {
          processedAt: new Date().toISOString(),
          options
        }
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Validate spatial data structure and content
   */
  async validateData(data) {
    const metric = this.monitor.startMetric('validate-spatial-data');
    
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Validate required fields
      const requiredFields = [
        'timeSeriesData',
        'marketClusters',
        'flowAnalysis',
        'spatialAutocorrelation'
      ];

      requiredFields.forEach(field => {
        if (!data[field]) {
          result.errors.push(`Missing required field: ${field}`);
          result.isValid = false;
        }
      });

      if (!result.isValid) {
        return result;
      }

      // Validate time series data
      if (data.timeSeriesData.length < this.config.validation.minTimeSeriesLength) {
        result.warnings.push(`Time series data length (${data.timeSeriesData.length}) below recommended minimum`);
      }

      // Validate market clusters
      data.marketClusters.forEach((cluster, index) => {
        if (cluster.market_count > this.config.validation.maxClusterSize) {
          result.warnings.push(`Cluster ${index} exceeds maximum recommended size`);
        }
      });

      // Calculate coverage metrics
      const coverage = this.calculateCoverageMetrics(data);
      result.details.coverage = coverage;

      // Add coverage warnings
      Object.entries(coverage).forEach(([type, value]) => {
        if (value < this.config.validation.minCoverage) {
          result.warnings.push(`Low ${type} coverage: ${(value * 100).toFixed(1)}%`);
        }
      });

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Process time series data
   */
  async processTimeSeriesData(data, options = {}) {
    if (!Array.isArray(data)) return [];

    return data.map(entry => ({
      month: entry.month,
      date: new Date(entry.month),
      avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
      volatility: this.cleanNumber(entry.volatility),
      conflict_intensity: this.cleanNumber(entry.conflict_intensity),
      price_stability: this.cleanNumber(entry.price_stability),
      sampleSize: entry.sampleSize || 1
    })).sort((a, b) => a.date - b.date);
  }

  /**
   * Process market clusters
   */
  async processMarketClusters(clusters, options = {}) {
    if (!Array.isArray(clusters)) return [];

    return clusters.map(cluster => ({
      cluster_id: cluster.cluster_id,
      main_market: cluster.main_market,
      connected_markets: cluster.connected_markets,
      market_count: cluster.market_count,
      efficiency: this.calculateClusterEfficiency(cluster)
    }));
  }

  /**
   * Process flow analysis
   */
  async processFlowAnalysis(flows, options = {}) {
    if (!Array.isArray(flows)) return [];

    const { minFlowWeight = this.config.validation.flowThreshold } = options;

    return flows
      .filter(flow => flow.avg_flow >= minFlowWeight)
      .map(flow => ({
        source: flow.source,
        target: flow.target,
        total_flow: this.cleanNumber(flow.total_flow),
        avg_flow: this.cleanNumber(flow.avg_flow),
        flow_count: flow.flow_count,
        avg_price_differential: this.cleanNumber(flow.avg_price_differential)
      }));
  }

  /**
   * Process spatial metrics
   */
  async processSpatialMetrics(metrics, options = {}) {
    if (!metrics?.global) return null;

    return {
      global: {
        moran_i: this.cleanNumber(metrics.global.moran_i),
        p_value: this.cleanNumber(metrics.global.p_value),
        significance: metrics.global.significance === true
      },
      local: this.processLocalMetrics(metrics.local),
      hotspots: this.processHotspots(metrics.hotspots)
    };
  }

  /**
   * Calculate derived metrics
   */
  calculateDerivedMetrics(data) {
    return {
      marketIntegration: this.calculateMarketIntegration(data),
      spatialDependence: this.calculateSpatialDependence(data),
      marketEfficiency: this.calculateMarketEfficiency(data),
      conflictImpact: this.calculateConflictImpact(data)
    };
  }

  /**
   * Calculate market integration metrics
   */
  calculateMarketIntegration({ flowAnalysis, marketClusters }) {
    const totalFlows = flowAnalysis.length;
    const avgFlowWeight = _.meanBy(flowAnalysis, 'avg_flow');
    const clusterCount = marketClusters.length;
    
    return {
      flowDensity: totalFlows / (clusterCount * (clusterCount - 1)),
      avgFlowWeight,
      clusterCount
    };
  }

  /**
   * Calculate spatial dependence metrics
   */
  calculateSpatialDependence({ spatialMetrics }) {
    const { moran_i, p_value } = spatialMetrics.global;
    
    return {
      moranI: moran_i,
      pValue: p_value,
      isSignificant: p_value < this.config.validation.pValueThreshold,
      strength: Math.abs(moran_i)
    };
  }

  /**
   * Calculate market efficiency metrics
   */
  calculateMarketEfficiency({ timeSeriesData, flowAnalysis }) {
    const priceVariation = this.calculatePriceVariation(timeSeriesData);
    const flowEfficiency = this.calculateFlowEfficiency(flowAnalysis);
    
    return {
      priceVariation,
      flowEfficiency,
      overallEfficiency: (priceVariation + flowEfficiency) / 2
    };
  }

  /**
   * Utility method to clean numeric values
   */
  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Calculate coverage metrics
   */
  calculateCoverageMetrics(data) {
    const allMarkets = new Set();
    const marketSets = {
      timeSeries: new Set(),
      clusters: new Set(),
      flows: new Set(),
      spatial: new Set()
    };

    // Collect markets from time series
    data.timeSeriesData.forEach(entry => {
      allMarkets.add(entry.region);
      marketSets.timeSeries.add(entry.region);
    });

    // Collect markets from clusters
    data.marketClusters.forEach(cluster => {
      allMarkets.add(cluster.main_market);
      marketSets.clusters.add(cluster.main_market);
      cluster.connected_markets.forEach(market => {
        allMarkets.add(market);
        marketSets.clusters.add(market);
      });
    });

    // Collect markets from flows
    data.flowAnalysis.forEach(flow => {
      allMarkets.add(flow.source);
      allMarkets.add(flow.target);
      marketSets.flows.add(flow.source);
      marketSets.flows.add(flow.target);
    });

    // Calculate coverage ratios
    const totalMarkets = allMarkets.size;
    return {
      timeSeries: marketSets.timeSeries.size / totalMarkets,
      clusters: marketSets.clusters.size / totalMarkets,
      flows: marketSets.flows.size / totalMarkets,
      spatial: marketSets.spatial.size / totalMarkets
    };
  }

  destroy() {
    this._isInitialized = false;
  }

  /**
   * Process spatial analysis data - primarily organizing preprocessed data
   * for visualization and analysis needs
   */
  async processSpatialData(preprocessedData) {
    const metric = this.monitor.startMetric('process-spatial-data');

    try {
      const {
        time_series_data,
        market_clusters,
        flow_analysis,
        spatial_autocorrelation,
        seasonal_analysis,
        market_integration,
        metadata
      } = preprocessedData;

      // Organize data into analysis-ready structure
      const processedData = {
        timeSeriesMetrics: this.extractTimeSeriesMetrics(time_series_data),
        marketStructure: this.extractMarketStructure(market_clusters, flow_analysis),
        spatialPatterns: this.extractSpatialPatterns(spatial_autocorrelation),
        seasonalPatterns: seasonal_analysis[0] || null, // Already in correct format
        integrationMetrics: this.extractIntegrationMetrics(market_integration),
        metadata
      };

      metric.finish({ status: 'success' });
      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Extract key time series metrics from preprocessed data
   */
  extractTimeSeriesMetrics(timeSeriesData) {
    return {
      series: timeSeriesData,
      summary: {
        latestPrice: timeSeriesData[timeSeriesData.length - 1]?.avgUsdPrice,
        latestVolatility: timeSeriesData[timeSeriesData.length - 1]?.volatility,
        latestStability: timeSeriesData[timeSeriesData.length - 1]?.price_stability
      }
    };
  }

  /**
   * Extract market structure from clusters and flows
   */
  extractMarketStructure(clusters, flows) {
    return {
      clusters: clusters.map(cluster => ({
        ...cluster,
        flowCount: flows.filter(flow => 
          cluster.connected_markets.includes(flow.source) &&
          cluster.connected_markets.includes(flow.target)
        ).length
      })),
      flows: flows
    };
  }

  /**
   * Extract spatial patterns from autocorrelation results
   */
  extractSpatialPatterns(spatialAutocorrelation) {
    const { global, local, hotspots } = spatialAutocorrelation;

    return {
      globalMetrics: global,
      localPatterns: local,
      hotspots,
      summary: {
        hasSignificantClustering: global.significance === "True",
        hotspotCount: Object.values(hotspots)
          .filter(spot => spot.intensity === "hot_spot").length,
        coldspotCount: Object.values(hotspots)
          .filter(spot => spot.intensity === "cold_spot").length
      }
    };
  }

  /**
   * Extract integration metrics from market integration data
   */
  extractIntegrationMetrics(marketIntegration) {
    return {
      flowDensity: marketIntegration.flow_density,
      integrationScore: marketIntegration.integration_score,
      accessibility: marketIntegration.accessibility,
      summary: {
        averageAccessibility: _.mean(Object.values(marketIntegration.accessibility)),
        marketCoverage: Object.keys(marketIntegration.accessibility).length
      }
    };
  }

  /**
   * Get color scales for visualization
   */
  getColorScales(mode, data) {
    // Color scale logic for visualization - unchanged as it's UI-specific
    return {
      getColor: (feature) => '#ccc', // Implement based on UI needs
      domain: [0, 1],
      format: value => value.toFixed(2)
    };
  }

  /**
   * Get time periods available in the data
   */
  getAvailableTimePeriods(data) {
    return _.uniqBy(data.time_series_data, 'month')
      .map(d => d.month)
      .sort();
  }

  /**
   * Get markets available in the data
   */
  getAvailableMarkets(data) {
    const marketsFromClusters = _.flatMap(data.market_clusters, 
      cluster => cluster.connected_markets
    );
    return _.uniq(marketsFromClusters);
  }
}

// Export singleton instance
export const spatialSystem = new SpatialSystem();