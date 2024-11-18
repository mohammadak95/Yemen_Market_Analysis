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
        retryDelay: 1000, // in milliseconds
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

      // Add analysis results
      const analysisResults = await this.generateAnalysisResults(rawData);
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
      efficiency: this.calculateClusterEfficiency(cluster)
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
   * @param {Object} localMetrics - Raw local metrics data
   * @returns {Object} Processed local metrics
   */
  processLocalMetrics(localMetrics) {
    // Implement detailed processing of local metrics as needed
    return localMetrics; // Placeholder: return as is
  }

  /**
   * Process hotspots data
   * @param {Object} hotspots - Raw hotspots data
   * @returns {Object} Processed hotspots data
   */
  processHotspots(hotspots) {
    // Implement detailed processing of hotspots as needed
    return hotspots; // Placeholder: return as is
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
   * @param {Object} data - Processed data components
   * @returns {Object} Spatial dependence metrics
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
    const { timeSeriesData, flowAnalysis } = data;

    // Example calculations (implement actual logic as needed)
    const priceEffects = this.analyzePriceTransmission(data);
    const marketDisruptions = this.analyzeConflictImpact(data);

    return {
      priceEffects,
      marketDisruptions
      // Add more detailed metrics as needed
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

    // Calculate coverage ratios
    const totalMarkets = allMarkets.size;
    return {
      timeSeries: marketSets.timeSeries.size / totalMarkets,
      clusters: marketSets.clusters.size / totalMarkets,
      flows: marketSets.flows.size / totalMarkets,
      spatial: marketSets.spatial.size / totalMarkets
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
          if (market1 !== market2) {
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
      const spilloverEffects = marketClusters.map(cluster => ({
        clusterId: cluster.cluster_id,
        markets: cluster.connected_markets,
        spillover: this.calculateSpilloverEffects(
          cluster,
          priceEffects,
          marketDisruptions
        )
      }));

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
   * Calculate price correlation between two markets
   * @param {Array} market1Data - Time series data for market 1
   * @param {Array} market2Data - Time series data for market 2
   * @returns {number} Pearson correlation coefficient
   */
  calculatePriceCorrelation(market1Data, market2Data) {
    // Align data by date
    const market1Prices = market1Data.map(d => d.avgUsdPrice);
    const market2Prices = market2Data.map(d => d.avgUsdPrice);

    // Ensure both markets have the same number of data points
    const minLength = Math.min(market1Prices.length, market2Prices.length);
    const alignedMarket1Prices = market1Prices.slice(-minLength);
    const alignedMarket2Prices = market2Prices.slice(-minLength);

    return this.pearsonCorrelation(alignedMarket1Prices, alignedMarket2Prices);
  }

  /**
   * Calculate speed of price adjustment between markets
   * @param {Object} flow - Flow analysis data
   * @param {Array} timeSeriesData - Time series data
   * @returns {number} Transmission speed
   */
  calculateTransmissionSpeed(flow, timeSeriesData) {
    // Example implementation: Difference in price changes over time
    const sourceData = timeSeriesData.filter(d => d.region === flow.source);
    const targetData = timeSeriesData.filter(d => d.region === flow.target);

    if (sourceData.length < 2 || targetData.length < 2) return 0;

    const sourceChanges = [];
    for (let i = 1; i < sourceData.length; i++) {
      sourceChanges.push(sourceData[i].avgUsdPrice - sourceData[i - 1].avgUsdPrice);
    }

    const targetChanges = [];
    for (let i = 1; i < targetData.length; i++) {
      targetChanges.push(targetData[i].avgUsdPrice - targetData[i - 1].avgUsdPrice);
    }

    // Calculate correlation between source and target price changes as speed indicator
    return this.pearsonCorrelation(sourceChanges, targetChanges);
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
          const correlation = correlations.get(`${market1}-${market2}`) || 0;
          clusterCorrelations.push(correlation);

          const speed = transmissionSpeeds.find(
            s => s.source === market1 && s.target === market2
          );
          if (speed) clusterSpeeds.push(speed.speed);
        }
      }
    }

    const avgCorrelation = this.mean(clusterCorrelations);
    const avgSpeed = this.mean(clusterSpeeds);

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
    // Example implementation: Identify clusters with high transmission speeds
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
    // Example implementation: Identify seasonal trends
    // Placeholder: Implement actual temporal analysis as needed
    return {
      seasonalTrends: 'Not Implemented'
    };
  }

  /**
   * Analyze spatial transmission patterns
   * @param {Array} transmissionSpeeds - Transmission speeds data
   * @param {Array} marketClusters - Market clusters data
   * @returns {Object} Spatial transmission patterns analysis
   */
  analyzeSpatialTransmissionPatterns(transmissionSpeeds, marketClusters) {
    // Placeholder for detailed spatial transmission pattern analysis
    // Implement actual logic as per application requirements
    return {
      patterns: 'Detailed Spatial Transmission Patterns Analysis'
    };
  }

  /**
   * Calculate overall conflict impact
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

    const totalSpillover = spilloverEffects.reduce((acc, curr) => acc + curr.spillover, 0);
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
    // Example implementation: Inverse of price volatility
    const volatility = this.calculateVolatility(timeSeriesData);
    return 1 / (1 + volatility);
  }

  /**
   * Calculate flow efficiency
   * @param {Array} flowAnalysis - Flow analysis data
   * @returns {number} Flow efficiency score
   */
  calculateFlowEfficiency(flowAnalysis) {
    // Example implementation: Average flow count
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
    return (maxPrice - minPrice) / maxPrice;
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
    return Math.sqrt(variance) / avg;
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
    const disruptionFactor = flow.flow_count * flow.avg_flow;
    return disruptionFactor;
  }

  /**
   * Calculate spillover effects
   * @param {Object} cluster - Market cluster data
   * @param {Array} priceEffects - Price effects data
   * @param {Array} marketDisruptions - Market disruptions data
   * @returns {number} Spillover effect score
   */
  calculateSpilloverEffects(cluster, priceEffects, marketDisruptions) {
    // Example implementation: Sum of disruptions within the cluster
    const disruptions = marketDisruptions.filter(d => cluster.connected_markets.includes(d.source) && cluster.connected_markets.includes(d.target));
    const totalDisruption = disruptions.reduce((acc, curr) => acc + curr.disruption, 0);
    return totalDisruption;
  }

  /**
   * Calculate market resilience
   * @param {Array} timeSeriesData - Time series data
   * @param {Array} marketDisruptions - Market disruptions data
   * @returns {Object} Resilience metrics
   */
  calculateMarketResilience(timeSeriesData, marketDisruptions) {
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
    // Placeholder: Implement actual logic as needed
    return 0.75; // Example static value
  }

  /**
   * Calculate market access index
   * @param {Array} flowAnalysis - Flow analysis data
   * @returns {number} Market access index
   */
  calculateMarketAccessIndex(flowAnalysis) {
    // Example implementation: Average flow count
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
    // Example implementation: Number of clusters
    const numClusters = marketClusters.length;
    return numClusters / 10; // Example scaling
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
   * Destroy the spatial system instance
   */
  destroy() {
    this._isInitialized = false;
    // Implement additional cleanup if necessary
  }
}

// Export singleton instance
export const spatialSystem = new SpatialSystem();