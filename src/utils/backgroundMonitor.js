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

  // **New Methods Added Below**

  /**
   * Monitors spatial processing metrics.
   * @param {object} data - Spatial processing data.
   * @param {number} processStartTime - Start time of the processing.
   * @returns {object} - Processed spatial metrics.
   */
  monitorSpatialProcessing(data, processStartTime) {
    const processingTime = performance.now() - processStartTime;

    const spatialMetrics = {
      processingTime,
      dataSize: JSON.stringify(data).length,
      timeSeriesCoverage: data.time_series_data.length,
      spatialSignificance: data.spatial_autocorrelation.global.significance,
      clusterCount: data.market_clusters.length,
    };

    // Optionally log or store the spatial metrics
    this.logMetric('spatial-processing', spatialMetrics);

    return spatialMetrics;
  }

  /**
   * Starts monitoring a spatial metric.
   * @param {string} name - Name of the spatial metric.
   * @param {string} commodity - Commodity being monitored.
   * @returns {object} - An object with a finish() method to log the metric.
   */
  startSpatialMetric(name, commodity) {
    const startTime = performance.now();
    console.log(`[BackgroundMonitor] Spatial Metric started: spatial-${name}`, { commodity });

    return {
      finish: (data) => {
        const duration = performance.now() - startTime;
        const metricData = {
          duration,
          commodity,
          timestamp: new Date().toISOString(),
          ...data,
        };
        this.logMetric(`spatial-${name}`, metricData);
      },
    };
  }
}

// Export a singleton instance
export const backgroundMonitor = new BackgroundMonitor();

// Initialize the monitor in development
if (process.env.NODE_ENV === 'development') {
  backgroundMonitor.init();
}
