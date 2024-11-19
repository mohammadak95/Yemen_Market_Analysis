// src/utils/backgroundMonitor.js

const MAX_METRICS_LENGTH = 1000;
const MAX_ERRORS_LENGTH = 100;

const SPATIAL_METRIC_TYPES = {
  DATA_LOAD: 'spatial-data-load',
  PROCESSING: 'spatial-processing',
  VALIDATION: 'spatial-validation'
};

class BackgroundMonitor {
  constructor() {
    this.metrics = [];
    this.errors = [];
    this.initialized = false;
    this.observers = new Set();
  }

  init() {
    if (this.initialized) return;
    
    this.initialized = true;
    console.log('[BackgroundMonitor] Initialized');
    
    // Initialize error handling
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();

    // Clean up old metrics periodically
    setInterval(this.cleanup.bind(this), 60000); // Clean up every minute
  }

  handleGlobalError(event) {
    this.logError('uncaught-error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString()
    });
  }

  handleUnhandledRejection(event) {
    this.logError('unhandled-rejection', {
      message: event.reason?.message || 'Unknown rejection reason',
      stack: event.reason?.stack,
      timestamp: new Date().toISOString()
    });
  }

  initializePerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      try {
        const perfObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.logMetric('performance', {
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
      }
    }
  }

  cleanup() {
    // Keep only recent metrics and errors
    if (this.metrics.length > MAX_METRICS_LENGTH) {
      this.metrics = this.metrics.slice(-MAX_METRICS_LENGTH);
    }
    if (this.errors.length > MAX_ERRORS_LENGTH) {
      this.errors = this.errors.slice(-MAX_ERRORS_LENGTH);
    }
  }

  startMetric(name, data = {}) {
    if (!name || typeof name !== 'string') {
      console.warn('[BackgroundMonitor] Invalid metric name');
      return { finish: () => {} };
    }

    const startTime = performance.now();
    const metricId = `${name}-${Date.now()}`;
    
    console.log(`[BackgroundMonitor] Metric started: ${name}`, { ...data, metricId });

    return {
      finish: (additionalData = {}) => {
        const duration = performance.now() - startTime;
        const metricData = {
          id: metricId,
          ...data,
          ...additionalData,
          duration,
          timestamp: new Date().toISOString(),
        };
        
        this.metrics.push({ name, data: metricData });
        console.log(`[BackgroundMonitor] Metric finished: ${name}`, metricData);
        
        this.cleanup();
        return metricData;
      },
      cancel: () => {
        console.log(`[BackgroundMonitor] Metric cancelled: ${name}`, { metricId });
      }
    };
  }

  logMetric(name, data) {
    if (!name || typeof name !== 'string') {
      console.warn('[BackgroundMonitor] Invalid metric name');
      return;
    }

    const metricData = {
      ...data,
      timestamp: new Date().toISOString()
    };

    const validMetricTypes = [
      'spatial-processing',
      'market-integration',
      'seasonal-analysis',
      'flow-calculation'
    ];

    this.metrics.push({ name, data: metricData });
    console.log(`[BackgroundMonitor] Metric logged: ${name}`, metricData);
    
    this.cleanup();
  }

  logError(name, data) {
    if (!name || typeof name !== 'string') {
      console.warn('[BackgroundMonitor] Invalid error name');
      return;
    }

    const errorData = {
      ...data,
      timestamp: new Date().toISOString()
    };

    this.errors.push({ name, data: errorData });
    console.error(`[BackgroundMonitor] Error logged: ${name}`, errorData);
    
    this.cleanup();
  }

  getMetrics() {
    return [...this.metrics];
  }

  getErrors() {
    return [...this.errors];
  }

  destroy() {
    window.removeEventListener('error', this.handleGlobalError.bind(this));
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    this.metrics = [];
    this.errors = [];
    this.initialized = false;
    
    console.log('[BackgroundMonitor] Destroyed');
  }
}

// Create and export the singleton instance
export const backgroundMonitor = new BackgroundMonitor();

// Initialize in development mode
if (process.env.NODE_ENV === 'development') {
  backgroundMonitor.init();
}