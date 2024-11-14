// src/utils/dataMonitoring.js

import { backgroundMonitor } from './backgroundMonitor';
import Papa from 'papaparse';

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

  startRequest(id, type) {
    if (typeof id !== 'string') {
      throw new Error('Request ID must be a string');
    }

    const request = {
      id,
      type,
      startTime: performance.now(),
      status: 'pending',
      events: [],
    };
    
    this.requests.set(id, request);
    this.logEvent(id, 'started', { type });

    return id;
  }

  completeRequest(id, data) {
    const request = this.requests.get(id);
    if (!request) {
      console.warn(`No active request found for ID: ${id}`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - request.startTime;

    request.status = 'completed';
    request.endTime = endTime;
    request.duration = duration;

    this.performance.loadTimes.push({
      type: request.type,
      duration,
      timestamp: new Date().toISOString(),
      dataSize: this.getDataSize(data)
    });

    this.logEvent(id, 'completed', {
      duration,
      dataSize: this.getDataSize(data)
    });

    backgroundMonitor.logMetric('data-load-complete', {
      requestId: id,
      type: request.type,
      duration,
      dataSize: this.getDataSize(data),
      timestamp: new Date().toISOString()
    });
  }

  logEvent(id, eventType, details = {}) {
    const request = this.requests.get(id);
    if (request) {
      const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...details
      };
      request.events.push(event);
      
      console.group(`Data Request Event: ${id}`);
      console.log('Type:', eventType);
      console.log('Details:', details);
      console.log('Timestamp:', event.timestamp);
      console.groupEnd();
    }
  }

  logError(id, error) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.errors.set(id, errorDetails);
    this.logEvent(id, 'error', errorDetails);

    console.error(`Data Request Error: ${id}`, error);
    
    backgroundMonitor.logError('data-load-error', {
      requestId: id,
      ...errorDetails
    });
  }

  getDataSize(data) {
    try {
      if (!data) return '0 KB';
      const jsonData = JSON.stringify(data);
      const size = new Blob([jsonData]).size;
      return `${(size / 1024).toFixed(2)} KB`;
    } catch (error) {
      console.warn('Failed to calculate data size:', error);
      return 'Unable to calculate size';
    }
  }

  getRequestDetails(id) {
    const request = this.requests.get(id);
    if (!request) return null;

    return {
      ...request,
      error: this.errors.get(id),
      duration: request.endTime ? request.endTime - request.startTime : null
    };
  }

  getPerformanceStats() {
    return {
      averageLoadTime: this.calculateAverage(this.performance.loadTimes),
      averageProcessingTime: this.calculateAverage(this.performance.processingTimes),
      averageNetworkTime: this.calculateAverage(this.performance.networkTimes),
      totalRequests: this.requests.size,
      totalErrors: this.errors.size,
      errorRate: this.calculateErrorRate(),
      requestsByType: this.groupRequestsByType()
    };
  }

  calculateErrorRate() {
    const total = this.requests.size;
    return total ? (this.errors.size / total) : 0;
  }

  groupRequestsByType() {
    const groups = {};
    this.requests.forEach(request => {
      groups[request.type] = (groups[request.type] || 0) + 1;
    });
    return groups;
  }

  calculateAverage(times) {
    if (!times.length) return 0;
    return times.reduce((sum, time) => sum + time.duration, 0) / times.length;
  }

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
        }
        data = parseResult.data;
      } catch (parseError) {
        console.error(`CSV parsing error for ${url}:`, parseError);
        dataLoadingMonitor.logError(requestId, parseError);
        throw parseError;
      }
    } else {
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

export const monitorPrecomputedData = {
  startLoad: (commodity) => {
    return dataLoadingMonitor.startRequest(
      'load-precomputed',
      { commodity }
    );
  },
  
  completeLoad: (requestId, data) => {
    dataLoadingMonitor.completeRequest(requestId, {
      size: new Blob([JSON.stringify(data)]).size,
      commodity: data.metadata?.commodity,
      timestamp: new Date().toISOString()
    });
  }
};