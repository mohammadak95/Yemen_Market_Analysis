// src/utils/MonitoringSystem.js

/**
 * Unified monitoring system that combines logging, performance tracking,
 * and debugging capabilities for spatial data analysis.
 */
class MonitoringSystem {
  constructor() {
    this.isLogging = false;
    this.errorQueue = [];
    this.batchSize = 10;
    this.batchTimeout = 1000; // 1 second

    this.isDebugEnabled = process.env.NODE_ENV === 'development';
    this.metrics = new Map();
    this.errors = new Map();
    this.warnings = new Map();
    this.performance = {
      measurements: new Map(),
      thresholds: {
        loading: 1000,    // 1s for loading operations
        processing: 500,  // 500ms for data processing
        rendering: 16     // 16ms for smooth rendering
      }
    };
    
    this.config = {
      maxHistorySize: 1000,
      maxMetricsAge: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 60 * 60 * 1000,     // 1 hour
      samplingRate: 0.1                    // 10% sampling for performance metrics
    };

    // Initialize cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    this.debugPanels = new Map();

    // Memory tracking
    this.memorySnapshots = [];
    this.memoryLimit = 100 * 1024 * 1024; // 100MB warning threshold

    // Performance thresholds
    this.thresholds = {
      loading: 2000,    // 2s for loading
      processing: 500,  // 500ms for processing
      rendering: 16,    // 16ms for smooth rendering
      memory: this.memoryLimit
    };

    // Initialize performance observer
    if (typeof window !== 'undefined') {
      this.initializePerformanceObserver();
    }

    this.debug = false;
  }

  enableDebug() {
    this.debug = true;
  }

  /**
   * Start measuring a metric's duration
   */
  startMetric(name, data = {}) {
    const startTime = performance.now();
    const metricId = `${name}_${Date.now()}`;

    return {
      finish: (additionalData = {}) => {
        const duration = performance.now() - startTime;
        this.recordMetric(name, {
          id: metricId,
          duration,
          timestamp: new Date().toISOString(),
          ...data,
          ...additionalData
        });

        // Check threshold violations
        const threshold = this.performance.thresholds[name];
        if (threshold && duration > threshold) {
          this.warn(`Performance threshold exceeded for ${name}`, {
            duration,
            threshold,
            ...additionalData
          });
        }

        return duration;
      }
    };
  }

  /**
   * Log a metric with the given name and data
   */
  logMetric(name, data) {
    console.log(`Metric logged: ${name}`, data);
    // You can add more logic here to store the metric data
  }

  /**
   * Record a metric measurement
   */
  recordMetric(name, data) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metrics = this.metrics.get(name);
    metrics.push({
      ...data,
      timestamp: new Date().toISOString()
    });

