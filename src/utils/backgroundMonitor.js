// src/utils/backgroundMonitor.js

class BackgroundMonitor {
  constructor() {
    this.logs = [];
    this.metrics = new Map();
    this.startTime = Date.now();
    this.isEnabled = process.env.NODE_ENV === 'development';
    this.maxLogsPerCategory = 100; // Limit logs per category
    this.spatialOperationsMetrics = {
      transformations: 0,
      validations: 0,
      errors: 0,
      startTime: Date.now(),
    };
    this.isMonitoring = false;
  }

  init() {
    if (!this.isEnabled || this.isMonitoring) return;
    this.isMonitoring = true;

    // Use WeakMap for memory-efficient storage of component metrics
    this.componentMetrics = new WeakMap();

    this.setupMonitoring();
  }

  setupMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor only essential network requests
    this.setupNetworkMonitoring();

    // Efficient Redux monitoring
    this.setupReduxMonitoring();

    // Performance-focused monitoring
    this.setupPerformanceMonitoring();

    // Spatial operations monitoring
    this.setupSpatialMonitoring();
  }

  setupNetworkMonitoring() {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      let url = '';
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] && args[0].url) {
        url = args[0].url;
      }

      // Only monitor spatial data related requests
      if (!this.isSpatialRequest(url)) {
        return originalFetch(...args);
      }

      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        this.logMetric('spatial-network', {
          url,
          duration,
          status: response.status,
          timestamp: Date.now(),
        });

        return response;
      } catch (error) {
        this.logError('spatial-network', {
          url,
          error: error.message,
        });
        throw error;
      }
    };
  }

  setupReduxMonitoring() {
    if (!window.__REDUX_DEVTOOLS_EXTENSION__) return;

    const spatialActions = [
      'spatial/fetchSpatialData',
      'spatial/updateLoadingProgress',
      'spatial/resetSpatialState',
    ];

    window.__REDUX_DEVTOOLS_EXTENSION__.subscribe((message) => {
      if (
        message.type === 'DISPATCH' &&
        spatialActions.some((action) => message.payload.type?.includes(action))
      ) {
        this.logMetric('spatial-redux', {
          action: message.payload.type,
          timestamp: Date.now(),
        });
      }
    });
  }

  setupPerformanceMonitoring() {
    // Monitor only long-running spatial operations
    const observer = new PerformanceObserver((list) => {
      list.getEntries()
        .filter(
          (entry) => entry.duration > 100 && this.isSpatialOperation(entry.name)
        )
        .forEach((entry) => {
          this.logMetric('spatial-performance', {
            operation: entry.name,
            duration: entry.duration,
            timestamp: Date.now(),
          });
        });
    });

    observer.observe({ entryTypes: ['measure', 'longtask'] });
  }

  setupSpatialMonitoring() {
    // Track spatial operation statistics
    this.spatialOperationsMetrics = {
      transformations: 0,
      validations: 0,
      errors: 0,
      startTime: Date.now(),
    };
  }

  logMetric(category, data) {
    if (!this.isEnabled) return;

    const metric = {
      category,
      data,
      timestamp: Date.now(),
    };

    // Keep category-specific log limits
    const categoryLogs = this.logs.filter((log) => log.category === category);
    if (categoryLogs.length >= this.maxLogsPerCategory) {
      const oldestLogIndex = this.logs.findIndex(
        (log) => log.category === category
      );
      if (oldestLogIndex !== -1) {
        this.logs.splice(oldestLogIndex, 1);
      }
    }

    this.logs.push(metric);
    this.updateMetrics(category, data);
  }

  logError(category, data) {
    if (!this.isEnabled) return;

    const errorLog = {
      category: 'error',
      data: {
        category,
        ...data,
      },
      timestamp: Date.now(),
    };

    // Keep category-specific log limits
    const errorLogs = this.logs.filter((log) => log.category === 'error');
    if (errorLogs.length >= this.maxLogsPerCategory) {
      const oldestLogIndex = this.logs.findIndex(
        (log) => log.category === 'error'
      );
      if (oldestLogIndex !== -1) {
        this.logs.splice(oldestLogIndex, 1);
      }
    }

    this.logs.push(errorLog);

    // Also increment error count
    this.spatialOperationsMetrics.errors += 1;

    // Output to console for immediate feedback
    console.error(`[BackgroundMonitor Error] ${category}:`, data);
  }

  updateMetrics(category, data) {
    const key = `${category}-${Math.floor(Date.now() / 60000)}`;
    const metrics = this.metrics.get(key) || [];
    metrics.push(data);

    // Keep only recent metrics
    if (metrics.length > this.maxLogsPerCategory) {
      metrics.shift();
    }

    this.metrics.set(key, metrics);
  }

  logSpatialOperation(operation, duration) {
    if (!this.isEnabled) return;

    this.spatialOperationsMetrics[operation] =
      (this.spatialOperationsMetrics[operation] || 0) + 1;

    this.logMetric('spatial-operation', {
      operation,
      duration,
      timestamp: Date.now(),
    });
  }

  isSpatialRequest(url) {
    const spatialPaths = [
      'geojson',
      'spatial_weights',
      'flow_maps',
      'spatial_analysis',
      'choropleth_data',
      'network_data',
      'enhanced_unified_data',
    ];
    return spatialPaths.some((path) => url.includes(path));
  }

  isSpatialOperation(name) {
    const spatialOperations = [
      'transform',
      'merge',
      'process',
      'validate',
      'fetch',
      'load',
      'parse',
    ];
    return spatialOperations.some((op) =>
      name.toLowerCase().includes(op)
    );
  }

  getSpatialMetrics() {
    return {
      operations: this.spatialOperationsMetrics,
      performance: {
        averageTransformTime: this.calculateAverageMetric(
          'spatial-operation',
          'transform'
        ),
        averageProcessingTime: this.calculateAverageMetric(
          'spatial-operation',
          'process'
        ),
        totalOperations: Object.values(this.spatialOperationsMetrics).reduce(
          (a, b) => a + b,
          0
        ),
      },
      errors: this.logs.filter((log) => log.category === 'error').length,
    };
  }

  calculateAverageMetric(category, operation) {
    const metrics = Array.from(this.metrics.values())
      .flat()
      .filter((m) => m.operation === operation);

    if (!metrics.length) return 0;

    return (
      metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
    );
  }

  clearMetrics() {
    this.logs = [];
    this.metrics.clear();
    this.spatialOperationsMetrics = {
      transformations: 0,
      validations: 0,
      errors: 0,
      startTime: Date.now(),
    };
  }

  exportSpatialMetrics() {
    return {
      metrics: this.getSpatialMetrics(),
      logs: this.logs.filter((log) =>
        log.category.startsWith('spatial')
      ),
      timestamp: new Date().toISOString(),
    };
  }
}

export const backgroundMonitor = new BackgroundMonitor();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  window.__spatialMonitor = backgroundMonitor;
  backgroundMonitor.init();
}
