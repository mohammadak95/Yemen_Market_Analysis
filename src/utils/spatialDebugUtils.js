// src/utils/spatialDebugUtils.js

import { backgroundMonitor } from './backgroundMonitor';

class SpatialDebugUtils {
  constructor() {
    this.isDebugEnabled = false;
    this.performanceMetrics = new Map();
    this.debugHistory = [];
    this.maxHistorySize = 1000;
    this.startTime = Date.now();
  }

  /**
   * Enables debug mode
   */
  enableDebug() {
    this.isDebugEnabled = true;
    this.log('🔍 Spatial debugging enabled');
    
    // Initialize performance monitoring
    this.performanceMetrics.clear();
    this.startTime = Date.now();
    
    backgroundMonitor.logMetric('spatial-debug-enabled', {
      timestamp: new Date().toISOString(),
      sessionId: this.startTime
    });
  }

  /**
   * Disables debug mode
   */
  disableDebug() {
    this.log('🔍 Spatial debugging disabled');
    this.isDebugEnabled = false;
    
    // Log final metrics
    this.logFinalMetrics();
    
    backgroundMonitor.logMetric('spatial-debug-disabled', {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime
    });
  }

  /**
   * Logs debug information
   */
  log(...args) {
    if (!this.isDebugEnabled) return;

    const timestamp = new Date().toISOString();
    console.log('🔍 [Spatial Debug]:', ...args);
    
    this.addToHistory({
      type: 'log',
      timestamp,
      content: args
    });
  }

  /**
   * Logs error information
   */
  error(...args) {
    const timestamp = new Date().toISOString();
    console.error('❌ [Spatial Error]:', ...args);
    
    this.addToHistory({
      type: 'error',
      timestamp,
      content: args
    });

    backgroundMonitor.logError('spatial-debug-error', {
      timestamp,
      error: args[0]?.message || args[0]
    });
  }

  /**
   * Logs warning information
   */
  warn(...args) {
    if (!this.isDebugEnabled) return;

    const timestamp = new Date().toISOString();
    console.warn('⚠️ [Spatial Warning]:', ...args);
    
    this.addToHistory({
      type: 'warning',
      timestamp,
      content: args
    });
  }

  /**
   * Validates spatial data structure and content
   */
  validateSpatialData(data) {
    if (!data) {
      return { isValid: false, errors: ['No data provided'] };
    }

    const errors = [];
    const warnings = [];

    // Validate required structure
    if (!data.geoData || !Array.isArray(data.geoData.features)) {
      errors.push('geoData is missing or does not contain features');
    }

    // Validate features if present
    if (data.geoData?.features) {
      data.geoData.features.forEach((feature, index) => {
        if (!feature.properties) {
          errors.push(`Feature at index ${index} is missing properties`);
        }
        if (!feature.geometry) {
          errors.push(`Feature at index ${index} is missing geometry`);
        }
      });
    }

    // Validate flow data
    if (data.flowMaps && !Array.isArray(data.flowMaps)) {
      errors.push('flowMaps should be an array');
    }

    const validationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (this.isDebugEnabled) {
      this.log('Data Validation Result:', validationResult);
    }

    return validationResult;
  }

  /**
   * Logs spatial metrics for debugging
   */
  logSpatialMetrics(data) {
    if (!this.isDebugEnabled) return;

    this.log('Spatial Metrics:');

    // Log integration score
    if (data.analysisResults?.spatialAutocorrelation?.moran_i !== undefined) {
      this.log(`Moran's I: ${data.analysisResults.spatialAutocorrelation.moran_i}`);
    } else {
      this.log("Moran's I is not available");
    }

    // Log number of clusters
    const clusterCount = data.marketClusters?.length || 0;
    this.log(`Number of Market Clusters: ${clusterCount}`);

    // Log number of detected shocks
    const shockCount = data.detectedShocks?.length || 0;
    this.log(`Number of Detected Shocks: ${shockCount}`);

    // Log time series data length
    const timeSeriesLength = data.timeSeriesData?.length || 0;
    this.log(`Time Series Data Points: ${timeSeriesLength}`);

    this.trackMetric('spatial-analysis', {
      moranI: data.analysisResults?.spatialAutocorrelation?.moran_i,
      clusterCount,
      shockCount,
      timeSeriesLength
    });
  }

