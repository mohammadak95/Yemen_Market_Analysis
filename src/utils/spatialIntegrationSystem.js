// src/utils/spatialIntegrationSystem.js

import { precomputedDataManager } from './PrecomputedDataManager';
import { spatialDataProcessor } from './spatialDataProcessor';
import { spatialDataValidator } from './spatialDataValidator';
import { backgroundMonitor } from './backgroundMonitor';
import { spatialDebugUtils } from './spatialDebugUtils';
import _ from 'lodash';

class SpatialIntegrationSystem {
  constructor() {
    this.dataManager = precomputedDataManager;
    this.processor = spatialDataProcessor;
    this.validator = spatialDataValidator;
    this.monitor = backgroundMonitor;
    this._isInitialized = false;
    
    // Initialize performance tracking
    this.performanceStats = {
      loadTimes: [],
      processingTimes: [],
      validationTimes: [],
      integrationTimes: []
    };
  }

  async initialize() {
    if (this._isInitialized) return;

    const metric = this.monitor.startMetric('spatial-integration-init');
    
    try {
      // Ensure PrecomputedDataManager is initialized
      if (!this.dataManager.isInitialized) {
        await this.dataManager.initialize();
      }

      this._isInitialized = true;
      metric.finish({ status: 'success' });
      
      spatialDebugUtils.log('SpatialIntegrationSystem initialized successfully');
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      spatialDebugUtils.error('Failed to initialize SpatialIntegrationSystem:', error);
      throw error;
    }
  }

