// src/workers/enhancedWorkerSystem.js

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'eventemitter3';

/**
 * Message types for worker communication
 */
export const WorkerMessageTypes = {
  // Analysis types
  PROCESS_SPATIAL: 'PROCESS_SPATIAL',
  PROCESS_GEOJSON: 'PROCESS_GEOJSON',
  PROCESS_FLOW_DATA: 'PROCESS_FLOW_DATA',
  CALCULATE_STATISTICS: 'CALCULATE_STATISTICS',
  PROCESS_CLUSTERS: 'PROCESS_CLUSTERS',
  PROCESS_SHOCKS: 'PROCESS_SHOCKS',
  PROCESS_TIME_SERIES: 'PROCESS_TIME_SERIES',
  
  // Status types
  ERROR: 'ERROR',
  PROGRESS: 'PROGRESS',
  COMPLETE: 'COMPLETE'
};

/**
 * Enhanced worker system with centralized management, better error handling,
 * progress tracking, and support for transferable objects.
 */
class EnhancedWorkerSystem extends EventEmitter {
  constructor() {
    super();
    this.workers = [];
    this.taskQueue = [];
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.isInitialized = false;
    this.workerURL = null;
    this.initializationPromise = null;
    this.computationCache = new Map();
    this.metrics = {
      tasksDone: 0,
      errors: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    };
  }