    // Sample for performance tracking
    if (Math.random() < this.config.samplingRate) {
      this.trackPerformance(name, data);
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(name, data) {
    if (!this.performance.measurements.has(name)) {
      this.performance.measurements.set(name, []);
    }
    
    const measurements = this.performance.measurements.get(name);
    measurements.push({
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Log a general message
   */
  log(message, data = {}, category = 'general') {
    if (this.isLogging) return;
    
    try {
      this.isLogging = true;
      if (this.isDebugEnabled) {
        console.log(`[${category}] ${message}`, data);
      }
    } finally {
      this.isLogging = false;
    }
  }

  /**
   * Log warning information
   */
  warn(message, data = {}, category = 'general') {
    const warningEntry = {
      type: 'warning',
      category,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    if (!this.warnings.has(category)) {
      this.warnings.set(category, []);
    }
    this.warnings.get(category).push(warningEntry);

    if (this.isDebugEnabled) {
      console.warn(`[${category}] ${message}`, data);
    }
  }

  /**
   * Log error information with batching to prevent cascading
   */
  error(message, error = null, category = 'general') {
    // Queue errors instead of processing immediately
    this.errorQueue.push({ message, error, category });
    this.processErrorQueue();
  }

  /**
   * Process the error queue in batches
   */
  processErrorQueue() {
    if (this.isLogging) return;

    try {
      this.isLogging = true;
      
      // Process only a batch of errors
      const batch = this.errorQueue.splice(0, this.batchSize);
      
      batch.forEach(({ message, error, category }) => {
        const errorEntry = {
          type: 'error',
          category,
          message,
          error: error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : null,
          timestamp: new Date().toISOString()
        };

        if (!this.errors.has(category)) {
          this.errors.set(category, []);
        }
        this.errors.get(category).push(errorEntry);

        if (this.isDebugEnabled) {
          console.error(`[${category}] ${message}`, error);
        }
      });

      // If there are more errors, schedule next batch
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processErrorQueue(), this.batchTimeout);
      }
    } finally {
      this.isLogging = false;
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = {
      metrics: {},
      warnings: {},
      errors: {}
    };

    // Process metrics
    for (const [name, measurements] of this.performance.measurements) {
      const durations = measurements.map(m => m.duration);
      report.metrics[name] = {
        count: measurements.length,
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        thresholdViolations: measurements.filter(m => 
          m.duration > (this.performance.thresholds[name] || Infinity)
        ).length
      };
    }

    // Process warnings
    for (const [category, categoryWarnings] of this.warnings) {
      report.warnings[category] = categoryWarnings.length;
    }

    // Process errors
    for (const [category, categoryErrors] of this.errors) {
      report.errors[category] = categoryErrors.length;
    }

    return report;
  }

  /**
   * Analyze spatial patterns in the data
   */
  analyzeSpatialPatterns(data) {
    const analysis = {
      priceDistribution: this.analyzePriceDistribution(data),
      marketClusters: this.analyzeMarketClusters(data),
      spatialAutocorrelation: this.analyzeSpatialAutocorrelation(data)
    };

    this.log('Spatial pattern analysis complete', analysis, 'spatial-analysis');
    return analysis;
  }

  /**
   * Analyze price distribution
   */
  analyzePriceDistribution(data) {
    if (!data?.timeSeriesData?.length) return null;

    const prices = data.timeSeriesData
      .map(d => d.avgUsdPrice)
      .filter(p => !isNaN(p));

    return {
      mean: this.calculateMean(prices),
      stdDev: this.calculateStdDev(prices),
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }

  /**
   * Analyze market clusters
   */
  analyzeMarketClusters(data) {
    if (!data?.marketClusters?.length) return null;

    return {
      totalClusters: data.marketClusters.length,
      averageSize: this.calculateMean(
        data.marketClusters.map(c => c.market_count)
      ),
      largestCluster: Math.max(
        ...data.marketClusters.map(c => c.market_count)
      )
    };
  }

  /**
   * Analyze spatial autocorrelation
   */
  analyzeSpatialAutocorrelation(data) {
    if (!data?.spatialAutocorrelation?.global) return null;

    return {
      globalMetrics: data.spatialAutocorrelation.global,
      significantClusters: Object.entries(data.spatialAutocorrelation.local || {})
        .filter(([_, stats]) => stats.p_value < 0.05).length,
      hotspotCount: Object.entries(data.spatialAutocorrelation.hotspots || {})
        .filter(([_, stats]) => stats.intensity === 'hot_spot').length
    };
  }

  /**
   * Utility method to calculate mean
   */
  calculateMean(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Utility method to calculate standard deviation
   */
  calculateStdDev(numbers) {
    const mean = this.calculateMean(numbers);
    return Math.sqrt(
      numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length
    );
  }

  /**
   * Add entry to history
   */
  addToHistory(entry) {
    const category = entry.category || 'general';
    
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }

    const metrics = this.metrics.get(category);
    metrics.push(entry);

    // Maintain history size limit
    if (metrics.length > this.config.maxHistorySize) {
      metrics.shift();
    }
  }

  /**
   * Clean up old metrics and data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = this.config.maxMetricsAge;

    // Clean up metrics
    for (const [category, metrics] of this.metrics) {
      this.metrics.set(
        category,
        metrics.filter(m => now - new Date(m.timestamp).getTime() < maxAge)
      );
    }

    // Clean up performance measurements
    for (const [name, measurements] of this.performance.measurements) {
      this.performance.measurements.set(
        name,
        measurements.filter(m => now - m.timestamp < maxAge)
      );
    }
  }

  /**
   * Destroy the monitoring system
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.metrics.clear();
    this.errors.clear();
    this.warnings.clear();
    this.performance.measurements.clear();
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceObserver() {
    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.trackPerformanceEntry(entry);
      });
    });

    this.observer.observe({ 
      entryTypes: ['measure', 'resource', 'navigation'] 
    });
  }

  /**
   * Track spatial metrics
   */
  trackSpatialMetrics({
    operation,
    region,
    data,
    duration
  }) {
    if (!this.metrics.has('spatial')) {
      this.metrics.set('spatial', []);
    }

    const spatialMetrics = this.metrics.get('spatial');
    spatialMetrics.push({
      operation,
      region,
      dataSize: JSON.stringify(data).length,
      duration,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 metrics
    if (spatialMetrics.length > 1000) {
      spatialMetrics.shift();
    }
  }

  /**
   * Profile performance
   */
  profilePerformance(category, operation) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function(...args) {
        const metric = monitoringSystem.startMetric(
          `${category}_${operation}`
        );

        try {
          const result = await originalMethod.apply(this, args);
          metric.finish({ status: 'success' });
          return result;
        } catch (error) {
          metric.finish({ status: 'error', error: error.message });
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage() {
    if (typeof window === 'undefined' || !window.performance?.memory) {
      return null;
    }

    const snapshot = {
      used: window.performance.memory.usedJSHeapSize,
      total: window.performance.memory.totalJSHeapSize,
      limit: window.performance.memory.jsHeapSizeLimit,
      timestamp: new Date().toISOString()
    };

    this.memorySnapshots.push(snapshot);

    // Keep last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }

    // Check memory threshold
    if (snapshot.used > this.memoryLimit) {
      this.warn('Memory usage exceeded threshold', {
        used: snapshot.used,
        limit: this.memoryLimit
      });
    }

    return snapshot;
  }

  /**
   * Create debug panel
   */
  createDebugPanel(name, config = {}) {
    const panel = {
      name,
      config,
      metrics: [],
      isActive: true,
      addMetric: (metric) => {
        panel.metrics.push({
          ...metric,
          timestamp: new Date().toISOString()
        });

        // Keep panel metrics under limit
        if (panel.metrics.length > (config.maxMetrics || 100)) {
          panel.metrics.shift();
        }
      },
      clear: () => {
        panel.metrics = [];
      }
    };

    this.debugPanels.set(name, panel);
    return panel;
  }

  /**
   * Track performance entry
   */
  trackPerformanceEntry(entry) {
    if (!this.performance.measurements.has(entry.entryType)) {
      this.performance.measurements.set(entry.entryType, []);
    }
    
    this.performance.measurements.get(entry.entryType).push({
      name: entry.name,
      duration: entry.duration,
      type: entry.entryType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check performance threshold
   */
  checkPerformanceThreshold(name, duration) {
    const threshold = this.thresholds[name];
    if (threshold && duration > threshold) {
      this.warn(`Performance threshold exceeded for ${name}`, {
        duration,
        threshold,
        category: 'performance'
      });
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      metrics: Object.fromEntries(this.metrics),
      errors: Object.fromEntries(this.errors),
      warnings: Object.fromEntries(this.warnings),
      memory: this.memorySnapshots,
      performance: Object.fromEntries(this.performance.measurements)
    };
  }
}

// Export singleton instance
export const monitoringSystem = new MonitoringSystem();

// For backward compatibility
export const backgroundMonitor = monitoringSystem;
export const spatialDebugUtils = monitoringSystem;

export default MonitoringSystem;