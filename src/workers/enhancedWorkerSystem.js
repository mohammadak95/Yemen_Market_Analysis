// src/workers/enhancedWorkerSystem.js

/**
 * Enhanced worker system with centralized management, better error handling,
 * progress tracking using a worker pool, and support for transferable objects.
 */

import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'eventemitter3';
import { useCallback } from 'react'; // Ensure useCallback is imported

export const WorkerMessageTypes = {
  PROCESS_SPATIAL: 'PROCESS_SPATIAL',
  PROCESS_GEOJSON: 'PROCESS_GEOJSON',
  PROCESS_FLOW_DATA: 'PROCESS_FLOW_DATA',
  GENERATE_CSV: 'GENERATE_CSV',
  CALCULATE_STATISTICS: 'CALCULATE_STATISTICS',
  PROCESS_CLUSTERS: 'PROCESS_CLUSTERS',
  PROCESS_SHOCKS: 'PROCESS_SHOCKS',
  ERROR: 'ERROR',
  PROGRESS: 'PROGRESS'
};

// Singleton instance handling
let instance = null;

class WorkerManager extends EventEmitter {
  constructor() {
    if (instance) {
      return instance;
    }
    super();
    this.workers = [];
    this.taskQueue = [];
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.isInitialized = false;
    this.workerURL = null;
    this.initializationPromise = null;
    instance = this;
    return instance;
  }

