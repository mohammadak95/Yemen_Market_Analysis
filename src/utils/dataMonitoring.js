// src/utils/dataMonitoring.js

import { backgroundMonitor } from './backgroundMonitor';
import Papa from 'papaparse';

/**
 * Class to monitor data loading operations.
 */
export class DataLoadingMonitor {
  constructor() {
    this.requests = new Map();
    this.errors = new Map();
    this.performance = {
      loadTimes: [],
      processingTimes: [],
      networkTimes: [],
    };
  }

  /**
   * Starts monitoring a new data request.
   * @param {string} id - Unique identifier for the request.
   * @param {string} type - Type of the request (e.g., 'fetch', 'process').
   */
  startRequest(id, type) {
    const request = {
      id,
      type,
      startTime: performance.now(),
      status: 'pending',
    };
    this.requests.set(id, request);

    console.group(`Data Request Started: ${id}`);
    console.log('Type:', type);
    console.log('Start Time:', new Date().toISOString());
    console.groupEnd();

    return request;
  }

  /**
   * Completes monitoring of a data request.
   * @param {string} id - Unique identifier for the request.
   * @param {*} data - Data returned from the request.
   */
  completeRequest(id, data) {
    const request = this.requests.get(id);
    if (request) {
      const endTime = performance.now();
      const duration = endTime - request.startTime;

      request.status = 'completed';
      request.endTime = endTime;
      request.duration = duration;

      this.performance.loadTimes.push({
        type: request.type,
        duration,
        timestamp: new Date().toISOString(),
      });

      console.group(`Data Request Completed: ${id}`);
      console.log('Duration:', `${duration.toFixed(2)}ms`);
      console.log('Data Size:', this.getDataSize(data));
      console.groupEnd();

      backgroundMonitor.logMetric('data-load-complete', {
        requestId: id,
        type: request.type,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Logs an error that occurred during a data request.
   * @param {string} id - Unique identifier for the request.
   * @param {Error} error - Error object.
   */
  logError(id, error) {
    this.errors.set(id, {
      error,
      timestamp: new Date().toISOString(),
    });

    console.error(`Data Request Error: ${id}`, error);
    backgroundMonitor.logError('data-load-error', {
      requestId: id,
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Calculates the size of the data.
   * @param {*} data - Data whose size is to be calculated.
   * @returns {string} - Size of the data in KB or an error message.
   */
  getDataSize(data) {
    try {
      const jsonData = JSON.stringify(data);
      const size = new Blob([jsonData]).size;
      return `${(size / 1024).toFixed(2)} KB`;
    } catch (error) {
      console.warn('Failed to calculate data size:', error);
      return 'Unable to calculate size';
    }
  }

  /**
   * Retrieves performance statistics.
   * @returns {object} - Performance statistics.
   */
  getPerformanceStats() {
    return {
      averageLoadTime: this.calculateAverage(this.performance.loadTimes),
      averageProcessingTime: this.calculateAverage(this.performance.processingTimes),
      averageNetworkTime: this.calculateAverage(this.performance.networkTimes),
      totalRequests: this.requests.size,
      totalErrors: this.errors.size,
      errorRate: this.errors.size / this.requests.size,
    };
  }

  /**
   * Calculates the average duration from an array of time entries.
   * @param {Array} times - Array of time entries.
   * @returns {number} - Average duration.
   */
  calculateAverage(times) {
    if (!times.length) return 0;
    return times.reduce((sum, time) => sum + time.duration, 0) / times.length;
  }

  /**
   * Resets all monitoring data.
   */
  reset() {
    this.requests.clear();
    this.errors.clear();
    this.performance = {
      loadTimes: [],
      processingTimes: [],
      networkTimes: [],
    };
  }
}

export const dataLoadingMonitor = new DataLoadingMonitor();

/**
 * Monitoring wrapper for fetch operations.
 * Handles fetching data with monitoring and error logging.
 * @param {string} url - URL to fetch.
 * @param {object} options - Fetch options.
 * @returns {*} - Parsed data from the response.
 */
export const monitoredFetch = async (url, options = {}) => {
  const requestId = `fetch-${Date.now()}`;
  dataLoadingMonitor.startRequest(requestId, 'fetch');

  try {
    const startTime = performance.now();
    const response = await fetch(url, options);
    const networkTime = performance.now() - startTime;

    dataLoadingMonitor.performance.networkTimes.push({
      type: 'fetch',
      duration: networkTime,
      url,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (
      contentType &&
      (contentType.includes('application/json') ||
        contentType.includes('application/geo+json'))
    ) {
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`JSON parsing error for ${url}:`, parseError);
        dataLoadingMonitor.logError(requestId, parseError);
        throw parseError;
      }
    } else if (contentType && contentType.includes('text/csv')) {
      const text = await response.text();
      try {
        const parseResult = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        if (parseResult.errors.length > 0) {
          console.warn(`CSV parsing errors for ${url}:`, parseResult.errors);
          // Optionally, handle parseResult.errors
        }
        data = parseResult.data;
      } catch (parseError) {
        console.error(`CSV parsing error for ${url}:`, parseError);
        dataLoadingMonitor.logError(requestId, parseError);
        throw parseError;
      }
    } else {
      // Handle other content types if necessary
      data = await response.text();
      console.warn(`Unsupported content-type for ${url}: ${contentType}`);
    }

    dataLoadingMonitor.completeRequest(requestId, data);
    return data;
  } catch (error) {
    dataLoadingMonitor.logError(requestId, error);
    throw error;
  }
};

/**
 * Monitoring wrapper for data processing operations.
 * @param {Function} operation - The data processing function.
 * @param {*} data - Data to process.
 * @param {object} options - Additional options.
 * @returns {*} - Result of the processing operation.
 */
export const monitoredProcess = async (operation, data, options = {}) => {
  const processId = `process-${Date.now()}`;
  dataLoadingMonitor.startRequest(processId, 'process');

  try {
    const startTime = performance.now();
    const result = await operation(data);
    const processingTime = performance.now() - startTime;

    dataLoadingMonitor.performance.processingTimes.push({
      type: options.type || 'unknown',
      duration: processingTime,
      dataSize: dataLoadingMonitor.getDataSize(data),
    });

    dataLoadingMonitor.completeRequest(processId, result);
    return result;
  } catch (error) {
    dataLoadingMonitor.logError(processId, error);
    throw error;
  }
};