  /**
   * Analyzes spatial patterns in the data
   */
  analyzeSpatialPatterns(data) {
    const insights = {
      priceDistribution: null,
      flowIntensity: null,
      marketClusters: null,
      spatialAutocorrelation: null
    };

    // Analyze price distribution
    if (data.geoData?.features) {
      const prices = data.geoData.features
        .map(f => f.properties?.priceData?.avgUsdPrice)
        .filter(p => p !== undefined);

      if (prices.length > 0) {
        insights.priceDistribution = {
          max: Math.max(...prices),
          min: Math.min(...prices),
          avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
          variance: this.calculateVariance(prices)
        };
      }
    }

    // Analyze flow intensity
    if (data.flowMaps?.length > 0) {
      const flows = data.flowMaps
        .map(flow => flow.flow_weight)
        .filter(weight => weight !== undefined);

      insights.flowIntensity = {
        max: Math.max(...flows),
        min: Math.min(...flows),
        avg: flows.reduce((sum, weight) => sum + weight, 0) / flows.length,
        totalFlows: flows.length
      };
    }

    // Analyze market clusters
    if (data.marketClusters?.length > 0) {
      insights.marketClusters = {
        count: data.marketClusters.length,
        averageSize: data.marketClusters.reduce((acc, cluster) => 
          acc + cluster.market_count, 0) / data.marketClusters.length,
        maxSize: Math.max(...data.marketClusters.map(c => c.market_count)),
        minSize: Math.min(...data.marketClusters.map(c => c.market_count))
      };
    }

    // Analyze spatial autocorrelation
    if (data.spatialAutocorrelation) {
      insights.spatialAutocorrelation = {
        global: data.spatialAutocorrelation.global,
        significantLocalClusters: Object.values(data.spatialAutocorrelation.local)
          .filter(local => local.p_value < 0.05).length,
        hotspotCount: Object.values(data.spatialAutocorrelation.hotspots)
          .filter(spot => spot.intensity === 'hot_spot').length
      };
    }

    if (this.isDebugEnabled) {
      this.log('Spatial Pattern Analysis:', insights);
    }

    return insights;
  }

  /**
   * Monitors performance metrics
   */
  monitorPerformance(operation, data) {
    if (!this.isDebugEnabled) return null;

    const start = performance.now();
    const memoryStart = performance.memory?.usedJSHeapSize;

    this.log(`Starting operation: ${operation}`);

    return {
      end: () => {
        const duration = performance.now() - start;
        const memoryDiff = performance.memory?.usedJSHeapSize - memoryStart;

        const metrics = {
          duration: `${duration.toFixed(2)}ms`,
          memoryUsage: memoryDiff ? 
            `${(memoryDiff / 1024 / 1024).toFixed(2)}MB` : 'N/A',
          dataSize: data ? 
            `${JSON.stringify(data).length} bytes` : 'N/A'
        };

        this.log(`Completed ${operation}:`, metrics);
        this.trackMetric(operation, metrics);

        return metrics;
      }
    };
  }

  /**
   * Checks for potential memory leaks
   */
  checkMemoryUsage() {
    if (!this.isDebugEnabled || !performance.memory) return;

    const memoryUsage = {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };

    const usageRatio = memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit;
    
    if (usageRatio > 0.8) {
      this.warn('High memory usage detected:', {
        usageRatio: `${(usageRatio * 100).toFixed(1)}%`,
        ...memoryUsage
      });
    }

    this.trackMetric('memory-usage', memoryUsage);
  }

  /**
   * Tracks a performance metric
   */
  trackMetric(name, value) {
    if (!this.performanceMetrics.has(name)) {
      this.performanceMetrics.set(name, []);
    }

    this.performanceMetrics.get(name).push({
      timestamp: Date.now(),
      value
    });
  }

  /**
   * Logs final metrics before disabling debug mode
   */
  logFinalMetrics() {
    if (this.performanceMetrics.size === 0) return;

    console.group('📊 Final Spatial Debug Metrics');
    
    for (const [name, metrics] of this.performanceMetrics) {
      console.log(`${name}:`, {
        count: metrics.length,
        latest: metrics[metrics.length - 1]
      });
    }
    
    console.groupEnd();
  }

  /**
   * Adds an entry to the debug history
   */
  addToHistory(entry) {
    this.debugHistory.push(entry);
    
    // Maintain history size limit
    if (this.debugHistory.length > this.maxHistorySize) {
      this.debugHistory.shift();
    }
  }

  /**
   * Gets debug history for a specific timeframe
   */
  getHistory(timeframe) {
    if (!timeframe) return this.debugHistory;

    const startTime = new Date(Date.now() - timeframe);
    return this.debugHistory.filter(entry => 
      new Date(entry.timestamp) >= startTime
    );
  }

  /**
   * Calculates variance for an array of numbers
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Clears all debug data
   */
  clear() {
    this.performanceMetrics.clear();
    this.debugHistory = [];
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const spatialDebugUtils = new SpatialDebugUtils();