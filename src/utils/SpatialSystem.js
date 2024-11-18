// src/utils/SpatialSystem.js

import { monitoringSystem } from './MonitoringSystem';
import _ from 'lodash';
import { unifiedDataManager } from './UnifiedDataManager';

/**
 * Unified system for spatial data processing, validation, and integration
 */
class SpatialSystem {
  constructor() {
    this._isInitialized = false;
    this.monitor = monitoringSystem;

    // Configuration
    this.config = {
      validation: {
        minTimeSeriesLength: 12,
        maxClusterSize: 20,
        minClusterSize: 2,
        flowThreshold: 0.1,
        pValueThreshold: 0.05,
        minCoverage: 0.8
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
   * @param {Object} rawData - The raw spatial data to process
   * @param {Object} options - Optional parameters for processing
   * @returns {Object} Processed spatial data
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
        this.processMarketClusters(rawData.marketClusters, { ...options, marketData: rawData.marketData }),
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

      // Add analysis results
      const analysisResults = await this.generateAnalysisResults(rawData, options);
      const finalResult = {
        ...result,
        analysis: analysisResults
      };

      metric.finish({ status: 'success' });
      return finalResult;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Validate spatial data structure and content
   * @param {Object} data - The spatial data to validate
   * @returns {Object} Validation result
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
        'spatialAutocorrelation',
        'marketData' // Assuming marketData is required for efficiency calculations
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
        result.warnings.push(`Time series data length (${data.timeSeriesData.length}) below recommended minimum of ${this.config.validation.minTimeSeriesLength}`);
      }

      // Validate market clusters
      data.marketClusters.forEach((cluster, index) => {
        if (cluster.market_count > this.config.validation.maxClusterSize) {
          result.warnings.push(`Cluster ${index + 1} exceeds maximum recommended size of ${this.config.validation.maxClusterSize}`);
        }
        if (cluster.market_count < this.config.validation.minClusterSize) {
          result.warnings.push(`Cluster ${index + 1} below minimum required size of ${this.config.validation.minClusterSize}`);
        }
      });

      // Calculate coverage metrics
      const coverage = this.calculateCoverageMetrics(data);
      result.details.coverage = coverage;

      // Add coverage warnings
      Object.entries(coverage).forEach(([type, value]) => {
        if (value < this.config.validation.minCoverage) {
          result.warnings.push(`Low ${type} coverage: ${(value * 100).toFixed(1)}% (minimum required: ${(this.config.validation.minCoverage * 100)}%)`);
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
   * @param {Array} data - Raw time series data
   * @param {Object} options - Processing options
   * @returns {Array} Processed time series data
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
      sampleSize: entry.sampleSize || 1,
      region: entry.region // Assuming 'region' is part of the data
    })).sort((a, b) => a.date - b.date);
  }

  /**
   * Process market clusters
   * @param {Array} clusters - Raw market clusters data
   * @param {Object} options - Processing options
   * @returns {Array} Processed market clusters data
   */
  async processMarketClusters(clusters, options = {}) {
    if (!Array.isArray(clusters)) return [];

    return clusters.map(cluster => ({
      cluster_id: cluster.cluster_id,
      main_market: cluster.main_market,
      connected_markets: cluster.connected_markets,
      market_count: cluster.market_count,
      efficiency: this.calculateClusterEfficiency(cluster, options.marketData || [])
    }));
  }

  /**
   * Process flow analysis data
   * @param {Array} flows - Raw flow analysis data
   * @param {Object} options - Processing options
   * @returns {Array} Processed flow analysis data
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
   * Process spatial metrics data
   * @param {Object} metrics - Raw spatial autocorrelation data
   * @param {Object} options - Processing options
   * @returns {Object} Processed spatial metrics data
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
   * Process local spatial metrics
   * @param {Array} localMetrics - Raw local metrics data
   * @returns {Array} Processed local metrics
   */
  processLocalMetrics(localMetrics) {
    // Example implementation: Normalize local Moran's I values
    if (!Array.isArray(localMetrics)) return [];

    return localMetrics.map(metric => ({
      region: metric.region,
      moran_i: this.cleanNumber(metric.moran_i),
      p_value: this.cleanNumber(metric.p_value),
      significance: metric.p_value < this.config.validation.pValueThreshold
    }));
  }

  /**
   * Process hotspots data
   * @param {Array} hotspots - Raw hotspots data
   * @returns {Array} Processed hotspots data
   */
  processHotspots(hotspots) {
    // Example implementation: Identify hotspots based on z-scores
    if (!Array.isArray(hotspots)) return [];

    return hotspots.map(hotspot => ({
      region: hotspot.region,
      z_score: this.cleanNumber(hotspot.z_score),
      hotspot_type: hotspot.z_score > 2 ? 'High' :
                    hotspot.z_score < -2 ? 'Low' : 'Neutral'
    }));
  }

  /**
   * Calculate derived metrics from processed data
   * @param {Object} data - Processed data components
   * @returns {Object} Derived metrics
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
   * @param {Object} data - Processed data components
   * @returns {Object} Market integration metrics
   */
  calculateMarketIntegration({ flowAnalysis, marketClusters }) {
    const totalFlows = flowAnalysis.length;
    const avgFlowWeight = _.meanBy(flowAnalysis, 'avg_flow') || 0;
    const clusterCount = marketClusters.length;

    return {
      flowDensity: clusterCount > 1 ? totalFlows / (clusterCount * (clusterCount - 1)) : 0,
      avgFlowWeight,
      clusterCount
    };
  }

  /**
   * Calculate spatial dependence metrics
   * @param {Object} data - Processed data components
   * @returns {Object} Spatial dependence metrics
   */
  calculateSpatialDependence({ spatialMetrics }) {
    if (!spatialMetrics || !spatialMetrics.global) return {};

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
   * @param {Object} data - Processed data components
   * @returns {Object} Market efficiency metrics
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
   * Calculate conflict impact metrics
   * @param {Object} data - Processed data components
   * @returns {Object} Conflict impact metrics
   */
  calculateConflictImpact(data) {
    const { timeSeriesData, flowAnalysis, marketData } = data;

    // Calculate direct price effects
    const priceEffects = this.analyzePriceTransmission(data);

    // Calculate market disruption scores
    const marketDisruptions = this.analyzeConflictImpact(data);

    // Analyze spatial spillover effects
    const spilloverEffects = this.analyzeSpilloverEffects(data);

    // Calculate resilience metrics
    const resilienceMetrics = this.calculateMarketResilience(data);

    // Calculate overall conflict impact score
    const conflictImpactScore = this.calculateOverallImpact(
      priceEffects,
      marketDisruptions,
      spilloverEffects,
      resilienceMetrics
    );

    return {
      conflictImpactScore,
      details: {
        priceEffects,
        marketDisruptions,
        spilloverEffects,
        resilienceMetrics,
        temporalPatterns: this.analyzeTemporalPatterns(timeSeriesData)
      }
    };
  }

  /**
   * Calculate composite indices for market performance
   * @param {Object} data - Processed data components
   * @returns {Object} Composite indices
   */
  async calculateCompositeIndices(data) {
    const metric = this.monitor.startMetric('calculate-composite-indices');

    try {
      const { timeSeriesData, marketClusters, flowAnalysis } = data;

      // Calculate market efficiency index
      const efficiencyIndex = this.calculateEfficiencyIndex(timeSeriesData, flowAnalysis);

      // Calculate integration index
      const integrationIndex = this.calculateIntegrationIndex(marketClusters, flowAnalysis);

      // Calculate stability index
      const stabilityIndex = this.calculateStabilityIndex(timeSeriesData);

      // Calculate resilience index
      const resilienceIndex = this.calculateResilienceIndex(timeSeriesData, flowAnalysis);

      // Calculate overall market performance index
      const marketPerformanceIndex = this.calculateOverallPerformance(
        efficiencyIndex,
        integrationIndex,
        stabilityIndex,
        resilienceIndex
      );

      const result = {
        marketPerformanceIndex,
        details: {
          efficiencyIndex,
          integrationIndex,
          stabilityIndex,
          resilienceIndex,
          subIndices: {
            priceDiscovery: this.calculatePriceDiscoveryIndex(timeSeriesData),
            marketAccess: this.calculateMarketAccessIndex(flowAnalysis),
            competitiveness: this.calculateCompetitivenessIndex(marketClusters)
          }
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
   * Get the current validation status
   * @returns {Object} Validation status information
   */
  getValidationStatus() {
    return {
      isInitialized: this._isInitialized,
      validation: {
        timeSeriesLength: this.config.validation.minTimeSeriesLength,
        clusterSizes: {
          min: this.config.validation.minClusterSize,
          max: this.config.validation.maxClusterSize
        },
        flowThreshold: this.config.validation.flowThreshold,
        coverage: this.config.validation.minCoverage
      }
    };
  }

  /**
   * Utility method to clean numeric values
   * @param {*} value - The value to clean
   * @returns {number} Cleaned number
   */
  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Calculate coverage metrics
   * @param {Object} data - Raw spatial data
   * @returns {Object} Coverage ratios
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

    // Collect markets from spatial metrics (assuming spatial includes all markets)
    if (data.spatialAutocorrelation?.local) {
      data.spatialAutocorrelation.local.forEach(metric => {
        allMarkets.add(metric.region);
        marketSets.spatial.add(metric.region);
      });
    }

    // Calculate coverage ratios
    const totalMarkets = allMarkets.size;
    return {
      timeSeries: totalMarkets ? (marketSets.timeSeries.size / totalMarkets) : 0,
      clusters: totalMarkets ? (marketSets.clusters.size / totalMarkets) : 0,
      flows: totalMarkets ? (marketSets.flows.size / totalMarkets) : 0,
      spatial: totalMarkets ? (marketSets.spatial.size / totalMarkets) : 0
    };
  }

  /**
   * Analyze price transmission across markets
   * @param {Object} data - Processed data components
   * @returns {Object} Price transmission analysis
   */
  async analyzePriceTransmission(data) {
    const metric = this.monitor.startMetric('analyze-price-transmission');

    try {
      const { timeSeriesData, marketClusters, flowAnalysis } = data;

      // Calculate bilateral price correlations
      const correlations = new Map();
      const markets = new Set(flowAnalysis.map(f => [f.source, f.target]).flat());

      for (const market1 of markets) {
        for (const market2 of markets) {
          if (market1 !== market2 && !correlations.has(`${market2}-${market1}`)) {
            const market1Data = timeSeriesData.filter(d => d.region === market1);
            const market2Data = timeSeriesData.filter(d => d.region === market2);
            const correlation = this.calculatePriceCorrelation(market1Data, market2Data);
            correlations.set(`${market1}-${market2}`, correlation);
          }
        }
      }

      // Calculate transmission speeds for each market pair
      const transmissionSpeeds = flowAnalysis.map(flow => ({
        source: flow.source,
        target: flow.target,
        speed: this.calculateTransmissionSpeed(flow, timeSeriesData)
      }));

      // Calculate market integration metrics
      const integrationMetrics = marketClusters.map(cluster => ({
        clusterId: cluster.cluster_id,
        markets: cluster.connected_markets,
        integrationScore: this.calculateClusterIntegration(
          cluster,
          correlations,
          transmissionSpeeds
        )
      }));

      // Calculate overall transmission coefficient
      const transmissionCoefficient = this.calculateOverallTransmission(
        transmissionSpeeds,
        correlations
      );

      const result = {
        transmissionCoefficient,
        details: {
          marketPairCorrelations: Object.fromEntries(correlations),
          transmissionSpeeds,
          integrationMetrics,
          spatialPatterns: this.analyzeSpatialTransmissionPatterns(
            transmissionSpeeds,
            marketClusters
          )
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
   * Analyze the impact of conflict on market dynamics
   * @param {Object} data - Processed data components
   * @returns {Object} Conflict impact analysis
   */
  async analyzeConflictImpact(data) {
    const metric = this.monitor.startMetric('analyze-conflict-impact');

    try {
      const { timeSeriesData, marketClusters, flowAnalysis } = data;

      // Calculate direct price effects
      const priceEffects = timeSeriesData.map(entry => ({
        region: entry.region,
        date: entry.date,
        priceEffect: this.calculateConflictPriceEffect(
          entry.avgUsdPrice,
          entry.conflict_intensity
        )
      }));

      // Calculate market disruption scores
      const marketDisruptions = flowAnalysis.map(flow => ({
        source: flow.source,
        target: flow.target,
        disruption: this.calculateFlowDisruption(
          flow,
          timeSeriesData
        )
      }));

      // Analyze spatial spillover effects
      const spilloverEffects = this.analyzeSpilloverEffects(data);

      // Calculate resilience metrics
      const resilienceMetrics = this.calculateMarketResilience(
        timeSeriesData,
        marketDisruptions
      );

      // Calculate overall conflict impact score
      const conflictImpactScore = this.calculateOverallImpact(
        priceEffects,
        marketDisruptions,
        spilloverEffects,
        resilienceMetrics
      );

      const result = {
        conflictImpactScore,
        details: {
          priceEffects,
          marketDisruptions,
          spilloverEffects,
          resilienceMetrics,
          temporalPatterns: this.analyzeTemporalPatterns(timeSeriesData)
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
   * Analyze spillover effects within market clusters
   * @param {Object} data - Processed data components
   * @returns {Array} Spillover effects data
   */
  analyzeSpilloverEffects(data) {
    const { marketClusters, flowAnalysis } = data;

    return marketClusters.map(cluster => {
      const disruptions = flowAnalysis.filter(flow =>
        cluster.connected_markets.includes(flow.source) &&
        cluster.connected_markets.includes(flow.target)
      );

      const totalDisruption = disruptions.reduce((acc, curr) => acc + curr.disruption, 0);
      const avgDisruption = disruptions.length ? totalDisruption / disruptions.length : 0;

      return {
        clusterId: cluster.cluster_id,
        totalDisruption,
        avgDisruption
      };
    });
  }

  /**
   * Calculate price correlation between two markets
   * @param {Array} market1Data - Time series data for market 1
   * @param {Array} market2Data - Time series data for market 2
   * @returns {number} Pearson correlation coefficient
   */
  calculatePriceCorrelation(market1Data, market2Data) {
    // Align data by date
    const market1Map = new Map(market1Data.map(d => [d.date.toISOString(), d.avgUsdPrice]));
    const market2Map = new Map(market2Data.map(d => [d.date.toISOString(), d.avgUsdPrice]));

    const commonDates = [...market1Map.keys()].filter(date => market2Map.has(date));

    const market1Prices = commonDates.map(date => market1Map.get(date));
    const market2Prices = commonDates.map(date => market2Map.get(date));

    if (market1Prices.length === 0 || market2Prices.length === 0) return 0;

    return this.pearsonCorrelation(market1Prices, market2Prices);
  }

  /**
   * Calculate speed of price adjustment between markets
   * @param {Object} flow - Flow analysis data
   * @param {Array} timeSeriesData - Time series data
   * @returns {number} Transmission speed
   */
  calculateTransmissionSpeed(flow, timeSeriesData) {
    // Example implementation: Difference in price changes over time
    const sourceData = timeSeriesData.filter(d => d.region === flow.source).sort((a, b) => a.date - b.date);
    const targetData = timeSeriesData.filter(d => d.region === flow.target).sort((a, b) => a.date - b.date);

    if (sourceData.length < 2 || targetData.length < 2) return 0;

    const sourceChanges = [];
    for (let i = 1; i < sourceData.length; i++) {
      const change = (sourceData[i].avgUsdPrice - sourceData[i - 1].avgUsdPrice) / sourceData[i - 1].avgUsdPrice;
      sourceChanges.push(change);
    }

    const targetChanges = [];
    for (let i = 1; i < targetData.length; i++) {
      const change = (targetData[i].avgUsdPrice - targetData[i - 1].avgUsdPrice) / targetData[i - 1].avgUsdPrice;
      targetChanges.push(change);
    }

    // Align changes by date
    const minLength = Math.min(sourceChanges.length, targetChanges.length);
    const alignedSourceChanges = sourceChanges.slice(-minLength);
    const alignedTargetChanges = targetChanges.slice(-minLength);

    return this.pearsonCorrelation(alignedSourceChanges, alignedTargetChanges);
  }

  /**
   * Calculate cluster integration score
   * @param {Object} cluster - Market cluster data
   * @param {Map} correlations - Market pair correlations
   * @param {Array} transmissionSpeeds - Transmission speeds data
   * @returns {number} Integration score
   */
  calculateClusterIntegration(cluster, correlations, transmissionSpeeds) {
    const clusterCorrelations = [];
    const clusterSpeeds = [];

    for (const market1 of cluster.connected_markets) {
      for (const market2 of cluster.connected_markets) {
        if (market1 !== market2) {
          const key = `${market1}-${market2}`;
          const reverseKey = `${market2}-${market1}`;
          const correlation = correlations.get(key) || correlations.get(reverseKey) || 0;
          clusterCorrelations.push(correlation);

          const speed = transmissionSpeeds.find(
            s => (s.source === market1 && s.target === market2) ||
                 (s.source === market2 && s.target === market1)
          );
          if (speed) clusterSpeeds.push(speed.speed);
        }
      }
    }

    const avgCorrelation = clusterCorrelations.length ? this.mean(clusterCorrelations) : 0;
    const avgSpeed = clusterSpeeds.length ? this.mean(clusterSpeeds) : 0;

    return (avgCorrelation + avgSpeed) / 2;
  }

  /**
   * Calculate overall transmission coefficient
   * @param {Array} transmissionSpeeds - Transmission speeds data
   * @param {Map} correlations - Market pair correlations
   * @returns {number} Overall transmission coefficient
   */
  calculateOverallTransmission(transmissionSpeeds, correlations) {
    const totalSpeed = transmissionSpeeds.reduce((acc, curr) => acc + curr.speed, 0);
    const avgSpeed = transmissionSpeeds.length ? totalSpeed / transmissionSpeeds.length : 0;

    const totalCorrelation = Array.from(correlations.values()).reduce((acc, curr) => acc + curr, 0);
    const avgCorrelation = correlations.size ? totalCorrelation / correlations.size : 0;

    return (avgSpeed + avgCorrelation) / 2;
  }

  /**
   * Analyze spatial transmission patterns
   * @param {Array} transmissionSpeeds - Transmission speeds data
   * @param {Array} marketClusters - Market clusters data
   * @returns {Object} Spatial transmission patterns
   */
  analyzeSpatialTransmissionPatterns(transmissionSpeeds, marketClusters) {
    // Identify clusters with high transmission speeds
    const highTransmissionClusters = marketClusters.filter(cluster => {
      const clusterSpeeds = transmissionSpeeds.filter(speed =>
        cluster.connected_markets.includes(speed.source) &&
        cluster.connected_markets.includes(speed.target)
      ).map(speed => speed.speed);

      const avgClusterSpeed = clusterSpeeds.length ? this.mean(clusterSpeeds) : 0;
      return avgClusterSpeed > 0.5; // Threshold for high transmission
    });

    return {
      highTransmissionClusters: highTransmissionClusters.map(cluster => cluster.cluster_id),
      totalClusters: marketClusters.length
    };
  }

  /**
   * Analyze temporal patterns in time series data
   * @param {Array} timeSeriesData - Time series data
   * @returns {Object} Temporal patterns analysis
   */
  analyzeTemporalPatterns(timeSeriesData) {
    // Example implementation: Identify seasonal trends using simple moving averages
    // This can be expanded with more sophisticated time series analysis as needed

    const months = timeSeriesData.map(d => d.date.getMonth() + 1);
    const prices = timeSeriesData.map(d => d.avgUsdPrice);

    // Calculate moving average (window size = 3)
    const movingAverage = prices.map((price, index, arr) => {
      if (index < 1 || index > arr.length - 2) return price;
      return (arr[index - 1] + arr[index] + arr[index + 1]) / 3;
    });

    // Detect upward or downward trends
    let trend = 'Stable';
    const trendSlope = this.calculateTrendSlope(prices, movingAverage);
    if (trendSlope > 0.01) trend = 'Upward';
    else if (trendSlope < -0.01) trend = 'Downward';

    return {
      movingAverage,
      trend
    };
  }

  /**
   * Calculate trend slope between actual prices and moving average
   * @param {Array} actual - Actual price data
   * @param {Array} movingAverage - Moving average data
   * @returns {number} Trend slope
   */
  calculateTrendSlope(actual, movingAverage) {
    if (actual.length !== movingAverage.length) return 0;

    const n = actual.length;
    const meanActual = this.mean(actual);
    const meanMA = this.mean(movingAverage);

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (actual[i] - meanActual) * (movingAverage[i] - meanMA);
      denominator += Math.pow(movingAverage[i] - meanMA, 2);
    }

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Analyze price transmission across markets
   * @param {Object} data - Processed data components
   * @returns {Object} Price transmission analysis
   */
  analyzePriceTransmission(data) {
    // Already implemented in analyzePriceTransmission method
    // This placeholder can be removed or kept for additional processing if needed
    return {};
  }

  /**
   * Analyze conflict impact on markets
   * @param {Object} data - Processed data components
   * @returns {Array} Market disruptions data
   */
  analyzeConflictImpact(data) {
    const { flowAnalysis, marketData } = data;

    // Example implementation: Calculate disruption based on flow count and conflict intensity
    return flowAnalysis.map(flow => {
      const conflictEntry = marketData.find(m => m.market === flow.source || m.market === flow.target);
      const conflictIntensity = conflictEntry ? conflictEntry.conflict_intensity : 0;
      const disruption = flow.flow_count * flow.avg_flow * conflictIntensity;
      return {
        source: flow.source,
        target: flow.target,
        disruption
      };
    });
  }

  /**
   * Calculate overall impact score based on various factors
   * @param {Array} priceEffects - Price effects data
   * @param {Array} marketDisruptions - Market disruptions data
   * @param {Array} spilloverEffects - Spillover effects data
   * @param {Object} resilienceMetrics - Resilience metrics data
   * @returns {number} Overall conflict impact score
   */
  calculateOverallImpact(priceEffects, marketDisruptions, spilloverEffects, resilienceMetrics) {
    // Example calculation: Weighted sum of different impact factors
    const weightPrice = 0.4;
    const weightDisruption = 0.3;
    const weightSpillover = 0.2;
    const weightResilience = 0.1;

    const totalPriceEffect = priceEffects.reduce((acc, curr) => acc + curr.priceEffect, 0);
    const avgPriceEffect = priceEffects.length ? totalPriceEffect / priceEffects.length : 0;

    const totalDisruption = marketDisruptions.reduce((acc, curr) => acc + curr.disruption, 0);
    const avgDisruption = marketDisruptions.length ? totalDisruption / marketDisruptions.length : 0;

    const totalSpillover = spilloverEffects.reduce((acc, curr) => acc + curr.avgDisruption, 0);
    const avgSpillover = spilloverEffects.length ? totalSpillover / spilloverEffects.length : 0;

    const resilienceScore = resilienceMetrics.overallResilience;

    return (
      (avgPriceEffect * weightPrice) +
      (avgDisruption * weightDisruption) +
      (avgSpillover * weightSpillover) +
      (resilienceScore * weightResilience)
    );
  }

  /**
   * Calculate efficiency index
   * @param {Array} timeSeriesData - Time series data
   * @param {Array} flowAnalysis - Flow analysis data
   * @returns {number} Efficiency index
   */
  calculateEfficiencyIndex(timeSeriesData, flowAnalysis) {
    const priceEfficiency = this.calculatePriceEfficiency(timeSeriesData);
    const flowEfficiency = this.calculateFlowEfficiency(flowAnalysis);
    return (priceEfficiency + flowEfficiency) / 2;
  }

  /**
   * Calculate price efficiency
   * @param {Array} timeSeriesData - Time series data
   * @returns {number} Price efficiency score
   */
  calculatePriceEfficiency(timeSeriesData) {
    // Example implementation: Inverse of average volatility across all regions
    const volatilities = timeSeriesData.map(d => d.volatility || 0);
    const avgVolatility = volatilities.length ? this.mean(volatilities) : 0;
    return 1 / (1 + avgVolatility);
  }

  /**
   * Calculate flow efficiency
   * @param {Array} flowAnalysis - Flow analysis data
   * @returns {number} Flow efficiency score
   */
  calculateFlowEfficiency(flowAnalysis) {
    // Example implementation: Average flow count normalized by maxClusterSize
    const totalFlows = flowAnalysis.length;
    const avgFlowCount = totalFlows ? (flowAnalysis.reduce((acc, curr) => acc + curr.flow_count, 0) / totalFlows) : 0;
    return avgFlowCount / this.config.validation.maxClusterSize;
  }

  /**
   * Calculate price variation
   * @param {Array} timeSeriesData - Time series data
   * @returns {number} Price variation score
   */
  calculatePriceVariation(timeSeriesData) {
    const prices = timeSeriesData.map(d => d.avgUsdPrice);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    return maxPrice > 0 ? (maxPrice - minPrice) / maxPrice : 0;
  }

  /**
   * Calculate volatility
   * @param {Array} timeSeriesData - Time series data
   * @returns {number} Volatility score
   */
  calculateVolatility(timeSeriesData) {
    const prices = timeSeriesData.map(d => d.avgUsdPrice);
    const avg = this.mean(prices);
    const variance = this.variance(prices);
    return avg > 0 ? Math.sqrt(variance) / avg : 0;
  }

  /**
   * Calculate conflict price effect
   * @param {number} price - Average USD price
   * @param {number} conflictIntensity - Conflict intensity score
   * @returns {number} Price effect due to conflict
   */
  calculateConflictPriceEffect(price, conflictIntensity) {
    // Example calculation: Linear impact
    return price * conflictIntensity;
  }

  /**
   * Calculate flow disruption
   * @param {Object} flow - Flow analysis data
   * @param {Array} timeSeriesData - Time series data
   * @returns {number} Flow disruption score
   */
  calculateFlowDisruption(flow, timeSeriesData) {
    // Example calculation: Based on flow count and conflict intensity
    const conflictEntrySource = timeSeriesData.find(d => d.region === flow.source);
    const conflictEntryTarget = timeSeriesData.find(d => d.region === flow.target);
    const conflictIntensity = (conflictEntrySource?.conflict_intensity || 0 + conflictEntryTarget?.conflict_intensity || 0) / 2;

    const disruptionFactor = flow.flow_count * flow.avg_flow * conflictIntensity;
    return disruptionFactor;
  }

  /**
   * Calculate spillover effects within market clusters
   * @param {Object} data - Processed data components
   * @returns {Array} Spillover effects data
   */
  analyzeSpilloverEffects(data) {
    const { marketClusters, flowAnalysis } = data;

    return marketClusters.map(cluster => {
      const disruptions = flowAnalysis.filter(flow =>
        cluster.connected_markets.includes(flow.source) &&
        cluster.connected_markets.includes(flow.target)
      );

      const totalDisruption = disruptions.reduce((acc, curr) => acc + curr.disruption, 0);
      const avgDisruption = disruptions.length ? totalDisruption / disruptions.length : 0;

      return {
        clusterId: cluster.cluster_id,
        totalDisruption,
        avgDisruption
      };
    });
  }

  /**
   * Calculate market resilience
   * @param {Object} data - Processed data components
   * @returns {Object} Resilience metrics
   */
  calculateMarketResilience(data) {
    const { timeSeriesData, marketDisruptions } = data;

    // Example implementation: Inverse of average disruption
    const totalDisruption = marketDisruptions.reduce((acc, curr) => acc + curr.disruption, 0);
    const avgDisruption = marketDisruptions.length ? totalDisruption / marketDisruptions.length : 0;
    const overallResilience = 1 / (1 + avgDisruption);

    return {
      overallResilience
    };
  }

  /**
   * Calculate overall market performance
   * @param {number} efficiencyIndex - Efficiency index
   * @param {number} integrationIndex - Integration index
   * @param {number} stabilityIndex - Stability index
   * @param {number} resilienceIndex - Resilience index
   * @returns {number} Overall market performance score
   */
  calculateOverallPerformance(efficiencyIndex, integrationIndex, stabilityIndex, resilienceIndex) {
    // Example calculation: Weighted sum
    const weightEfficiency = 0.3;
    const weightIntegration = 0.3;
    const weightStability = 0.2;
    const weightResilience = 0.2;

    return (
      (efficiencyIndex * weightEfficiency) +
      (integrationIndex * weightIntegration) +
      (stabilityIndex * weightStability) +
      (resilienceIndex * weightResilience)
    );
  }

  /**
   * Calculate price discovery index
   * @param {Array} timeSeriesData - Time series data
   * @returns {number} Price discovery index
   */
  calculatePriceDiscoveryIndex(timeSeriesData) {
    // Example implementation: Correlation between price and flow
    const prices = timeSeriesData.map(d => d.avgUsdPrice);
    const flows = timeSeriesData.map(d => d.volatility); // Assuming volatility correlates with flow

    if (prices.length !== flows.length || prices.length === 0) return 0;

    return this.pearsonCorrelation(prices, flows);
  }

  /**
   * Calculate market access index
   * @param {Array} flowAnalysis - Flow analysis data
   * @returns {number} Market access index
   */
  calculateMarketAccessIndex(flowAnalysis) {
    // Example implementation: Average flow count normalized by maxClusterSize
    const totalFlows = flowAnalysis.length;
    const avgFlowCount = totalFlows ? (flowAnalysis.reduce((acc, curr) => acc + curr.flow_count, 0) / totalFlows) : 0;
    return avgFlowCount / this.config.validation.maxClusterSize;
  }

  /**
   * Calculate competitiveness index
   * @param {Array} marketClusters - Market clusters data
   * @returns {number} Competitiveness index
   */
  calculateCompetitivenessIndex(marketClusters) {
    // Example implementation: Number of clusters normalized
    const numClusters = marketClusters.length;
    return numClusters / 10; // Example scaling factor
  }

  /**
   * Pearson correlation coefficient calculation
   * @param {Array} x - First dataset
   * @param {Array} y - Second dataset
   * @returns {number} Pearson correlation coefficient
   */
  pearsonCorrelation(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Datasets must have the same length');

    const meanX = this.mean(x);
    const meanY = this.mean(y);

    const covariance = this.sum(x.map((xi, i) => (xi - meanX) * (y[i] - meanY))) / (n - 1);
    const stdX = Math.sqrt(this.variance(x));
    const stdY = Math.sqrt(this.variance(y));

    if (stdX === 0 || stdY === 0) return 0;

    return covariance / (stdX * stdY);
  }

  /**
   * Calculate mean of an array
   * @param {Array} values - Array of numbers
   * @returns {number} Mean value
   */
  mean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate variance of an array
   * @param {Array} values - Array of numbers
   * @returns {number} Variance
   */
  variance(values) {
    const avg = this.mean(values);
    return this.mean(values.map(x => Math.pow(x - avg, 2)));
  }

  /**
   * Calculate sum of an array
   * @param {Array} values - Array of numbers
   * @returns {number} Sum
   */
  sum(values) {
    return values.reduce((a, b) => a + b, 0);
  }

  /**
   * Calculate cluster efficiency metrics
   * @param {Object} cluster - Market cluster data
   * @param {Array} marketData - Market data for efficiency calculations
   * @returns {Object} Efficiency metrics
   */
  calculateClusterEfficiency(cluster, marketData = []) {
    try {
      if (!cluster || !cluster.connected_markets || cluster.connected_markets.length < 2) {
        return {
          internal_connectivity: 0,
          market_coverage: 0,
          price_convergence: 0,
          stability: 0,
          efficiency_score: 0
        };
      }

      // Calculate internal connectivity
      const internalConnectivity = this.calculateInternalConnectivity(cluster.connected_markets, marketData);

      // Calculate market coverage
      const marketCoverage = cluster.market_count / cluster.connected_markets.length;

      // Calculate price convergence
      const priceConvergence = this.calculatePriceConvergence(cluster.connected_markets, marketData);

      // Calculate stability
      const stability = this.calculateClusterStability(cluster.connected_markets, marketData);

      // Calculate overall efficiency score
      const efficiencyScore = (
        (internalConnectivity * 0.3) +
        (marketCoverage * 0.2) +
        (priceConvergence * 0.3) +
        (stability * 0.2)
      );

      return {
        internal_connectivity: internalConnectivity,
        market_coverage: marketCoverage,
        price_convergence: priceConvergence,
        stability: stability,
        efficiency_score: efficiencyScore
      };

    } catch (error) {
      this.monitor.error('Error calculating cluster efficiency:', error);
      return {
        internal_connectivity: 0,
        market_coverage: 0,
        price_convergence: 0,
        stability: 0,
        efficiency_score: 0
      };
    }
  }

  /**
   * Calculate internal connectivity of markets within a cluster
   * @param {Array} markets - Connected markets in the cluster
   * @param {Array} marketData - Market flow data
   * @returns {number} Internal connectivity score
   */
  calculateInternalConnectivity(markets, marketData) {
    try {
      if (!markets || !marketData || markets.length < 2) return 0;

      // Count actual connections between markets in the cluster
      const actualConnections = marketData.filter(flow =>
        markets.includes(flow.source) && markets.includes(flow.target)
      ).length;

      // Calculate maximum possible connections
      const maxPossibleConnections = (markets.length * (markets.length - 1)) / 2;

      return maxPossibleConnections > 0 ?
        actualConnections / maxPossibleConnections : 0;

    } catch (error) {
      this.monitor.error('Error calculating internal connectivity:', error);
      return 0;
    }
  }

  /**
   * Calculate price convergence within a cluster
   * @param {Array} markets - Connected markets in the cluster
   * @param {Array} marketData - Market price data
   * @returns {number} Price convergence score
   */
  calculatePriceConvergence(markets, marketData) {
    try {
      if (!markets || !marketData || markets.length < 2) return 0;

      // Get price data for markets in the cluster
      const marketPrices = markets.map(market => {
        const data = marketData.find(d => d.market === market);
        return data ? data.price : null;
      }).filter(price => price !== null);

      if (marketPrices.length < 2) return 0;

      // Calculate coefficient of variation (CV)
      const mean = this.mean(marketPrices);
      const variance = this.variance(marketPrices);
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 0;

      // Convert to convergence score (inverse of CV, normalized to 0-1)
      return Math.max(0, Math.min(1, 1 - cv));

    } catch (error) {
      this.monitor.error('Error calculating price convergence:', error);
      return 0;
    }
  }

  /**
   * Calculate stability metrics for a cluster
   * @param {Array} markets - Connected markets in the cluster
   * @param {Array} marketData - Market time series data
   * @returns {number} Stability score
   */
  calculateClusterStability(markets, marketData) {
    try {
      if (!markets || !marketData || markets.length < 2) return 0;

      // Calculate average price volatility for each market
      const volatilities = markets.map(market => {
        const data = marketData.filter(d => d.market === market);
        if (data.length < 2) return null;

        // Calculate price changes
        const priceChanges = data.slice(1).map((d, i) =>
          Math.abs(d.price - data[i].price) / data[i].price
        );

        // Return average volatility
        return priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
      }).filter(v => v !== null);

      if (volatilities.length === 0) return 0;

      // Calculate average volatility across markets
      const avgVolatility = this.mean(volatilities);

      // Convert to stability score (inverse of volatility, normalized to 0-1)
      return Math.max(0, Math.min(1, 1 - avgVolatility));

    } catch (error) {
      this.monitor.error('Error calculating cluster stability:', error);
      return 0;
    }
  }

  /**
   * Generate analysis results by aggregating various analyses
   * @param {Object} rawData - Raw spatial data
   * @param {Object} options - Processing options
   * @returns {Object} Analysis results
   */
  async generateAnalysisResults(rawData, options = {}) {
    // Example implementation: Combine different analysis outputs
    const spatialData = await this.processSpatialData(rawData, options);
    const compositeIndices = await this.calculateCompositeIndices(spatialData.derivedMetrics);

    return {
      compositeIndices
      // Add more analysis results as needed
    };
  }

  /**
   * Destroy the spatial system instance
   */
  destroy() {
    this._isInitialized = false;
    // Implement additional cleanup if necessary
  }
}

// Export singleton instance
export const spatialSystem = new SpatialSystem();