  async loadAndProcessData(commodity, date, options = {}) {
    const metric = this.monitor.startMetric('spatial-integration-pipeline');
    const perfMonitor = spatialDebugUtils.monitorPerformance('load-and-process');
    
    try {
      // Ensure system is initialized
      if (!this._isInitialized) {
        await this.initialize();
      }

      // Start load time tracking
      const loadStartTime = performance.now();

      // Load raw data through PrecomputedDataManager
      const rawData = await this.dataManager.loadAndProcessData(commodity, date);
      
      this.performanceStats.loadTimes.push(performance.now() - loadStartTime);

      // Process data through SpatialDataProcessor
      const processingStartTime = performance.now();
      const processedData = await this.processor.processSpatialData(rawData.data, {
        ...options,
        applySeasonalAdjustment: options.seasonalAdjustment || false,
        applyConflictAdjustment: options.conflictAdjustment || false
      });
      
      this.performanceStats.processingTimes.push(performance.now() - processingStartTime);

      // Validate through SpatialDataValidator
      const validationStartTime = performance.now();
      const validationResults = await this.validator.validateData(processedData);
      
      this.performanceStats.validationTimes.push(performance.now() - validationStartTime);

      // Calculate integration metrics
      const integrationStartTime = performance.now();
      const integrationMetrics = this.calculateIntegrationMetrics(processedData);
      
      this.performanceStats.integrationTimes.push(performance.now() - integrationStartTime);

      // Compile final results
      const result = {
        data: processedData,
        validation: validationResults,
        metrics: integrationMetrics,
        metadata: {
          commodity,
          date,
          processedAt: new Date().toISOString(),
          status: this.determineDataStatus(validationResults),
          performanceMetrics: this.getPerformanceMetrics(),
          qualityMetrics: validationResults.details.qualityMetrics
        }
      };

      perfMonitor.end();
      metric.finish({ status: 'success' });

      return result;

    } catch (error) {
      perfMonitor.end();
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  determineDataStatus(validationResults) {
    if (!validationResults.isValid) {
      return 'invalid';
    }
    if (validationResults.warnings.length > 0) {
      return 'warning';
    }
    if (validationResults.details.qualityMetrics.overallQuality < 0.7) {
      return 'low_quality';
    }
    return 'good';
  }

  getPerformanceMetrics() {
    return {
      averageLoadTime: _.mean(this.performanceStats.loadTimes),
      averageProcessingTime: _.mean(this.performanceStats.processingTimes),
      averageValidationTime: _.mean(this.performanceStats.validationTimes),
      averageIntegrationTime: _.mean(this.performanceStats.integrationTimes),
      totalOperations: this.performanceStats.loadTimes.length
    };
  }

  // Continuing spatialIntegrationSystem.js

  calculateIntegrationMetrics(data) {
    return {
      marketIntegration: this.calculateMarketIntegration(data),
      spatialDependence: this.calculateSpatialDependence(data),
      marketEfficiency: this.calculateMarketEfficiency(data),
      conflictImpact: this.calculateConflictImpact(data),
      flowDynamics: this.calculateFlowDynamics(data),
      clusterMetrics: this.calculateClusterMetrics(data)
    };
  }

  calculateMarketIntegration(data) {
    const { flowAnalysis, marketClusters, spatialAutocorrelation } = data;
    
    // Calculate basic integration metrics
    const flowMetrics = this.calculateFlowMetrics(flowAnalysis);
    const clusterMetrics = this.calculateBasicClusterMetrics(marketClusters);
    const spatialMetrics = this.calculateSpatialMetrics(spatialAutocorrelation);

    // Calculate composite integration score
    const integrationScore = (
      flowMetrics.normalizedDensity +
      clusterMetrics.normalizedEfficiency +
      spatialMetrics.normalizedMoranI
    ) / 3;

    return {
      score: integrationScore,
      flowMetrics,
      clusterMetrics,
      spatialMetrics,
      interpretation: this.interpretIntegrationScore(integrationScore)
    };
  }

  calculateSpatialDependence(data) {
    const { spatialAutocorrelation, timeSeriesData } = data;
    
    // Calculate global spatial dependence
    const globalDependence = {
      moranI: spatialAutocorrelation.global.moran_i,
      pValue: spatialAutocorrelation.global.p_value,
      significance: spatialAutocorrelation.global.significance
    };

    // Calculate local spatial patterns
    const localPatterns = this.analyzeLocalPatterns(spatialAutocorrelation.local);

    // Calculate temporal dependence
    const temporalDependence = this.calculateTemporalDependence(timeSeriesData);

    return {
      global: globalDependence,
      local: localPatterns,
      temporal: temporalDependence,
      interpretation: this.interpretSpatialDependence(globalDependence, localPatterns)
    };
  }

  calculateMarketEfficiency(data) {
    const { timeSeriesData, flowAnalysis, marketClusters } = data;

    // Calculate price efficiency
    const priceEfficiency = this.calculatePriceEfficiency(timeSeriesData);
    
    // Calculate flow efficiency
    const flowEfficiency = this.calculateFlowEfficiency(flowAnalysis);
    
    // Calculate market structure efficiency
    const structuralEfficiency = this.calculateStructuralEfficiency(marketClusters);

    // Calculate composite efficiency score
    const efficiencyScore = (
      priceEfficiency.score +
      flowEfficiency.score +
      structuralEfficiency.score
    ) / 3;

    return {
      score: efficiencyScore,
      priceEfficiency,
      flowEfficiency,
      structuralEfficiency,
      interpretation: this.interpretEfficiencyScore(efficiencyScore)
    };
  }

  calculateConflictImpact(data) {
    const { timeSeriesData } = data;
    
    // Calculate conflict-price correlation
    const correlations = this.calculateConflictCorrelations(timeSeriesData);
    
    // Calculate price volatility during conflict
    const volatility = this.calculateConflictVolatility(timeSeriesData);
    
    // Calculate market disruption score
    const disruptionScore = this.calculateDisruptionScore(correlations, volatility);

    return {
      correlations,
      volatility,
      disruptionScore,
      interpretation: this.interpretConflictImpact(disruptionScore)
    };
  }

  calculateFlowDynamics(data) {
    const { flowAnalysis, timeSeriesData } = data;
    
    // Calculate flow stability
    const stability = this.calculateFlowStability(flowAnalysis);
    
    // Calculate flow patterns
    const patterns = this.analyzeFlowPatterns(flowAnalysis);
    
    // Calculate flow evolution
    const evolution = this.analyzeFlowEvolution(flowAnalysis, timeSeriesData);

    return {
      stability,
      patterns,
      evolution,
      interpretation: this.interpretFlowDynamics(stability, patterns)
    };
  }

  calculateClusterMetrics(data) {
    const { marketClusters, flowAnalysis } = data;
    
    // Calculate cluster cohesion
    const cohesion = this.calculateClusterCohesion(marketClusters);
    
    // Calculate inter-cluster relationships
    const relationships = this.analyzeClusterRelationships(marketClusters, flowAnalysis);
    
    // Calculate cluster stability
    const stability = this.calculateClusterStability(marketClusters);

    return {
      cohesion,
      relationships,
      stability,
      interpretation: this.interpretClusterMetrics(cohesion, stability)
    };
  }

  // Utility calculation methods
  calculateFlowMetrics(flowAnalysis) {
    const totalFlows = flowAnalysis.length;
    const avgFlowWeight = _.meanBy(flowAnalysis, 'avg_flow');
    const flowVariance = this.calculateVariance(flowAnalysis.map(f => f.avg_flow));

    return {
      totalFlows,
      avgFlowWeight,
      flowVariance,
      normalizedDensity: this.normalize(totalFlows, 0, 100)
    };
  }

  calculateBasicClusterMetrics(clusters) {
    const avgSize = _.meanBy(clusters, 'market_count');
    const avgEfficiency = _.meanBy(clusters, c => c.efficiency.efficiency_score);
    const clusterCoverage = this.calculateClusterCoverage(clusters);

    return {
      avgSize,
      avgEfficiency,
      clusterCoverage,
      normalizedEfficiency: this.normalize(avgEfficiency, 0, 1)
    };
  }

  calculateSpatialMetrics(spatialAutocorrelation) {
    const moranI = spatialAutocorrelation.global.moran_i;
    const significance = spatialAutocorrelation.global.significance;
    const localClusters = this.countSignificantLocalClusters(spatialAutocorrelation.local);

    return {
      moranI,
      significance,
      localClusters,
      normalizedMoranI: this.normalize(moranI, -1, 1)
    };
  }

  calculateVariance(values) {
    const mean = _.mean(values);
    return _.mean(values.map(v => Math.pow(v - mean, 2)));
  }

  normalize(value, min, max) {
    return (value - min) / (max - min);
  }

  interpretIntegrationScore(score) {
    if (score >= 0.8) return 'High Integration';
    if (score >= 0.6) return 'Moderate Integration';
    if (score >= 0.4) return 'Low Integration';
    return 'Very Low Integration';
  }

  interpretSpatialDependence(global, local) {
    if (!global.significance) return 'No Significant Spatial Dependence';
    if (global.moranI > 0.3) return 'Strong Positive Spatial Dependence';
    if (global.moranI < -0.3) return 'Strong Negative Spatial Dependence';
    return 'Weak Spatial Dependence';
  }

  interpretEfficiencyScore(score) {
    if (score >= 0.8) return 'Highly Efficient';
    if (score >= 0.6) return 'Moderately Efficient';
    if (score >= 0.4) return 'Low Efficiency';
    return 'Very Low Efficiency';
  }

  interpretConflictImpact(score) {
    if (score >= 0.8) return 'Severe Impact';
    if (score >= 0.6) return 'Moderate Impact';
    if (score >= 0.4) return 'Low Impact';
    return 'Minimal Impact';
  }

  async getDataQualityReport(commodity, date) {
    try {
      const result = await this.loadAndProcessData(commodity, date);
      
      return {
        status: result.metadata.status,
        qualityScore: result.validation.details.qualityMetrics.overallQuality,
        coverage: result.validation.details.coverage,
        warnings: result.validation.warnings,
        recommendations: this.generateRecommendations(result)
      };
    } catch (error) {
      throw new Error(`Failed to generate quality report: ${error.message}`);
    }
  }

  generateRecommendations(result) {
    const recommendations = [];
    const { qualityMetrics } = result.validation.details;

    // Time series recommendations
    if (qualityMetrics.timeSeriesCoverage < 0.8) {
      recommendations.push({
        aspect: 'Time Series',
        issue: 'Insufficient temporal coverage',
        recommendation: 'Consider collecting additional historical data'
      });
    }

    // Cluster recommendations
    if (qualityMetrics.averageClusterSize < 3) {
      recommendations.push({
        aspect: 'Market Clusters',
        issue: 'Small cluster sizes',
        recommendation: 'Consider analyzing market connectivity patterns'
      });
    }

    // Flow recommendations
    if (qualityMetrics.flowDensity < 0.3) {
      recommendations.push({
        aspect: 'Market Flows',
        issue: 'Low flow density',
        recommendation: 'Investigate potential missing market connections'
      });
    }

    return recommendations;
  }

  destroy() {
    this._isInitialized = false;
    this.performanceStats = {
      loadTimes: [],
      processingTimes: [],
      validationTimes: [],
      integrationTimes: []
    };
    spatialDebugUtils.log('SpatialIntegrationSystem destroyed');
  }
}

// Export singleton instance
export const spatialIntegrationSystem = new SpatialIntegrationSystem();