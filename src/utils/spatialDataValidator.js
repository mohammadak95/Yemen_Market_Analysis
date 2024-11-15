// src/utils/spatialDataValidator.js

import { backgroundMonitor } from './backgroundMonitor';
import _ from 'lodash';

export class SpatialDataValidator {
  constructor() {
    this.monitor = backgroundMonitor;

    this.thresholds = {
      minTimeSeriesLength: 12,
      maxClusterSize: 20,
      minClusterSize: 2,
      flowThreshold: 0.1,
      pValueThreshold: 0.05,
      priceStabilityThreshold: 0.5,
      minCoverage: 0.8,
      maxResidual: 3.0,
      minMarketConnections: 3
    };

    this.requiredFields = {
      root: [
        'time_series_data',
        'market_clusters',
        'flow_analysis',
        'spatial_autocorrelation',
        'metadata'
      ],
      timeSeries: [
        'month',
        'avgUsdPrice',
        'volatility',
        'conflict_intensity',
        'price_stability',
        'sampleSize'
      ],
      clusters: [
        'cluster_id',
        'main_market',
        'connected_markets',
        'market_count'
      ],
      flows: [
        'source',
        'target',
        'total_flow',
        'avg_flow',
        'flow_count',
        'avg_price_differential'
      ],
      spatialMetrics: [
        'global',
        'local',
        'hotspots'
      ]
    };
  }

  validateData(data) {
    const metric = this.monitor.startMetric('validate-spatial-data');
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {
        timeSeriesCount: 0,
        clusterCount: 0,
        flowCount: 0,
        marketCount: 0,
        coverage: null,
        qualityMetrics: {}
      }
    };

