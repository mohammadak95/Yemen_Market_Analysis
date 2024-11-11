// src/workers/enhancedWorkerSystem.js

import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'eventemitter3';

// Define message types
export const WorkerMessageTypes = {
  PROCESS_SPATIAL: 'PROCESS_SPATIAL',
  CALCULATE_VOLATILITY: 'CALCULATE_VOLATILITY',
  PROCESS_GEOJSON: 'PROCESS_GEOJSON',
  PROCESS_FLOW_DATA: 'PROCESS_FLOW_DATA',
  PROCESS_CLUSTERS: 'PROCESS_CLUSTERS',
  PROCESS_SHOCKS: 'PROCESS_SHOCKS',
  PROCESS_TIME_SERIES: 'PROCESS_TIME_SERIES',
  ERROR: 'ERROR',
  PROGRESS: 'PROGRESS',
  COMPLETE: 'COMPLETE'
};

// Constants for worker operations
const WORKER_CONSTANTS = {
  CHUNK_SIZE: 1000,
  CACHE_SIZE_LIMIT: 1000,
  THRESHOLDS: {
    VOLATILITY: 0.05,
    PRICE_CHANGE: 0.15,
    MIN_DATA_POINTS: 3,
    MAX_OUTLIER_STDDEV: 3,
    MIN_CLUSTER_SIZE: 2,
    NEIGHBOR_THRESHOLD_KM: 200
  }
};

// Singleton instance handling
let instance = null;

