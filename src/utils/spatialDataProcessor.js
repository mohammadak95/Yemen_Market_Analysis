// src/utils/spatialDataProcessor.js

import _ from 'lodash';
import Papa from 'papaparse';
import { backgroundMonitor } from './backgroundMonitor';
import { spatialDebugUtils } from './spatialDebugUtils';

export class SpatialDataProcessor {
  constructor() {
    this.monitor = backgroundMonitor;
    
    this.validationRules = {
      required: [
        'time_series_data',
        'market_clusters',
        'flow_analysis',
        'spatial_autocorrelation'
      ],
      requiredTimeSeriesFields: [
        'month',
        'avgUsdPrice',
        'volatility',
        'conflict_intensity',
        'price_stability'
      ],
      requiredClusterFields: [
        'cluster_id',
        'main_market',
        'connected_markets',
        'market_count'
      ],
      requiredSpatialFields: [
        'global',
        'local',
        'hotspots'
      ]
    };
  }

  async processSpatialData(rawData, options = {}) {
    const metric = this.monitor.startMetric('process-spatial-data');
    const {
      temporalResolution = 'month',
      aggregationType = 'mean',
      minFlowWeight = 0.1
    } = options;
    
    try {
      if (!rawData) {
        throw new Error('No data provided for processing');
      }

      // Validate required fields
      this.validateRequiredFields(rawData);

      // Process core components
      const timeSeriesData = this.processTimeSeriesData(
        rawData.time_series_data,
        { temporalResolution, aggregationType }
      );

      const marketClusters = this.processMarketClusters(
        rawData.market_clusters
      );

      const flowAnalysis = this.processFlowAnalysis(
        rawData.flow_analysis,
        { minFlowWeight }
      );

      const spatialMetrics = this.processSpatialMetrics(
        rawData.spatial_autocorrelation
      );

      // Process additional components
      const marketIntegration = this.processMarketIntegration(
        rawData.market_integration
      );

      const seasonalAnalysis = this.processSeasonalAnalysis(
        rawData.seasonal_analysis
      );

      // Calculate derived metrics
      const derivedMetrics = this.calculateDerivedMetrics({
        timeSeriesData,
        marketClusters,
        flowAnalysis,
        spatialMetrics
      });

      const processedData = {
        timeSeriesData,
        marketClusters,
        flowAnalysis,
        spatialMetrics,
        marketIntegration,
        seasonalAnalysis,
        derivedMetrics,
        metadata: {
          ...rawData.metadata,
          processedAt: new Date().toISOString()
        }
      };

      // Final validation
      this.validateProcessedData(processedData);

      metric.finish({ 
        status: 'success',
        recordCount: timeSeriesData.length
      });

      return processedData;

    } catch (error) {
      metric.finish({ 
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  processTimeSeriesData(data, options) {
    const { temporalResolution, aggregationType } = options;

    // Group data by time period
    const groupedData = _.groupBy(data, entry => 
      this.getTimePeriod(entry.date, temporalResolution)
    );

    // Process each group
    return Object.entries(groupedData).map(([period, entries]) => {
      const aggregatedValues = this.aggregateValues(entries, aggregationType);
      const statistics = this.calculateStatistics(entries);

      return {
        period,
        ...aggregatedValues,
        ...statistics,
        sampleSize: entries.length
      };
    }).sort((a, b) => new Date(a.period) - new Date(b.period));
  }

  processMarketClusters(clusters) {
    if (!Array.isArray(clusters)) {
      throw new Error('Market clusters must be an array');
    }

    return clusters.map(cluster => {
      // Validate required fields
      this.validationRules.requiredClusterFields.forEach(field => {
        if (!(field in cluster)) {
          throw new Error(`Missing required cluster field: ${field}`);
        }
      });

      // Calculate cluster metrics
      const efficiency = this.calculateClusterEfficiency(cluster);
      const connectivity = this.calculateClusterConnectivity(cluster);

      return {
        cluster_id: cluster.cluster_id,
        main_market: this.normalizeRegionName(cluster.main_market),
        connected_markets: cluster.connected_markets.map(market => 
          this.normalizeRegionName(market)
        ),
        market_count: cluster.market_count,
        efficiency,
        connectivity
      };
    });
  }

  processFlowAnalysis(flows, options) {
    const { minFlowWeight } = options;

    if (!Array.isArray(flows)) {
      throw new Error('Flow analysis must be an array');
    }

    // Filter and normalize flows
    const processedFlows = flows
      .filter(flow => flow.avg_flow >= minFlowWeight)
      .map(flow => ({
        source: this.normalizeRegionName(flow.source),
        target: this.normalizeRegionName(flow.target),
        total_flow: this.cleanNumber(flow.total_flow),
        avg_flow: this.cleanNumber(flow.avg_flow),
        flow_count: flow.flow_count,
        avg_price_differential: this.cleanNumber(flow.avg_price_differential)
      }));

    // Calculate flow network metrics
    const networkMetrics = this.calculateFlowNetworkMetrics(processedFlows);

    return {
      flows: processedFlows,
      metrics: networkMetrics
    };
  }

  processSpatialMetrics(metrics) {
    if (!metrics || typeof metrics !== 'object') {
      throw new Error('Invalid spatial metrics format');
    }

    // Validate required sections
    this.validationRules.requiredSpatialFields.forEach(field => {
      if (!(field in metrics)) {
        throw new Error(`Missing required spatial metrics section: ${field}`);
      }
    });

    return {
      global: {
        moran_i: this.cleanNumber(metrics.global?.moran_i),
        p_value: this.cleanNumber(metrics.global?.p_value),
        significance: metrics.global?.significance === 'True'
      },
      local: this.processLocalMetrics(metrics.local),
      hotspots: this.processHotspots(metrics.hotspots)
    };
  }

  processLocalMetrics(local) {
    if (!local || typeof local !== 'object') return {};

    return _.mapValues(local, metrics => ({
      local_i: this.cleanNumber(metrics.local_i),
      p_value: this.cleanNumber(metrics.p_value),
      cluster_type: metrics.cluster_type
    }));
  }

  processHotspots(hotspots) {
    if (!hotspots || typeof hotspots !== 'object') return {};

    return _.mapValues(hotspots, spot => ({
      gi_star: this.cleanNumber(spot.gi_star),
      p_value: this.cleanNumber(spot.p_value),
      intensity: spot.intensity
    }));
  }

  calculateDerivedMetrics(data) {
    return {
      marketIntegration: this.calculateMarketIntegration(data),
      spatialDependence: this.calculateSpatialDependence(data),
      marketEfficiency: this.calculateMarketEfficiency(data),
      conflictImpact: this.calculateConflictImpact(data)
    };
  }

  calculateMarketIntegration({ flowAnalysis, marketClusters }) {
    const totalFlows = flowAnalysis.flows.length;
    const avgFlowWeight = _.meanBy(flowAnalysis.flows, 'avg_flow');
    const clusterCount = marketClusters.length;
    
    return {
      flowDensity: totalFlows / (clusterCount * (clusterCount - 1)),
      avgFlowWeight,
      clusterCount
    };
  }

  calculateSpatialDependence({ spatialMetrics }) {
    const { moran_i, p_value } = spatialMetrics.global;
    
    return {
      moranI: moran_i,
      pValue: p_value,
      isSignificant: p_value < 0.05,
      strength: Math.abs(moran_i)
    };
  }

  calculateMarketEfficiency({ timeSeriesData, flowAnalysis }) {
    const priceVariation = this.calculatePriceVariation(timeSeriesData);
    const flowEfficiency = this.calculateFlowEfficiency(flowAnalysis);
    
    return {
      priceVariation,
      flowEfficiency,
      overallEfficiency: (priceVariation + flowEfficiency) / 2
    };
  }

  calculateConflictImpact({ timeSeriesData }) {
    const conflictCorrelation = this.calculateConflictCorrelation(timeSeriesData);
    const priceVolatility = this.calculatePriceVolatility(timeSeriesData);
    
    return {
      conflictCorrelation,
      priceVolatility,
      impactScore: Math.abs(conflictCorrelation) * priceVolatility
    };
  }

  // Utility functions
  normalizeRegionName(name) {
    if (!name) return '';
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  cleanNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string' && value.toLowerCase() === 'nan') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  getTimePeriod(date, resolution) {
    const d = new Date(date);
    switch (resolution) {
      case 'year':
        return d.getFullYear().toString();
      case 'quarter':
        return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
      case 'month':
      default:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  aggregateValues(entries, type) {
    const values = entries.map(e => e.value).filter(v => !isNaN(v));
    
    switch (type) {
      case 'median':
        return { value: _.sortBy(values)[Math.floor(values.length / 2)] };
      case 'sum':
        return { value: _.sum(values) };
      case 'mean':
      default:
        return { value: _.mean(values) };
    }
  }

  calculateStatistics(entries) {
    const values = entries.map(e => e.value).filter(v => !isNaN(v));
    
    return {
      mean: _.mean(values),
      median: _.sortBy(values)[Math.floor(values.length / 2)],
      stdDev: Math.sqrt(_.meanBy(values, v => Math.pow(v - _.mean(values), 2))),
      min: _.min(values),
      max: _.max(values)
    };
  }

  validateRequiredFields(data) {
    const missingFields = this.validationRules.required.filter(field => {
      return !data[field] || 
        (Array.isArray(data[field]) && data[field].length === 0) ||
        (typeof data[field] === 'object' && Object.keys(data[field]).length === 0);
    });

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  validateProcessedData(data) {
    if (!data.timeSeriesData?.length) {
      throw new Error('Processed data must contain time series data');
    }

    if (!data.marketClusters?.length) {
      throw new Error('Processed data must contain market clusters');
    }

    if (!data.flowAnalysis?.flows?.length) {
      throw new Error('Processed data must contain flow analysis');
    }

    if (!data.spatialMetrics?.global) {
      throw new Error('Processed data must contain spatial metrics');
    }
  }
}

export const spatialDataProcessor = new SpatialDataProcessor();