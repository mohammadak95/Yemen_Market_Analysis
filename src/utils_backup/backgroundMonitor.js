// src/utils/backgroundMonitor.js

class BackgroundMonitor {
  constructor() {
    this.metrics = [];
    this.errors = [];
  }

  /**
   * Initializes the background monitor.
   */
  init() {
    console.log('[BackgroundMonitor] Initialized');
  }

  /**
   * Starts a new metric monitoring session.
   * @param {string} name - Name of the metric.
   * @param {object} data - Additional data.
   * @returns {object} - An object with a finish() method.
   */
  startMetric(name, data = {}) {
    const startTime = performance.now();
    console.log(`[BackgroundMonitor] Metric started: ${name}`, data);

    // Return an object with a finish() method
    return {
      finish: (additionalData = {}) => {
        const duration = performance.now() - startTime;
        const metricData = {
          ...data,
          ...additionalData,
          duration,
          timestamp: new Date().toISOString(),
        };
        this.metrics.push({ name, data: metricData });
        console.log(`[BackgroundMonitor] Metric finished: ${name}`, metricData);
      },
    };
  }

  /**
   * Logs a metric event.
   * @param {string} name - Name of the metric.
   * @param {object} data - Metric data.
   */
  logMetric(name, data) {
    this.metrics.push({ name, data });
    console.log(`[BackgroundMonitor] Metric logged: ${name}`, data);
  }

  /**
   * Logs an error event.
   * @param {string} name - Name of the error.
   * @param {object} data - Error data.
   */
  logError(name, data) {
    this.errors.push({ name, data });
    console.error(`[BackgroundMonitor] Error logged: ${name}`, data);
  }

  /**
   * Finalizes the monitoring session.
   * @param {string} name - Name of the metric.
   * @param {object} data - Additional data.
   */
  finish(name, data = {}) {
    console.log(`[BackgroundMonitor] Metric finalized: ${name}`, data);
  }
}

export const backgroundMonitor = new BackgroundMonitor();

// Initialize the monitor in development
if (process.env.NODE_ENV === 'development') {
  backgroundMonitor.init();
}
