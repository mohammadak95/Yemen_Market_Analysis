// src/utils/backgroundMonitor.js

const MAX_METRICS_LENGTH = 1000;
const MAX_ERRORS_LENGTH = 100;
const CLEANUP_INTERVAL = 60000; // 1 minute

const METRIC_TYPES = {
  SPATIAL: {
    DATA_LOAD: 'spatial-data-load',
    PROCESSING: 'spatial-processing',
    VALIDATION: 'spatial-validation'
  },
  FLOW: {
    DATA_LOAD: 'flow-data-load',
    PROCESSING: 'flow-processing',
    VALIDATION: 'flow-validation'
  },
  SYSTEM: {
    PERFORMANCE: 'performance',
    ERROR: 'error',
    INIT: 'initialization'
  }
};

class BackgroundMonitor {
  constructor() {
    this.metrics = [];
    this.errors = [];
    this.initialized = false;
    this.observers = new Set();
    this.cleanupInterval = null;
    
    // Backward compatibility
    this.SPATIAL_METRIC_TYPES = METRIC_TYPES.SPATIAL;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Initialize error handling
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

      // Initialize performance monitoring
      await this.initializePerformanceMonitoring();

      // Start cleanup interval
      this.cleanupInterval = setInterval(this.cleanup.bind(this), CLEANUP_INTERVAL);
      
      this.initialized = true;
      console.log('[BackgroundMonitor] Initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[BackgroundMonitor] Initialization failed:', error);
      this.logError('init-failed', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  handleGlobalError(event) {
    try {
      this.logError('uncaught-error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[BackgroundMonitor] Error handling failed:', e);
    }
  }

  handleUnhandledRejection(event) {
    try {
      this.logError('unhandled-rejection', {
        message: event.reason?.message || 'Unknown rejection reason',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[BackgroundMonitor] Rejection handling failed:', e);
    }
  }

  async initializePerformanceMonitoring() {
    if (!('PerformanceObserver' in window)) {
      console.warn('[BackgroundMonitor] PerformanceObserver not available');
      return;
    }

    try {
      const perfObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.logMetric(METRIC_TYPES.SYSTEM.PERFORMANCE, {
            name: entry.name,
            duration: entry.duration,
            type: entry.entryType,
            timestamp: new Date().toISOString()
          });
        });
      });

      perfObserver.observe({ 
        entryTypes: ['resource', 'navigation', 'longtask', 'paint', 'mark'] 
      });

      this.observers.add(perfObserver);
    } catch (error) {
      console.warn('[BackgroundMonitor] Performance monitoring setup failed:', error);
      throw error;
    }
  }

  cleanup() {
    if (this.metrics.length > MAX_METRICS_LENGTH) {
      const excess = this.metrics.length - MAX_METRICS_LENGTH;
      this.metrics.splice(0, excess);
    }
    if (this.errors.length > MAX_ERRORS_LENGTH) {
      const excess = this.errors.length - MAX_ERRORS_LENGTH;
      this.errors.splice(0, excess);
    }
  }

  startMetric(name, data = {}) {
    if (!name || typeof name !== 'string') {
      console.warn('[BackgroundMonitor] Invalid metric name');
      return { finish: () => {}, cancel: () => {} };
    }

    const startTime = performance.now();
    const metricId = `${name}-${Date.now()}`;

    // For debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[BackgroundMonitor] Metric started: ${name}`, { ...data, metricId });
    }

    return {
      finish: (additionalData = {}) => {
        try {
          const duration = performance.now() - startTime;
          const metricData = {
            id: metricId,
            ...data,
            ...additionalData,
            duration,
            timestamp: new Date().toISOString(),
          };
          
          this.metrics.push({ name, data: metricData });
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[BackgroundMonitor] Metric finished: ${name}`, metricData);
          }
          
          this.cleanup();
          return metricData;
        } catch (error) {
          console.error('[BackgroundMonitor] Error finishing metric:', error);
          return null;
        }
      },
      cancel: () => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[BackgroundMonitor] Metric cancelled: ${name}`, { metricId });
        }
      }
    };
  }

  logMetric(name, data) {
    if (!name || typeof name !== 'string') {
      console.warn('[BackgroundMonitor] Invalid metric name');
      return;
    }

    try {
      const metricData = {
        ...data,
        timestamp: new Date().toISOString()
      };

      this.metrics.push({ name, data: metricData });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[BackgroundMonitor] Metric logged: ${name}`, metricData);
      }
      
      this.cleanup();
    } catch (error) {
      console.error('[BackgroundMonitor] Error logging metric:', error);
    }
  }

  logError(name, data) {
    if (!name || typeof name !== 'string') {
      console.warn('[BackgroundMonitor] Invalid error name');
      return;
    }

    try {
      const errorData = {
        ...data,
        timestamp: new Date().toISOString()
      };

      this.errors.push({ name, data: errorData });
      console.error(`[BackgroundMonitor] Error logged: ${name}`, errorData);
      
      this.cleanup();
    } catch (error) {
      console.error('[BackgroundMonitor] Error logging error:', error);
    }
  }

  getMetrics(type = null) {
    if (!type) {
      return [...this.metrics];
    }
    return this.metrics.filter(metric => metric.name.startsWith(type));
  }

  getErrors() {
    return [...this.errors];
  }

  clearMetrics() {
    this.metrics = [];
    this.errors = [];
  }

  destroy() {
    try {
      window.removeEventListener('error', this.handleGlobalError.bind(this));
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      
      this.observers.forEach(observer => observer.disconnect());
      this.observers.clear();
      
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      this.metrics = [];
      this.errors = [];
      this.initialized = false;
      
      console.log('[BackgroundMonitor] Destroyed successfully');
    } catch (error) {
      console.error('[BackgroundMonitor] Error during destruction:', error);
    }
  }

  // Utility method to check monitor health
  checkHealth() {
    return {
      initialized: this.initialized,
      metricsCount: this.metrics.length,
      errorsCount: this.errors.length,
      observersCount: this.observers.size,
      hasCleanupInterval: Boolean(this.cleanupInterval)
    };
  }
}

// Create and export the singleton instance
export const backgroundMonitor = new BackgroundMonitor();

// Initialize in development mode
if (process.env.NODE_ENV === 'development') {
  backgroundMonitor.init().catch(error => {
    console.error('[BackgroundMonitor] Auto-initialization failed:', error);
  });
}

// Export metric types for external use
export const MetricTypes = METRIC_TYPES;