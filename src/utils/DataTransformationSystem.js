//src/utils/DataTransformationSystem.js

import _ from 'lodash';
import { monitoringSystem } from './MonitoringSystem';
import { configUtils } from './systemConfig';
import Papa from 'papaparse';

class DataTransformationSystem {
  constructor() {
    // Required fields for different data types
    this.requiredFields = {
      timeSeries: ['month', 'avgUsdPrice', 'volatility', 'conflict_intensity'],
      marketClusters: ['cluster_id', 'main_market', 'connected_markets', 'market_count'],
      flowAnalysis: ['source', 'target', 'total_flow', 'avg_flow'],
      spatialAutocorrelation: ['global', 'local']
    };

    // Memory optimization settings
    this.batchSize = 1000;
    this.streamingThreshold = 10000;
  }

  /**
   * Initialize the DataTransformationSystem
   */
  async initialize() {
    try {
      // Initialize required configurations
      this.isInitialized = true;
      return true;
    } catch (error) {
      monitoringSystem.error('Failed to initialize DataTransformationSystem:', error);
      throw error;
    }
  }

  /**
   * Transform time series data with various aggregation options
   */
  transformTimeSeriesData(data, options = {}) {
    const metric = this.monitor.startMetric('transform-time-series');
    
    try {
      const {
        timeUnit = this.config.aggregation.defaultTimeUnit,
        aggregationType = 'mean',
        includeGarch = true,
        includeConflict = true,
        smoothing = false,
        windowSize = 3
      } = options;

      let transformed = data.map(entry => ({
        date: new Date(entry.month),
        price: entry.avgUsdPrice,
        volatility: entry.volatility,
        ...(includeGarch && { garchVolatility: entry.garch_volatility }),
        ...(includeConflict && { 
          conflictIntensity: entry.conflict_intensity,
          stability: entry.price_stability
        })
      }));

      // Apply smoothing if requested
      if (smoothing) {
        transformed = this.applyMovingAverage(transformed, windowSize);
      }

      // Aggregate by time unit if different from raw data
      if (timeUnit !== 'month') {
        transformed = this.aggregateByTimeUnit(transformed, timeUnit, aggregationType);
      }

      metric.finish({ status: 'success' });
      return transformed;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Transform time series data with streaming support for large datasets
   */
  async transformTimeSeriesStream(data, options = {}) {
    const metric = monitoringSystem.startMetric('transform-time-series');
    
    try {
      const {
        applySeasonalAdj = false,
        applySmooth = false,
        includePriceStability = true,
        includeConflict = true
      } = options;

      // Use streaming for large datasets
      if (data.length > this.streamingThreshold) {
        return await this.processDataInBatches(data, (batch) =>
          this.transformTimeSeriesBatch(batch, options)
        );
      }

      // Process smaller datasets directly
      const transformed = data.map(entry => ({
        date: new Date(entry.month),
        month: entry.month,
        avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
        volatility: this.cleanNumber(entry.volatility),
        garchVolatility: entry.garch_volatility,
        ...(includePriceStability && {
          priceStability: this.cleanNumber(entry.price_stability)
        }),
        ...(includeConflict && {
          conflictIntensity: this.cleanNumber(entry.conflict_intensity)
        }),
        sampleSize: entry.sampleSize || 1
      }));

      // Apply optional transformations
      let result = transformed;
      if (applySeasonalAdj) {
        result = this.applySeasonalAdjustment(result);
      }
      if (applySmooth) {
        result = this.applySmoothing(result);
      }

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Transform spatial data for visualization
   */
  transformSpatialData(data, options = {}) {
    const metric = this.monitor.startMetric('transform-spatial');
    
    try {
      const {
        includeGeometry = true,
        simplifyGeometry = false,
        toleranceLevel = 0.01
      } = options;

      const transformed = data.features.map(feature => {
        const properties = this.transformProperties(feature.properties);
        
        return {
          type: 'Feature',
          properties,
          ...(includeGeometry && {
            geometry: simplifyGeometry ? 
              this.simplifyGeometry(feature.geometry, toleranceLevel) : 
              feature.geometry
          })
        };
      });

      metric.finish({ status: 'success' });
      return transformed;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Transform flow data for network visualization
   */
  transformFlowData(flows, options = {}) {
    const {
      minFlowWeight = 0,
      maxFlows = Infinity,
      includeCoordinates = true
    } = options;

    const filteredFlows = flows
      .filter(flow => flow.total_flow >= minFlowWeight)
      .sort((a, b) => b.total_flow - a.total_flow)
      .slice(0, maxFlows);

    const nodes = new Set();
    filteredFlows.forEach(flow => {
      nodes.add(flow.source);
      nodes.add(flow.target);
    });

    return {
      nodes: Array.from(nodes).map(id => ({
        id,
        ...(includeCoordinates && {
          coordinates: this.getNodeCoordinates(id, flows)
        })
      })),
      links: filteredFlows.map(flow => ({
        source: flow.source,
        target: flow.target,
        weight: flow.total_flow,
        value: flow.avg_flow,
        count: flow.flow_count
      }))
    };
  }

  /**
   * Apply moving average smoothing
   */
  applyMovingAverage(data, window) {
    return data.map((entry, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(data.length, index + Math.floor(window / 2) + 1);
      const windowData = data.slice(start, end);
      
      return {
        ...entry,
        price: this.calculateWindowAverage(windowData, 'price'),
        volatility: this.calculateWindowAverage(windowData, 'volatility'),
        ...(entry.garchVolatility && {
          garchVolatility: this.calculateWindowAverage(windowData, 'garchVolatility')
        })
      };
    });
  }

  /**
   * Aggregate data by time unit
   */
  aggregateByTimeUnit(data, timeUnit, aggregationType = 'mean') {
    const groupedData = _.groupBy(data, entry => 
      this.getTimePeriod(entry.date, timeUnit)
    );

    return Object.entries(groupedData).map(([period, entries]) => ({
      date: new Date(period),
      price: this.aggregateValues(entries, 'price', aggregationType),
      volatility: this.aggregateValues(entries, 'volatility', aggregationType),
      ...(entries[0].garchVolatility && {
        garchVolatility: this.aggregateValues(entries, 'garchVolatility', aggregationType)
      }),
      ...(entries[0].conflictIntensity && {
        conflictIntensity: this.aggregateValues(entries, 'conflictIntensity', aggregationType),
        stability: this.aggregateValues(entries, 'stability', aggregationType)
      })
    })).sort((a, b) => a.date - b.date);
  }

  /**
   * Get time period for aggregation
   */
  getTimePeriod(date, unit) {
    const d = new Date(date);
    switch (unit) {
      case 'year':
        return `${d.getFullYear()}`;
      case 'quarter':
        return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'week':
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return startOfWeek.toISOString().slice(0, 10);
      case 'day':
      default:
        return d.toISOString().slice(0, 10);
    }
  }

  /**
   * Aggregate values using specified method
   */
  aggregateValues(entries, field, type) {
    const values = entries.map(e => e[field]).filter(v => !isNaN(v));
    
    switch (type) {
      case 'median':
        return _.sortBy(values)[Math.floor(values.length / 2)];
      case 'sum':
        return _.sum(values);
      case 'mean':
      default:
        return _.mean(values);
    }
  }

  /**
   * Calculate window average for smoothing
   */
  calculateWindowAverage(windowData, field) {
    return _.meanBy(windowData, field);
  }

  /**
   * Transform feature properties
   */
  transformProperties(properties) {
    return {
      id: properties.id || properties.region_id,
      name: properties.name || properties.region,
      value: properties.value || properties.avgUsdPrice,
      ...properties
    };
  }

  /**
   * Simplify geometry (placeholder - implement actual simplification if needed)
   */
  simplifyGeometry(geometry, tolerance) {
    // Implement geometry simplification if needed
    return geometry;
  }

  /**
   * Get node coordinates for flow visualization
   */
  getNodeCoordinates(nodeId, flows) {
    const nodeFlow = flows.find(f => f.source === nodeId || f.target === nodeId);
    return nodeFlow?.source === nodeId ? 
      nodeFlow.source_coordinates : 
      nodeFlow.target_coordinates;
  }

  /**
   * Main transformation pipeline for integrating all data sources
   */
  async transformIntegratedData(data, options = {}) {
    const metric = this.monitor.startMetric('transform-integrated-data');
    try {
      const {
        timeVaryingFlows,
        tvMiiResults,
        priceDifferentials,
        ecmNorthSouth,
        ecmSouthNorth,
        spatialResults,
        preprocessedData
      } = data;

      // Process core time series data
      const timeSeriesData = this.processTimeSeriesData(timeVaryingFlows, options);

      // Process market integration metrics
      const marketIntegration = this.processMarketIntegration(
        tvMiiResults,
        preprocessedData?.market_integration
      );

      // Process price transmissions
      const priceTransmission = this.processPriceTransmission({
        priceDifferentials,
        ecmNorthSouth,
        ecmSouthNorth
      });

      // Process spatial patterns
      const spatialPatterns = this.processSpatialPatterns(
        spatialResults,
        preprocessedData?.spatial_autocorrelation
      );

      // Calculate market clusters
      const marketClusters = this.processMarketClusters(
        preprocessedData?.market_clusters,
        timeVaryingFlows
      );

      // Process detected shocks
      const shocks = this.processMarketShocks(
        preprocessedData?.market_shocks,
        timeSeriesData
      );

      const result = {
        timeSeriesData,
        marketIntegration,
        priceTransmission,
        spatialPatterns,
        marketClusters,
        shocks,
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
   * Process time series data with enhanced metrics
   */
  processTimeSeriesData(flows, options = {}) {
    const {
      timeUnit = 'month',
      aggregationType = 'mean',
      includeGarch = true,
      includeConflict = true
    } = options;

    // Group flows by date and calculate metrics
    const groupedData = _.groupBy(flows, flow => 
      new Date(flow.date).toISOString().slice(0, 7)
    );

    return Object.entries(groupedData).map(([month, monthFlows]) => {
      const prices = monthFlows.map(f => f.price).filter(p => !isNaN(p));
      const conflicts = monthFlows.map(f => f.conflict_intensity).filter(c => !isNaN(c));

      return {
        month,
        avgUsdPrice: _.mean(prices),
        volatility: this.calculateVolatility(prices),
        ...(includeGarch && { garchVolatility: this.estimateGarchVolatility(prices) }),
        ...(includeConflict && {
          conflictIntensity: _.mean(conflicts),
          stability: this.calculateStability(prices, conflicts)
        }),
        sampleSize: monthFlows.length,
      };
    }).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Process market integration metrics combining TV-MII and preprocessed data
   */
  processMarketIntegration(tvMiiResults, preprocessedIntegration) {
    // Process TV-MII results by market pair
    const marketPairResults = _.groupBy(tvMiiResults, 'market_pair');
    
    const integrationMetrics = Object.entries(marketPairResults).map(([pair, results]) => {
      const timeSeriesMetrics = results.map(r => ({
        date: r.date,
        tvmii: r.tv_mii,
        significance: r.p_value < 0.05
      }));

      return {
        marketPair: pair,
        timeSeriesMetrics,
        summary: {
          averageIntegration: _.meanBy(results, 'tv_mii'),
          significantPeriods: results.filter(r => r.p_value < 0.05).length,
          totalPeriods: results.length
        }
      };
    });

    return {
      marketPairMetrics: integrationMetrics,
      globalMetrics: preprocessedIntegration || {},
      summary: this.calculateIntegrationSummary(integrationMetrics)
    };
  }

  /**
   * Process price transmission metrics combining ECM and price differential data
   */
  processPriceTransmission({ priceDifferentials, ecmNorthSouth, ecmSouthNorth }) {
    const processedTransmissions = {};

    // Process price differentials by market
    Object.entries(priceDifferentials).forEach(([market, data]) => {
      const marketResults = data.commodity_results;
      Object.entries(marketResults).forEach(([commodity, results]) => {
        if (!processedTransmissions[market]) {
          processedTransmissions[market] = {};
        }
        processedTransmissions[market][commodity] = this.processMarketPairTransmission(
          results,
          ecmNorthSouth,
          ecmSouthNorth
        );
      });
    });

    return processedTransmissions;
  }

  /**
   * Process spatial patterns combining spatial analysis results
   */
  processSpatialPatterns(spatialResults, preprocessedSpatial) {
    return {
      globalAutocorrelation: spatialResults?.global || preprocessedSpatial?.global || {},
      localPatterns: this.processLocalSpatialPatterns(
        spatialResults?.local,
        preprocessedSpatial?.local
      ),
      clusterSignificance: this.processClusterSignificance(
        spatialResults?.clusters,
        preprocessedSpatial?.hotspots
      )
    };
  }

  /**
   * Process market clusters with enhanced metrics
   */
  processMarketClusters(clusters, flows) {
    if (!clusters?.length) return [];

    return clusters.map(cluster => {
      const clusterFlows = flows.filter(flow => 
        cluster.connected_markets.includes(flow.source) &&
        cluster.connected_markets.includes(flow.target)
      );

      return {
        ...cluster,
        metrics: this.calculateClusterMetrics(cluster, clusterFlows)
      };
    });
  }

  /**
   * Process market shocks with enhanced detection
   */
  processMarketShocks(shocks, timeSeriesData) {
    if (!shocks?.length) return [];

    const baselineVolatility = this.calculateBaselineVolatility(timeSeriesData);
    
    return shocks.map(shock => ({
      ...shock,
      metrics: this.calculateShockMetrics(shock, baselineVolatility),
      classification: this.classifyShock(shock, baselineVolatility)
    }));
  }

  // Utility methods moved to separate class to maintain cleanliness
  // Only new utility methods added here

  calculateVolatility(prices) {
    if (!prices.length) return 0;
    const mean = _.mean(prices);
    return Math.sqrt(_.sumBy(prices, p => Math.pow(p - mean, 2)) / prices.length) / mean;
  }

  estimateGarchVolatility(prices) {
    // Implement GARCH estimation if needed
    return null;
  }

  calculateStability(prices, conflicts) {
    if (!prices.length || !conflicts.length) return 0;
    const priceVol = this.calculateVolatility(prices);
    const conflictEffect = _.mean(conflicts) / 10; // Normalize conflict effect
    return Math.max(0, 1 - (priceVol + conflictEffect));
  }

  calculateIntegrationSummary(integrationMetrics) {
    const allTvmii = integrationMetrics.flatMap(m => 
      m.timeSeriesMetrics.map(t => t.tvmii)
    );

    return {
      overallIntegration: _.mean(allTvmii),
      marketPairCount: integrationMetrics.length,
      significantIntegration: integrationMetrics.reduce(
        (acc, m) => acc + m.summary.significantPeriods / m.summary.totalPeriods,
        0
      ) / integrationMetrics.length
    };
  }

  processMarketPairTransmission(results, northSouth, southNorth) {
    // Combine price differential results with ECM results
    const transmission = {
      priceRelationship: this.analyzePriceRelationship(results),
      northSouthTransmission: this.findEcmResults(results, northSouth),
      southNorthTransmission: this.findEcmResults(results, southNorth)
    };

    return {
      ...transmission,
      summary: this.summarizeTransmission(transmission)
    };
  }

  calculateClusterMetrics(cluster, flows) {
    return {
      density: flows.length / (cluster.connected_markets.length * (cluster.connected_markets.length - 1)),
      averageFlow: _.meanBy(flows, 'flow_weight'),
      flowStability: this.calculateFlowStability(flows),
      marketCoverage: cluster.market_count / cluster.connected_markets.length
    };
  }

  /**
   * Process and validate market pairs data
   */
  async validateMarketPairs(data) {
    const metric = monitoringSystem.startMetric('validate-market-pairs');
    
    try {
      const validationResults = {
        isValid: true,
        warnings: [],
        errors: [],
        marketStats: {}
      };

      // Check required fields
      for (const pair of data) {
        const missingFields = this.requiredFields.flowAnalysis
          .filter(field => !(field in pair));
        
        if (missingFields.length > 0) {
          validationResults.errors.push(
            `Missing fields in market pair: ${missingFields.join(', ')}`
          );
          validationResults.isValid = false;
        }
      }

      // Calculate market statistics
      const marketStats = this.calculateMarketStats(data);
      validationResults.marketStats = marketStats;

      // Check for data anomalies
      this.checkMarketPairAnomalies(data, validationResults);

      metric.finish({ status: 'success' });
      return validationResults;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Process market relationships with memory optimization
   */
  async processMarketRelationships(data, options = {}) {
    const metric = monitoringSystem.startMetric('process-market-relationships');
    
    try {
      const {
        timeSeriesData,
        marketClusters,
        flowAnalysis
      } = data;

      // Process in parallel with memory optimization
      const [
        marketPairs,
        clusterRelationships,
        timeSeriesRelationships
      ] = await Promise.all([
        this.processFlowRelationships(flowAnalysis),
        this.processClusterRelationships(marketClusters),
        this.processTimeSeriesRelationships(timeSeriesData)
      ]);

      // Combine results
      const relationships = {
        marketPairs,
        clusterRelationships,
        timeSeriesRelationships,
        summary: this.summarizeRelationships({
          marketPairs,
          clusterRelationships,
          timeSeriesRelationships
        })
      };

      metric.finish({ status: 'success' });
      return relationships;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Optimize memory usage for large datasets
   */
  async optimizeMemoryUsage(data) {
    const metric = monitoringSystem.startMetric('optimize-memory');
    
    try {
      // Clean up unnecessary fields
      const optimized = data.map(entry => {
        const cleaned = {};
        for (const field of this.requiredFields.timeSeries) {
          if (field in entry) {
            cleaned[field] = entry[field];
          }
        }
        return cleaned;
      });

      // Process in batches if needed
      if (optimized.length > this.batchSize) {
        return this.processDataInBatches(optimized);
      }

      return optimized;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Process data in batches for memory optimization
   */
  async processDataInBatches(data, processFn = null) {
    const batches = _.chunk(data, this.batchSize);
    const results = [];

    for (const batch of batches) {
      const processed = processFn ? await processFn(batch) : batch;
      results.push(...processed);
    }

    return results;
  }

  /**
   * Apply seasonal adjustment to time series
   */
  applySeasonalAdjustment(data) {
    const periods = _.groupBy(data, d => new Date(d.date).getMonth());
    const adjustments = {};

    // Calculate seasonal indices
    Object.entries(periods).forEach(([month, values]) => {
      adjustments[month] = _.meanBy(values, 'avgUsdPrice');
    });

    // Apply adjustments
    return data.map(entry => ({
      ...entry,
      avgUsdPrice: entry.avgUsdPrice - 
        (adjustments[new Date(entry.date).getMonth()] || 0)
    }));
  }

  /**
   * Apply smoothing to time series
   */
  applySmoothing(data, windowSize = 3) {
    return data.map((entry, index) => {
      const window = data.slice(
        Math.max(0, index - windowSize),
        Math.min(data.length, index + windowSize + 1)
      );
      
      return {
        ...entry,
        avgUsdPrice: _.meanBy(window, 'avgUsdPrice'),
        volatility: _.meanBy(window, 'volatility')
      };
    });
  }

  /**
   * Process flow relationships
   */
  processFlowRelationships(flows) {
    return _(flows)
      .groupBy('source')
      .mapValues(sourceFlows => ({
        totalFlow: _.sumBy(sourceFlows, 'total_flow'),
        averageFlow: _.meanBy(sourceFlows, 'avg_flow'),
        connections: sourceFlows.map(flow => ({
          target: flow.target,
          flowWeight: flow.avg_flow
        }))
      }))
      .value();
  }

  /**
   * Process cluster relationships
   */
  processClusterRelationships(clusters) {
    return clusters.map(cluster => ({
      clusterId: cluster.cluster_id,
      mainMarket: cluster.main_market,
      connectedMarkets: cluster.connected_markets,
      marketCount: cluster.market_count,
      efficiency: cluster.efficiency || {}
    }));
  }

  /**
   * Process time series relationships
   */
  processTimeSeriesRelationships(timeSeriesData) {
    const groupedByMonth = _.groupBy(timeSeriesData, 'month');
    
    return Object.entries(groupedByMonth)
      .map(([month, entries]) => ({
        month,
        averagePrice: _.meanBy(entries, 'avgUsdPrice'),
        volatility: _.meanBy(entries, 'volatility'),
        sampleSize: entries.length
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }

  /**
   * Calculate market statistics
   */
  calculateMarketStats(data) {
    const markets = new Set([
      ...data.map(d => d.source),
      ...data.map(d => d.target)
    ]);

    return {
      totalMarkets: markets.size,
      totalFlows: data.length,
      averageFlowWeight: _.meanBy(data, 'avg_flow'),
      flowDensity: data.length / (markets.size * (markets.size - 1))
    };
  }

  /**
   * Check for anomalies in market pair data
   */
  checkMarketPairAnomalies(data, results) {
    // Check for self-flows
    const selfFlows = data.filter(d => d.source === d.target);
    if (selfFlows.length > 0) {
      results.warnings.push(
        `Found ${selfFlows.length} self-flows`
      );
    }

    // Check for extreme values
    const avgFlows = data.map(d => d.avg_flow);
    const meanFlow = _.mean(avgFlows);
    const stdFlow = Math.sqrt(_.meanBy(avgFlows, v => Math.pow(v - meanFlow, 2)));
    
    const extremeFlows = data.filter(d => 
      Math.abs(d.avg_flow - meanFlow) > 3 * stdFlow
    );

    if (extremeFlows.length > 0) {
      results.warnings.push(
        `Found ${extremeFlows.length} extreme flow values`
      );
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
   * Summarize relationships
   */
  summarizeRelationships(relationships) {
    return {
      totalMarkets: relationships.marketPairs.length,
      totalClusters: relationships.clusterRelationships.length,
      averageClusterSize: _.meanBy(
        relationships.clusterRelationships,
        'marketCount'
      ),
      timeSeriesCoverage: relationships.timeSeriesRelationships.length
    };
  }
}

// Export singleton instance
export const dataTransformationSystem = new DataTransformationSystem();