  async initialize() {
    // If already initialized, return existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // If already initialized, return immediately
    if (this.isInitialized) {
      return Promise.resolve();
    }

    // Create initialization promise
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
    const workerCode = `
      const CHUNK_SIZE = 500000;

      function processInChunks(data, processor) {
        const chunks = [];
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          chunks.push(data.slice(i, i + CHUNK_SIZE));
        }
        return chunks.map(processor).flat();
      }

      function reportProgress(progress) {
        self.postMessage({
          type: 'PROGRESS',
          data: { progress }
        });
      }

      self.onmessage = async (event) => {
        const { type, data, taskId } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'PROCESS_SPATIAL':
              result = await processSpatialData(data, taskId);
              break;
            case 'PROCESS_GEOJSON':
              result = processGeoJSON(data, taskId);
              break;
            case 'PROCESS_FLOW_DATA':
              result = processFlowData(data, taskId);
              break;
            case 'GENERATE_CSV':
              result = generateCSV(data, taskId);
              break;
            case 'CALCULATE_STATISTICS':
              result = calculateStatistics(data, taskId);
              break;
            case 'PROCESS_CLUSTERS':
              result = processClusters(data, taskId);
              break;
            case 'PROCESS_SHOCKS':
              result = processShocks(data, taskId);
              break;
            default:
              throw new Error(\`Unknown message type: \${type}\`);
          }
          
          self.postMessage({ type, data: result, taskId });
        } catch (error) {
          self.postMessage({ 
            type: 'ERROR', 
            error: error.message, 
            taskId 
          });
        }
      };

      async function processSpatialData(data) {
        const { geoData, flows, weights } = data;
        let progress = 0;

        try {
          const processedFeatures = processInChunks(
            geoData.features,
            (chunk) => chunk.map(processFeature)
          );
          progress = 33;
          reportProgress(progress);

          const processedFlows = processInChunks(
            flows,
            (chunk) => chunk.map(processFlow)
          );
          progress = 66;
          reportProgress(progress);

          const processedWeights = processWeights(weights);
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

      function processFeature(feature) {
        return {
          ...feature,
          properties: {
            ...feature.properties,
            price: parseFloat(feature.properties.price) || 0,
            date: new Date(feature.properties.date).toISOString()
          }
        };
      }

      function processFlow(flow) {
        return {
          ...flow,
          flow_weight: parseFloat(flow.flow_weight) || 0,
          date: new Date(flow.date).toISOString()
        };
      }

      function processWeights(weights) {
        const processed = {};
        for (const [region, data] of Object.entries(weights)) {
          processed[region] = {
            neighbors: Array.isArray(data.neighbors) ? data.neighbors : [],
            weight: parseFloat(data.weight) || 0
          };
        }
        return processed;
      }

      function processGeoJSON(data) {
        return data; // Stub processing for example
      }

      function processFlowData(data) {
        return data; // Stub processing for example
      }

      function generateCSV(data) {
        return data; // Stub CSV generation
      }

      function calculateStatistics(data) {
        return data; // Stub statistics calculation
      }

      function processClusters(data) {
        const { geoData, flows, weights } = data;
        const clusters = [];
        geoData.features.forEach((feature, idx) => {
          clusters.push({
            mainMarket: feature.properties.region || feature.properties.region_id,
            connectedMarkets: new Set(weights[feature.properties.region_id]?.neighbors || []),
            totalFlow: flows.reduce((sum, flow) => {
              if (flow.source === feature.properties.region_id || flow.target === feature.properties.region_id) {
                return sum + flow.flow_weight;
              }
              return sum;
            }, 0),
            avgFlow: flows.length > 0 ? flows.reduce((sum, flow) => sum + flow.flow_weight, 0) / flows.length : 0,
            marketCount: weights[feature.properties.region_id]?.neighbors?.length || 1,
            lat: feature.geometry?.coordinates?.[1] || 0,
            lng: feature.geometry?.coordinates?.[0] || 0,
            color: '#FF5733' 
          });
        });
        return clusters;
      }

      function processShocks(data) {
        const { geoData, date } = data;
        const shocks = [];
        geoData.features.forEach((feature) => {
          if (Math.random() < 0.05) { 
            shocks.push({
              region: feature.properties.region || feature.properties.region_id,
              type: Math.random() > 0.5 ? 'price_surge' : 'price_drop',
              magnitude: Math.random() * 0.2,
              severity: Math.random() > 0.7 ? 'high' : 'medium',
              lat: feature.geometry?.coordinates?.[1] || 0,
              lng: feature.geometry?.coordinates?.[0] || 0,
              month: date
            });
          }
        });
        return shocks;
      }
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

  handleWorkerMessage(worker, event) {
    const { type, data, error, taskId } = event.data;

    if (type === WorkerMessageTypes.ERROR) {
      const task = worker.currentTask;
      if (task) {
        task.reject(new Error(error));
        this.emit('error', { taskId, error });
        worker.currentTask = null;
      }
    } else if (type === WorkerMessageTypes.PROGRESS) {
      const task = worker.currentTask;
      if (task && task.onProgress) {
        task.onProgress(data.progress);
      }
      this.emit('progress', { taskId, progress: data.progress });
    } else {
      const task = worker.currentTask;
      if (task) {
        task.resolve(data);
        this.emit('complete', { taskId, data });
        worker.currentTask = null;
      }
    }

    worker.isBusy = false;
    this.processNextTask();
  }

  handleWorkerError(worker, error) {
    console.error(`Worker encountered an error:`, error);
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
  }

  processNextTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(worker => !worker.isBusy);
    if (!availableWorker) return;

    const nextTask = this.taskQueue.shift();
    this.executeTask(availableWorker, nextTask);
  }

  processData(type, data, onProgress = null) {
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
    worker.isBusy = true;
    worker.currentTask = task;
    worker.postMessage({ type: task.type, data: task.data, taskId: task.taskId }, this.getTransferable(task.data));
  }

  getTransferable(data) {
    const transferable = [];
    function extractTransferable(obj) {
      if (obj instanceof ArrayBuffer) {
        transferable.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(item => extractTransferable(item));
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => extractTransferable(value));
      }
    }
    extractTransferable(data);
    return transferable;
  }

  handleProgress(taskId, progress) {
    this.emit('taskProgress', { taskId, progress });
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.isInitialized = false;
    console.log('WorkerManager terminated and cleaned up.');
  }
}

export const workerManager = new WorkerManager();

// Don't automatically initialize - let the system handle it
export const initializeWorkerManager = async () => {
  if (!workerManager.isInitialized) {
    await workerManager.initialize();
  }
};

export const useWorkerManager = () => {
  const ensureInitialized = useCallback(async () => {
    if (!workerManager.isInitialized) {
      await workerManager.initialize();
    }
  }, []);

  const processGeoJSON = useCallback(async (data, onProgress) => {
    await ensureInitialized();
    return workerManager.processData(WorkerMessageTypes.PROCESS_GEOJSON, data, onProgress);
  }, [ensureInitialized]);

  const processFlowData = useCallback(async (data, onProgress) => {
    await ensureInitialized();
    return workerManager.processData(WorkerMessageTypes.PROCESS_FLOW_DATA, data, onProgress);
  }, [ensureInitialized]);

  const processSpatialData = useCallback(async (data, onProgress) => {
    await ensureInitialized();
    return workerManager.processData(WorkerMessageTypes.PROCESS_SPATIAL, data, onProgress);
  }, [ensureInitialized]);

  const generateCSV = useCallback(async (data, onProgress) => {
    await ensureInitialized();
    return workerManager.processData(WorkerMessageTypes.GENERATE_CSV, data, onProgress);
  }, [ensureInitialized]);

  const calculateStatistics = useCallback(async (data, onProgress) => {
    await ensureInitialized();
    return workerManager.processData(WorkerMessageTypes.CALCULATE_STATISTICS, data, onProgress);
  }, [ensureInitialized]);

  const processClusters = useCallback(async (data, onProgress) => {
    await ensureInitialized();
    return workerManager.processData(WorkerMessageTypes.PROCESS_CLUSTERS, data, onProgress);
  }, [ensureInitialized]);

  const processShocks = useCallback(async (data, onProgress) => {
    await ensureInitialized();
    return workerManager.processData(WorkerMessageTypes.PROCESS_SHOCKS, data, onProgress);
  }, [ensureInitialized]);

  const subscribeToProgress = useCallback((callback) => {
    const handleProgress = ({ taskId, progress }) => {
      callback(taskId, progress);
    };
    workerManager.on('taskProgress', handleProgress);
    return () => {
      workerManager.off('taskProgress', handleProgress);
    };
  }, []);

  const subscribeToCompletion = useCallback((callback) => {
    const handleComplete = ({ taskId, data }) => {
      callback(taskId, data);
    };
    workerManager.on('complete', handleComplete);
    return () => {
      workerManager.off('complete', handleComplete);
    };
  }, []);

  const subscribeToError = useCallback((callback) => {
    const handleError = ({ taskId, error }) => {
      callback(taskId, error);
    };
    workerManager.on('error', handleError);
    return () => {
      workerManager.off('error', handleError);
    };
  }, []);

  return {
    processGeoJSON,
    processFlowData,
    processSpatialData,
    generateCSV,
    calculateStatistics,
    processClusters,
    processShocks,
    subscribeToProgress,
    subscribeToCompletion,
    subscribeToError
  };
};