class WorkerManager extends EventEmitter {
  constructor() {
    if (instance) return instance;
    super();
    this.workers = [];
    this.taskQueue = [];
    this.maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 4);
    this.isInitialized = false;
    this.workerURL = null;
    this.initializationPromise = null;
    instance = this;
    return instance;
  }

  async initialize() {
    if (this.initializationPromise) return this.initializationPromise;
    if (this.isInitialized) return Promise.resolve();

    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        this.initializeWorkerPool();
        this.isInitialized = true;
        console.log('WorkerManager initialized.');
        resolve();
      } catch (error) {
        console.error('Failed to initialize WorkerManager:', error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  initializeWorkerPool() {
    // This is where we integrate the optimized worker code
    const workerCode = `
      // Constants from optimized worker
      const CHUNK_SIZE = ${WORKER_CONSTANTS.CHUNK_SIZE};
      const CACHE_SIZE_LIMIT = ${WORKER_CONSTANTS.CACHE_SIZE_LIMIT};
      const THRESHOLDS = ${JSON.stringify(WORKER_CONSTANTS.THRESHOLDS)};

      // Cache for computational results
      const computationCache = new Map();
      const coordinateCache = new Map();

      // Helper function to report progress
      function reportProgress(progress) {
        self.postMessage({
          type: 'PROGRESS',
          data: { progress }
        });
      }

      // Process data in chunks
      function processInChunks(data, processor) {
        const results = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          results.push(...processor(chunk));
          
          const progress = Math.min(100, Math.round((i + CHUNK_SIZE) * 100 / data.length));
          reportProgress(progress);
        }
        return results;
      }

      // Memoization helper
      function memoize(key, computation) {
        if (computationCache.has(key)) {
          return computationCache.get(key);
        }
        const result = computation();
        computationCache.set(key, result);

        if (computationCache.size > 50) {
          const firstKey = computationCache.keys().next().value;
          computationCache.delete(firstKey);
        }

        return result;
      }

      // Statistical functions
      function calculateMean(values) {
        if (!values?.length) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      }

      function calculateStandardDeviation(values) {
        if (!values?.length) return 0;
        const mean = calculateMean(values);
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = calculateMean(squaredDiffs);
        return Math.sqrt(variance);
      }

      function removeOutliers(values) {
        if (!values?.length) return [];
        const mean = calculateMean(values);
        const stdDev = calculateStandardDeviation(values);
        
        return values.filter(value => 
          Math.abs(value - mean) <= THRESHOLDS.MAX_OUTLIER_STDDEV * stdDev
        );
      }

      // Main message handler
      self.onmessage = async (event) => {
        const { type, data, taskId } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'PROCESS_SPATIAL':
              result = await processSpatialData(data);
              break;
            case 'PROCESS_CLUSTERS':
              result = processClusters(data);
              break;
            case 'PROCESS_SHOCKS':
              result = processShocks(data);
              break;
            case 'PROCESS_TIME_SERIES':
              result = await processTimeSeries(data);
              break;
            case 'CALCULATE_VOLATILITY':
              result = calculateVolatility(data);
              break;
            default:
              throw new Error(\`Unknown message type: \${type}\`);
          }
          
          self.postMessage({ type: 'COMPLETE', taskId, data: result });
        } catch (error) {
          self.postMessage({ 
            type: 'ERROR', 
            error: error.message, 
            taskId 
          });
        }
      };

      // Core processing functions
      ${this.getOptimizedProcessingFunctions()}
    `;

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

    URL.revokeObjectURL(this.workerURL);
  }

  // Helper to get optimized processing functions
  getOptimizedProcessingFunctions() {
    return `
      // Process spatial data
      async function processSpatialData({ geoData, flows, weights }) {
        let progress = 0;
        try {
          const processedFeatures = processInChunks(
            geoData.features,
            chunk => chunk.map(feature => ({
              ...feature,
              properties: {
                ...feature.properties,
                price: parseFloat(feature.properties.price) || 0,
                date: new Date(feature.properties.date).toISOString()
              }
            }))
          );

          progress = 50;
          reportProgress(progress);

          const processedFlows = flows.map(flow => ({
            ...flow,
            flow_weight: parseFloat(flow.flow_weight) || 0,
            date: new Date(flow.date).toISOString()
          }));

          const processedWeights = Object.entries(weights).reduce((acc, [region, data]) => {
            acc[region] = {
              neighbors: Array.isArray(data.neighbors) ? data.neighbors : [],
              weight: parseFloat(data.weight) || 0
            };
            return acc;
          }, {});

          progress = 100;
          reportProgress(progress);

          return {
            geoData: { ...geoData, features: processedFeatures },
            flows: processedFlows,
            weights: processedWeights
          };
        } catch (error) {
          throw error;
        }
      }

      // Process clusters
      function processClusters({ geoData, flows, weights }) {
        const clusters = [];
        const visited = new Set();

        function dfs(region, clusterMarkets) {
          if (!region || visited.has(region)) return;
          
          visited.add(region);
          clusterMarkets.add(region);

          const neighbors = weights[region]?.neighbors || [];
          neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) {
              dfs(neighbor, clusterMarkets);
            }
          });
        }

        Object.keys(weights).forEach(region => {
          if (!visited.has(region)) {
            const clusterMarkets = new Set();
            dfs(region, clusterMarkets);

            if (clusterMarkets.size >= THRESHOLDS.MIN_CLUSTER_SIZE) {
              const metrics = calculateClusterMetrics(flows, clusterMarkets);
              
              clusters.push({
                mainMarket: determineMainMarket(flows, clusterMarkets),
                connectedMarkets: Array.from(clusterMarkets),
                marketCount: clusterMarkets.size,
                ...metrics
              });
            }
          }
        });

        return clusters;
      }

      function calculateClusterMetrics(flows, clusterMarkets) {
        const relevantFlows = flows.filter(flow =>
          clusterMarkets.has(flow.source) || clusterMarkets.has(flow.target)
        );

        const totalFlow = relevantFlows.reduce((sum, flow) =>
          sum + (flow.flow_weight || 0), 0
        );

        return {
          totalFlow,
          avgFlow: clusterMarkets.size ? totalFlow / clusterMarkets.size : 0,
          flowDensity: relevantFlows.length / (clusterMarkets.size * (clusterMarkets.size - 1))
        };
      }

      function determineMainMarket(flows, clusterMarkets) {
        const marketScores = new Map();
        
        flows.forEach(flow => {
          if (clusterMarkets.has(flow.source)) {
            marketScores.set(flow.source,
              (marketScores.get(flow.source) || 0) + (flow.flow_weight || 0)
            );
          }
        });

        return Array.from(marketScores.entries())
          .sort(([, a], [, b]) => b - a)[0]?.[0] || Array.from(clusterMarkets)[0];
      }

      // Process market shocks
      function processShocks({ geoData, date }) {
        const features = geoData.features;
        const shocks = [];

        features.forEach(feature => {
          const prices = feature.properties.prices || [];
          if (prices.length < 2) return;

          const lastPrice = prices[prices.length - 1];
          const prevPrice = prices[prices.length - 2];
          const priceChange = ((lastPrice - prevPrice) / prevPrice) * 100;

          if (Math.abs(priceChange) > THRESHOLDS.PRICE_CHANGE) {
            shocks.push({
              region: feature.properties.region_id,
              date,
              type: priceChange > 0 ? 'price_surge' : 'price_drop',
              magnitude: Math.abs(priceChange / 100),
              severity: Math.abs(priceChange) > THRESHOLDS.PRICE_CHANGE * 2 ? 'high' : 'medium',
              price_change: priceChange,
              coordinates: feature.geometry.coordinates
            });
          }
        });

        return shocks;
      }

      // Process time series
      async function processTimeSeries({ features, startDate, endDate, commodity }) {
        let progress = 0;
        reportProgress(progress);

        try {
          const monthlyData = features.reduce((acc, feature) => {
            const { properties } = feature;
            if (!properties?.date || properties.commodity !== commodity) return acc;

            const date = new Date(properties.date);
            if (isNaN(date.getTime())) return acc;

            const month = date.toISOString().slice(0, 7);
            if (month < startDate || month > endDate) return acc;

            if (!acc[month]) {
              acc[month] = {
                prices: [],
                conflictIntensity: [],
                usdPrices: [],
                count: 0
              };
            }

            if (!isNaN(properties.price)) acc[month].prices.push(properties.price);
            if (!isNaN(properties.conflict_intensity)) {
              acc[month].conflictIntensity.push(properties.conflict_intensity);
            }
            if (!isNaN(properties.usdprice)) acc[month].usdPrices.push(properties.usdprice);
            
            acc[month].count++;
            return acc;
          }, {});

          progress = 50;
          reportProgress(progress);

          const result = Object.entries(monthlyData)
            .filter(([_, data]) => data.count >= THRESHOLDS.MIN_DATA_POINTS)
            .map(([month, data]) => ({
              month,
              avgPrice: calculateMean(removeOutliers(data.prices)),
              volatility: calculateVolatility(data.prices),
              avgConflictIntensity: calculateMean(data.conflictIntensity),
              avgUsdPrice: calculateMean(removeOutliers(data.usdPrices)),
              sampleSize: data.count
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

          progress = 100;
          reportProgress(progress);

          return result;
        } catch (error) {
          throw new Error(\`Time series processing error: \${error.message}\`);
        }
      }

      function calculateVolatility(prices) {
        if (!prices?.length) return 0;
        const cleanPrices = removeOutliers(prices);
        const mean = calculateMean(cleanPrices);
        const stdDev = calculateStandardDeviation(cleanPrices);
        return (stdDev / mean) * 100;
      }
    `;
  }

// Add this after the getOptimizedProcessingFunctions() method...

handleWorkerMessage(worker, event) {
  const { type, data, error, taskId } = event.data;

  try {
    switch (type) {
      case WorkerMessageTypes.ERROR: {
        const task = worker.currentTask;
        if (task) {
          task.reject(new Error(error));
          this.emit('error', { taskId, error });
          worker.currentTask = null;
        }
        break;
      }
      
      case WorkerMessageTypes.PROGRESS: {
        const task = worker.currentTask;
        if (task && task.onProgress) {
          task.onProgress(data.progress);
        }
        this.emit('progress', { taskId, progress: data.progress });
        break;
      }
      
      case WorkerMessageTypes.COMPLETE: {
        const task = worker.currentTask;
        if (task) {
          task.resolve(data);
          this.emit('complete', { taskId, data });
          worker.currentTask = null;
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error handling worker message:', error);
    this.emit('error', { taskId, error: error.message });
  } finally {
    worker.isBusy = false;
    this.processNextTask();
  }
}

handleWorkerError(worker, error) {
  console.error('Worker encountered an error:', error);
  if (worker.currentTask) {
    worker.currentTask.reject(new Error(error.message));
    this.emit('error', { taskId: worker.currentTask.taskId, error: error.message });
    worker.currentTask = null;
  }
  worker.isBusy = false;
  this.restartWorker(worker);
  this.processNextTask();
}

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
    } else {
      this.workers.push(newWorker);
    }
  } catch (error) {
    console.error('Error restarting worker:', error);
    this.emit('error', { error: error.message });
  }
}

processNextTask() {
  if (this.taskQueue.length === 0) return;

  const availableWorker = this.workers.find(worker => !worker.isBusy);
  if (!availableWorker) return;

  const nextTask = this.taskQueue.shift();
  this.executeTask(availableWorker, nextTask);
}

async processData(type, data, onProgress = null) {
  if (!this.isInitialized) {
    return Promise.reject(new Error('WorkerManager is not initialized. Call initialize() before processing tasks.'));
  }

  return new Promise((resolve, reject) => {
    const taskId = uuidv4();
    const task = { type, data, taskId, resolve, reject, onProgress };

    const availableWorker = this.workers.find(worker => !worker.isBusy);
    if (availableWorker) {
      this.executeTask(availableWorker, task);
    } else {
      this.taskQueue.push(task);
    }
  });
}

executeTask(worker, task) {
  try {
    worker.isBusy = true;
    worker.currentTask = task;
    
    const transferable = this.getTransferable(task.data);
    worker.postMessage(
      { type: task.type, data: task.data, taskId: task.taskId },
      transferable
    );
  } catch (error) {
    console.error('Error executing task:', error);
    task.reject(error);
    worker.isBusy = false;
    worker.currentTask = null;
    this.processNextTask();
  }
}

getTransferable(data) {
  const transferable = [];

  const processValue = (value) => {
    if (value instanceof ArrayBuffer) {
      transferable.push(value);
    } else if (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) {
      // Only add SharedArrayBuffer if supported in the environment
      transferable.push(value);
    } else if (ArrayBuffer.isView(value)) {
      transferable.push(value.buffer);
    }
  };

  const processObject = (obj) => {
    if (Array.isArray(obj)) {
      obj.forEach(processItem);
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(processItem);
    }
  };

  const processItem = (item) => {
    processValue(item);
    if (typeof item === 'object' && item !== null) {
      processObject(item);
    }
  };

  processItem(data);
  return transferable;
}


terminate() {
  try {
    this.workers.forEach(worker => {
      if (worker.currentTask) {
        worker.currentTask.reject(new Error('Worker terminated'));
      }
      worker.terminate();
    });
    
    this.taskQueue.forEach(task => {
      task.reject(new Error('Worker system terminated'));
    });

    this.workers = [];
    this.taskQueue = [];
    this.isInitialized = false;
    
    if (this.workerURL) {
      URL.revokeObjectURL(this.workerURL);
      this.workerURL = null;
    }

    console.log('WorkerManager terminated and cleaned up.');
  } catch (error) {
    console.error('Error during worker system termination:', error);
  }
}
}

// React hook implementation
export const useWorkerManager = () => {
const initialize = useCallback(async () => {
  try {
    if (!workerManager.isInitialized) {
      await workerManager.initialize();
    }
    return true;
  } catch (error) {
    console.error('Worker initialization failed:', error);
    throw error;
  }
}, []);

const processGeoJSON = useCallback(async (data, onProgress) => {
  await initialize();
  return workerManager.processData(WorkerMessageTypes.PROCESS_GEOJSON, data, onProgress);
}, [initialize]);

const processFlowData = useCallback(async (data, onProgress) => {
  await initialize();
  return workerManager.processData(WorkerMessageTypes.PROCESS_FLOW_DATA, data, onProgress);
}, [initialize]);

const processSpatialData = useCallback(async (data, onProgress) => {
  await initialize();
  return workerManager.processData(WorkerMessageTypes.PROCESS_SPATIAL, data, onProgress);
}, [initialize]);

const processClusters = useCallback(async (data, onProgress) => {
  await initialize();
  return workerManager.processData(WorkerMessageTypes.PROCESS_CLUSTERS, data, onProgress);
}, [initialize]);

const processShocks = useCallback(async (data, onProgress) => {
  await initialize();
  return workerManager.processData(WorkerMessageTypes.PROCESS_SHOCKS, data, onProgress);
}, [initialize]);

const processTimeSeries = useCallback(async (data, onProgress) => {
  await initialize();
  return workerManager.processData(WorkerMessageTypes.PROCESS_TIME_SERIES, data, onProgress);
}, [initialize]);

const subscribeToProgress = useCallback((callback) => {
  workerManager.on('progress', ({ taskId, progress }) => callback(taskId, progress));
  return () => workerManager.off('progress', callback);
}, []);

const subscribeToCompletion = useCallback((callback) => {
  workerManager.on('complete', ({ taskId, data }) => callback(taskId, data));
  return () => workerManager.off('complete', callback);
}, []);

const subscribeToError = useCallback((callback) => {
  workerManager.on('error', ({ taskId, error }) => callback(taskId, error));
  return () => workerManager.off('error', callback);
}, []);

return {
  initialize,
  processGeoJSON,
  processFlowData,
  processSpatialData,
  processClusters,
  processShocks,
  processTimeSeries,
  subscribeToProgress,
  subscribeToCompletion,
  subscribeToError,
  isInitialized: () => workerManager.isInitialized,
  terminate: () => workerManager.terminate()
};
};

// Export the worker manager instance and initialization function
export const workerManager = new WorkerManager();
export const initializeWorkerManager = async () => {
if (!workerManager.isInitialized) {
  await workerManager.initialize();
}
};