  /**
   * Initialize the worker system
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      return Promise.resolve();
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        this.initializeWorkerPool();
        this.isInitialized = true;
        console.log(`Enhanced worker system initialized with ${this.maxWorkers} workers`);
        resolve();
      } catch (error) {
        console.error('Failed to initialize worker system:', error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  /**
   * Initialize the worker pool with optimized processing code
   */
  initializeWorkerPool() {
    const workerCode = this.generateWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.workerURL = URL.createObjectURL(blob);

    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(this.workerURL);
        worker.isBusy = false;
        worker.currentTask = null;
        worker.onmessage = this.handleWorkerMessage.bind(this, worker);
        worker.onerror = this.handleWorkerError.bind(this, worker);
        this.workers.push(worker);
      } catch (error) {
        console.error(`Failed to create worker ${i}:`, error);
      }
    }
  }

  /**
   * Generate the worker code with all processing functions
   */
  generateWorkerCode() {
    return `
      const CHUNK_SIZE = 1000; // Adjustable chunk size for processing
      const computationCache = new Map();

      // Helper function to process data in chunks
      const processInChunks = (data, processor) => {
        const results = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          results.push(...processor(chunk));

          // Report progress
          const progress = Math.min(100, Math.round((i + CHUNK_SIZE) * 100 / data.length));
          self.postMessage({ type: 'PROGRESS', data: { progress } });
        }
        return results;
      };

      // Memoization helper
      const memoize = (key, computation) => {
        if (computationCache.has(key)) {
          return computationCache.get(key);
        }
        const result = computation();
        computationCache.set(key, result);

        // Basic cache management
        if (computationCache.size > 50) {
          const firstKey = computationCache.keys().next().value;
          computationCache.delete(firstKey);
        }

        return result;
      };

      self.onmessage = async ({ data: { type, payload, taskId } }) => {
        try {
          let result;
          const startTime = performance.now();

          switch (type) {
            case 'PROCESS_SPATIAL': {
              const cacheKey = \`spatial_\${payload.selectedCommodity}_\${payload.selectedDate}\`;
              result = await memoize(cacheKey, () => processSpatialData(payload));
              break;
            }

            case 'PROCESS_CLUSTERS': {
              const cacheKey = \`clusters_\${JSON.stringify(payload.bounds)}_\${payload.date}\`;
              result = await memoize(cacheKey, () => computeClusters(payload));
              break;
            }

            case 'PROCESS_SHOCKS': {
              const cacheKey = \`shocks_\${payload.date}_\${payload.threshold}\`;
              result = await memoize(cacheKey, () => detectMarketShocks(payload));
              break;
            }

            case 'PROCESS_TIME_SERIES': {
              const cacheKey = \`timeseries_\${payload.commodity}_\${payload.startDate}_\${payload.endDate}\`;
              result = await memoize(cacheKey, () => processTimeSeries(payload));
              break;
            }

            default:
              throw new Error(\`Unknown task type: \${type}\`);
          }

          const duration = performance.now() - startTime;
          
          self.postMessage({ 
            type: 'COMPLETE', 
            taskId, 
            data: result,
            metrics: {
              duration,
              cacheHit: computationCache.has(taskId)
            }
          });
        } catch (error) {
          self.postMessage({ type: 'ERROR', taskId, error: error.message });
        }
      };

      // Spatial data processing function
      async function processSpatialData({ geoData, flows, weights, selectedCommodity, selectedDate }) {
        return processInChunks(geoData, (chunk) => {
          // Processing logic for spatial data
          return chunk.map(feature => ({
            ...feature,
            processed: true
          }));
        });
      }

      // Market clusters computation
      async function computeClusters({ features, weights, flows }) {
        const clusters = new Map();
        
        return processInChunks(features, (chunk) => {
          return chunk.map(feature => {
            const regionId = feature.properties.region_id;
            if (clusters.has(regionId)) return clusters.get(regionId);

            const cluster = {
              mainMarket: regionId,
              connectedMarkets: new Set(),
              flowMetrics: calculateFlowMetrics(regionId, flows),
              spatialWeight: weights[regionId]?.weight || 0
            };

            if (weights[regionId]?.neighbors) {
              weights[regionId].neighbors.forEach(neighbor =>
                cluster.connectedMarkets.add(neighbor)
              );
            }

            clusters.set(regionId, cluster);
            return cluster;
          });
        });
      }

      // Market shock detection
      async function detectMarketShocks({ features, date, threshold }) {
        const baseline = calculateBaseline(features);
        const shocks = [];

        return processInChunks(features, (chunk) => {
          chunk.forEach(feature => {
            if (feature.properties.date !== date) return;

            const deviation = Math.abs(
              (feature.properties.price - baseline.mean) / baseline.stdDev
            );

            if (deviation > threshold) {
              shocks.push({
                region: feature.properties.region_id,
                magnitude: deviation,
                type: feature.properties.price > baseline.mean ? 'surge' : 'drop',
                severity: deviation > threshold * 2 ? 'high' : 'medium'
              });
            }
          });
          return shocks;
        });
      }

      // Time series processing
      async function processTimeSeries({ data, options = {} }) {
        const { 
          smoothing = true, 
          outlierRemoval = true 
        } = options;

        let processed = [...data];

        if (outlierRemoval) {
          processed = removeOutliers(processed);
        }

        if (smoothing) {
          processed = applySmoothing(processed);
        }

        return processed;
      }

      // Utility functions
      function calculateBaseline(features) {
        const prices = features.map(f => f.properties.price).filter(Boolean);
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const stdDev = Math.sqrt(
          prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length
        );
        return { mean, stdDev };
      }

      function calculateFlowMetrics(regionId, flows) {
        const relevantFlows = flows.filter(f =>
          f.source === regionId || f.target === regionId
        );

        return {
          totalFlow: relevantFlows.reduce((sum, f) => sum + (f.value || 0), 0),
          flowCount: relevantFlows.length,
          avgFlow: relevantFlows.length ?
            relevantFlows.reduce((sum, f) => sum + (f.value || 0), 0) / relevantFlows.length :
            0
        };
      }

      function removeOutliers(data, threshold = 2) {
        const values = data.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
        );

        return data.filter(d => 
          Math.abs((d.value - mean) / stdDev) <= threshold
        );
      }

      function applySmoothing(data, windowSize = 3) {
        return data.map((point, index) => {
          const start = Math.max(0, index - Math.floor(windowSize / 2));
          const end = Math.min(data.length, index + Math.floor(windowSize / 2) + 1);
          const window = data.slice(start, end);
          const smoothedValue = window.reduce((sum, p) => sum + p.value, 0) / window.length;
          return { ...point, value: smoothedValue };
        });
      }
    `;
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(worker, event) {
    const { type, taskId, data, error, metrics } = event.data;
    const task = worker.currentTask;

    if (!task) return;

    switch (type) {
      case WorkerMessageTypes.ERROR:
        this.handleError(task, error);
        this.metrics.errors++;
        break;

      case WorkerMessageTypes.PROGRESS:
        this.handleProgress(task, data.progress);
        break;

      case WorkerMessageTypes.COMPLETE:
        this.handleCompletion(task, data, metrics);
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
    }

    worker.currentTask = null;
    worker.isBusy = false;
    this.processNextTask();
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(worker, error) {
    console.error('Worker error:', error);
    if (worker.currentTask) {
      this.handleError(worker.currentTask, error.message);
      worker.currentTask = null;
    }
    worker.isBusy = false;
    this.restartWorker(worker);
    this.processNextTask();
  }

  /**
   * Process data using the worker system
   */
  async processData(type, payload, onProgress) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const taskId = uuidv4();
      const task = {
        id: taskId,
        type,
        payload,
        onProgress,
        resolve,
        reject,
        startTime: performance.now()
      };

      const availableWorker = this.workers.find(w => !w.isBusy);
      if (availableWorker) {
        this.executeTask(availableWorker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Execute a task on a worker
   */
  executeTask(worker, task) {
    worker.isBusy = true;
    worker.currentTask = task;
    
    worker.postMessage({
      type: task.type,
      payload: task.payload,
      taskId: task.id
    });
  }

  /**
   * Process the next task in the queue
   */
  processNextTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.isBusy);
    if (availableWorker) {
      const nextTask = this.taskQueue.shift();
      this.executeTask(availableWorker, nextTask);
    }
  }

  /**
   * Restart a worker
   */
  restartWorker(worker) {
    try {
      worker.terminate();
      const newWorker = new Worker(this.workerURL);
      newWorker.isBusy = false;
      newWorker.currentTask = null;
      newWorker.onmessage = this.handleWorkerMessage.bind(this, newWorker);
      newWorker.onerror = this.handleWorkerError.bind(this, newWorker);

      const index = this.workers.indexOf(worker);
      if (index !== -1) {
        this.workers[index] = newWorker;
      }
    } catch (error) {
      console.error('Error restarting worker:', error);
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Handle task error
   */
  handleError(task, error) {
    task.reject(new Error(error));
    this.emit('error', { taskId: task.id, error });
  }

  /**
   * Handle task progress
   */
  handleProgress(task, progress) {
    if (task.onProgress) {
      task.onProgress(progress);
    }
    this.emit('progress', { taskId: task.id, progress });
  }

  /**
     * Handle task completion (continued)
     */
  handleCompletion(task, result, metrics) {
    const duration = performance.now() - task.startTime;
    this.updateMetrics(duration);
    
    task.resolve(result);
    this.emit('complete', { 
      taskId: task.id,
      result,
      metrics: {
        ...metrics,
        duration
      }
    });

    this.metrics.tasksDone++;
  }

  /**
   * Update system metrics
   */
  updateMetrics(duration) {
    const totalTasks = this.metrics.tasksDone + 1;
    this.metrics.totalProcessingTime += duration;
    this.metrics.averageProcessingTime = 
      this.metrics.totalProcessingTime / totalTasks;
  }

  /**
   * Get current system metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeWorkers: this.workers.filter(w => w.isBusy).length,
      queuedTasks: this.taskQueue.length,
      cacheSize: this.computationCache.size
    };
  }

  /**
   * Clear computation cache
   */
  clearCache() {
    this.computationCache.clear();
    console.log('Computation cache cleared');
  }

  /**
   * Terminate the worker system
   */
  terminate() {
    try {
      this.workers.forEach(worker => {
        if (worker.currentTask) {
          worker.currentTask.reject(new Error('Worker system terminated'));
        }
        worker.terminate();
      });

      this.taskQueue.forEach(task => {
        task.reject(new Error('Worker system terminated'));
      });

      this.workers = [];
      this.taskQueue = [];
      this.isInitialized = false;
      this.computationCache.clear();

      if (this.workerURL) {
        URL.revokeObjectURL(this.workerURL);
        this.workerURL = null;
      }

      console.log('Worker system terminated and cleaned up');
    } catch (error) {
      console.error('Error during worker system termination:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const workerSystem = new EnhancedWorkerSystem();

// React hook for using the worker system
export const useWorkerSystem = () => {
const initialize = React.useCallback(async () => {
  try {
    if (!workerSystem.isInitialized) {
      await workerSystem.initialize();
    }
    return true;
  } catch (error) {
    console.error('Worker initialization failed:', error);
    throw error;
  }
}, []);

const processData = React.useCallback(async (type, payload, onProgress) => {
  await initialize();
  return workerSystem.processData(type, payload, onProgress);
}, [initialize]);

const subscribeToEvents = React.useCallback((eventType, callback) => {
  workerSystem.on(eventType, callback);
  return () => {
    workerSystem.off(eventType, callback);
  };
}, []);

const getMetrics = React.useCallback(() => {
  return workerSystem.getMetrics();
}, []);

const clearCache = React.useCallback(() => {
  workerSystem.clearCache();
}, []);

return {
  initialize,
  processData,
  subscribeToEvents,
  getMetrics,
  clearCache,
  isInitialized: workerSystem.isInitialized
};
};