    try {
      // Structure validation
      this.validateStructure(data, validationResults);

      if (validationResults.isValid) {
        // Content validation
        this.validateContent(data, validationResults);

        // Relationship validation
        this.validateRelationships(data, validationResults);

        // Calculate quality metrics
        this.calculateQualityMetrics(data, validationResults);
      }

      metric.finish({
        status: validationResults.isValid ? 'success' : 'warning',
        errorCount: validationResults.errors.length,
        warningCount: validationResults.warnings.length
      });

      return validationResults;

    } catch (error) {
      metric.finish({
        status: 'error',
        error: error.message
      });

      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        details: {}
      };
    }
  }

  validateStructure(data, results) {
    // Root level validation
    this.requiredFields.root.forEach(field => {
      if (!data[field]) {
        results.errors.push(`Missing required field: ${field}`);
        results.isValid = false;
      }
    });

    if (!results.isValid) return;

    // Time series structure
    if (Array.isArray(data.time_series_data)) {
      const sampleEntry = data.time_series_data[0];
      this.requiredFields.timeSeries.forEach(field => {
        if (!sampleEntry || !(field in sampleEntry)) {
          results.errors.push(`Missing required time series field: ${field}`);
          results.isValid = false;
        }
      });
    } else {
      results.errors.push('time_series_data must be an array');
      results.isValid = false;
    }

    // Cluster structure
    if (Array.isArray(data.market_clusters)) {
      const sampleCluster = data.market_clusters[0];
      this.requiredFields.clusters.forEach(field => {
        if (!sampleCluster || !(field in sampleCluster)) {
          results.errors.push(`Missing required cluster field: ${field}`);
          results.isValid = false;
        }
      });
    } else {
      results.errors.push('market_clusters must be an array');
      results.isValid = false;
    }

    // Flow structure
    if (Array.isArray(data.flow_analysis)) {
      const sampleFlow = data.flow_analysis[0];
      this.requiredFields.flows.forEach(field => {
        if (!sampleFlow || !(field in sampleFlow)) {
          results.errors.push(`Missing required flow field: ${field}`);
          results.isValid = false;
        }
      });
    } else {
      results.errors.push('flow_analysis must be an array');
      results.isValid = false;
    }

    // Spatial metrics structure
    this.requiredFields.spatialMetrics.forEach(field => {
      if (!data.spatial_autocorrelation?.[field]) {
        results.errors.push(`Missing required spatial metric: ${field}`);
        results.isValid = false;
      }
    });
  }

  validateContent(data, results) {
    // Validate time series content
    this.validateTimeSeriesContent(data.time_series_data, results);

    // Validate cluster content
    this.validateClusterContent(data.market_clusters, results);

    // Validate flow content
    this.validateFlowContent(data.flow_analysis, results);

    // Validate spatial metrics content
    this.validateSpatialMetricsContent(data.spatial_autocorrelation, results);
  }

  validateTimeSeriesContent(timeSeriesData, results) {
    // Check time series length
    if (timeSeriesData.length < this.thresholds.minTimeSeriesLength) {
      results.warnings.push(
        `Time series data length (${timeSeriesData.length}) is below recommended minimum (${this.thresholds.minTimeSeriesLength})`
      );
    }

    // Check for temporal gaps
    const sortedDates = timeSeriesData
      .map(entry => new Date(entry.month))
      .sort((a, b) => a - b);

    for (let i = 1; i < sortedDates.length; i++) {
      const monthDiff = (sortedDates[i].getFullYear() - sortedDates[i-1].getFullYear()) * 12 +
                       (sortedDates[i].getMonth() - sortedDates[i-1].getMonth());
      if (monthDiff > 1) {
        results.warnings.push(
          `Gap detected in time series data between ${sortedDates[i-1].toISOString().slice(0,7)} and ${sortedDates[i].toISOString().slice(0,7)}`
        );
      }
    }

    // Check for price stability
    const lowStabilityMonths = timeSeriesData.filter(
      entry => entry.price_stability < this.thresholds.priceStabilityThreshold
    );

    if (lowStabilityMonths.length > 0) {
      results.warnings.push(
        `${lowStabilityMonths.length} months show low price stability (< ${this.thresholds.priceStabilityThreshold})`
      );
    }
  }

  validateClusterContent(clusters, results) {
    clusters.forEach(cluster => {
      const size = cluster.connected_markets.length + 1; // Including main market

      if (size > this.thresholds.maxClusterSize) {
        results.warnings.push(
          `Cluster ${cluster.cluster_id} exceeds maximum recommended size (${size} > ${this.thresholds.maxClusterSize})`
        );
      }

      if (size < this.thresholds.minClusterSize) {
        results.warnings.push(
          `Cluster ${cluster.cluster_id} is below minimum recommended size (${size} < ${this.thresholds.minClusterSize})`
        );
      }

      if (cluster.connected_markets.length < this.thresholds.minMarketConnections) {
        results.warnings.push(
          `Cluster ${cluster.cluster_id} has insufficient market connections (${cluster.connected_markets.length} < ${this.thresholds.minMarketConnections})`
        );
      }
    });
  }

  validateFlowContent(flows, results) {
    // Check for weak flows
    const weakFlows = flows.filter(flow =>
      flow.avg_flow < this.thresholds.flowThreshold
    );

    if (weakFlows.length > 0) {
      results.warnings.push(
        `${weakFlows.length} flows have weak connections (avg_flow < ${this.thresholds.flowThreshold})`
      );
    }

    // Check for unidirectional flows
    const flowPairs = new Map();
    flows.forEach(flow => {
      const key = [flow.source, flow.target].sort().join('-');
      if (!flowPairs.has(key)) {
        flowPairs.set(key, new Set());
      }
      flowPairs.get(key).add(`${flow.source}-${flow.target}`);
    });

    const unidirectionalFlows = [...flowPairs.entries()]
      .filter(([_, directions]) => directions.size === 1)
      .map(([pair]) => pair);

    if (unidirectionalFlows.length > 0) {
      results.warnings.push(
        `${unidirectionalFlows.length} unidirectional flows detected`
      );
    }
  }

  validateSpatialMetricsContent(spatialMetrics, results) {
    // Check global statistics significance
    if (spatialMetrics.global.p_value > this.thresholds.pValueThreshold) {
      results.warnings.push(
        `Global spatial autocorrelation is not significant (p-value: ${spatialMetrics.global.p_value})`
      );
    }

    // Check local statistics
    const significantLocal = Object.entries(spatialMetrics.local)
      .filter(([_, stats]) => stats.p_value <= this.thresholds.pValueThreshold);

    if (significantLocal.length === 0) {
      results.warnings.push('No significant local spatial autocorrelation detected');
    }

    // Check hotspots
    const significantHotspots = Object.entries(spatialMetrics.hotspots)
      .filter(([_, stats]) => stats.p_value <= this.thresholds.pValueThreshold);

    results.details.qualityMetrics.significantHotspots = significantHotspots.length;
  }

  validateRelationships(data, results) {
    // Get sets of markets from different components
    const timeSeriesMarkets = new Set(data.time_series_data.map(d => d.region));
    const clusterMarkets = new Set();
    data.market_clusters.forEach(cluster => {
      clusterMarkets.add(cluster.main_market);
      cluster.connected_markets.forEach(m => clusterMarkets.add(m));
    });
    const flowMarkets = new Set([
      ...data.flow_analysis.map(f => f.source),
      ...data.flow_analysis.map(f => f.target)
    ]);
    const spatialMarkets = new Set(Object.keys(data.spatial_autocorrelation.local));

    // Get all unique markets
    const allMarkets = new Set([
      ...timeSeriesMarkets,
      ...clusterMarkets,
      ...flowMarkets,
      ...spatialMarkets
    ]);

    results.details.marketCount = allMarkets.size;

    // Calculate coverage
    results.details.coverage = {
      timeSeries: timeSeriesMarkets.size / allMarkets.size,
      flows: flowMarkets.size / allMarkets.size,
      clusters: clusterMarkets.size / allMarkets.size,
      spatial: spatialMarkets.size / allMarkets.size
    };

    // Check coverage thresholds
    Object.entries(results.details.coverage).forEach(([type, coverage]) => {
      if (coverage < this.thresholds.minCoverage) {
        results.warnings.push(
          `Low ${type} coverage: ${(coverage * 100).toFixed(1)}% (threshold: ${this.thresholds.minCoverage * 100}%)`
        );
      }
    });

    // Check for mismatches
    allMarkets.forEach(market => {
      if (!timeSeriesMarkets.has(market)) {
        results.warnings.push(`Market ${market} missing from time series data`);
      }
      if (!flowMarkets.has(market)) {
        results.warnings.push(`Market ${market} missing from flows`);
      }
      if (!clusterMarkets.has(market)) {
        results.warnings.push(`Market ${market} missing from clusters`);
      }
      if (!spatialMarkets.has(market)) {
        results.warnings.push(`Market ${market} missing from spatial analysis`);
      }
    });
  }

  calculateQualityMetrics(data, results) {
    results.details.qualityMetrics = {
      timeSeriesCoverage: data.time_series_data.length / this.thresholds.minTimeSeriesLength,
      averageClusterSize: data.market_clusters.reduce((acc, cluster) =>
        acc + cluster.market_count, 0) / data.market_clusters.length,
      flowDensity: data.flow_analysis.length /
        (results.details.marketCount * (results.details.marketCount - 1)),
      spatialSignificance: data.spatial_autocorrelation.global.significance ? 1 : 0,
      dataCompleteness: 1 - (results.warnings.length /
        (results.details.marketCount * Object.keys(this.requiredFields).length))
    };

    // Calculate overall quality score
    results.details.qualityMetrics.overallQuality = Object.values(
      results.details.qualityMetrics
    ).reduce((acc, val) => acc + val, 0) / 5;
  }
}

export const spatialDataValidator = new SpatialDataValidator();