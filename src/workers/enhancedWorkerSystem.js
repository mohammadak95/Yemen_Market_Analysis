// src/workers/enhancedWorkerSystem.js

/**
 * Enhanced worker system with centralized management, better error handling,
 * and progress tracking.
 */

// Message types for worker communication
export const WorkerMessageTypes = {
  PROCESS_SPATIAL: 'PROCESS_SPATIAL',
  PROCESS_GEOJSON: 'PROCESS_GEOJSON',
  PROCESS_FLOW_DATA: 'PROCESS_FLOW_DATA',
  GENERATE_CSV: 'GENERATE_CSV',
  CALCULATE_STATISTICS: 'CALCULATE_STATISTICS',
  ERROR: 'ERROR',
  PROGRESS: 'PROGRESS'
};

/**
 * Worker Manager class for handling worker lifecycle and communication
 */
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.taskQueue = [];
    this.activeWorkers = 0;
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.setupMainWorker();
  }

  /**
   * Initialize the worker manager
   */
  async initialize() {
    // Perform any necessary setup or initialization tasks here
    console.log('WorkerManager initialized.');
  }

  /**
   * Sets up the main spatial analysis worker
   */
  setupMainWorker() {
    const workerCode = `
      // Worker utilities
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

      // Main message handler
      self.onmessage = async (event) => {
        const { type, data, taskId } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'PROCESS_SPATIAL':
              result = await processSpatialData(data);
              break;
            case 'PROCESS_GEOJSON':
              result = processGeoJSON(data);
              break;
            case 'PROCESS_FLOW_DATA':
              result = processFlowData(data);
              break;
            case 'GENERATE_CSV':
              result = generateCSV(data);
              break;
            case 'CALCULATE_STATISTICS':
              result = calculateStatistics(data);
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

      // Data processing functions
      async function processSpatialData(data) {
        const { geoData, flows, weights } = data;
        let progress = 0;
        
        try {
          // Process GeoJSON features
          const processedFeatures = processInChunks(
            geoData.features,
            (chunk) => chunk.map(processFeature)
          );
          progress = 33;
          reportProgress(progress);

          // Process flow data
          const processedFlows = processInChunks(
            flows,
            (chunk) => chunk.map(processFlow)
          );
          progress = 66;
          reportProgress(progress);

          // Process weights
          const processedWeights = processWeights(weights);
          progress = 100;
          reportProgress(progress);

          return {
            geoData: { ...geoData, features: processedFeatures },
            flows: processedFlows,
            weights: processedWeights
          };
        } catch (error) {
          console.error('Error in processSpatialData:', error);
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
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    try {
      const worker = new Worker(workerUrl);
      this.workers.set('main', worker);
      
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.handleWorkerError('main', error);
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
    } finally {
      URL.revokeObjectURL(workerUrl);
    }
  }

  /**
   * Processes data using available workers
   */
  async processData(type, data) {
    return new Promise((resolve, reject) => {
      const taskId = Date.now().toString();
      const task = { type, data, taskId, resolve, reject };

      if (this.activeWorkers < this.maxWorkers) {
        this.executeTask(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Executes a task using an available worker
   */
  executeTask(task) {
    const worker = this.workers.get('main');
    if (!worker) {
      task.reject(new Error('No worker available'));
      return;
    }

    this.activeWorkers++;

    const messageHandler = (event) => {
      const { type, data, error, taskId } = event.data;

      if (taskId !== task.taskId) return;

      if (type === 'ERROR') {
        task.reject(new Error(error));
      } else if (type === 'PROGRESS') {
        // Handle progress updates
        this.handleProgress(task.taskId, data.progress);
      } else {
        task.resolve(data);
      }

      worker.removeEventListener('message', messageHandler);
      this.activeWorkers--;

      // Process next task in queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this.executeTask(nextTask);
      }
    };

    worker.addEventListener('message', messageHandler);
    worker.postMessage({ 
      type: task.type, 
      data: task.data, 
      taskId: task.taskId 
    });
  }

  /**
   * Handles worker errors
   */
  handleWorkerError(workerId, error) {
    console.error(`Worker ${workerId} error:`, error);
    // Implement error recovery logic here
  }

  /**
   * Handles progress updates
   */
  handleProgress(taskId, progress) {
    // Implement progress tracking logic here
    console.log(`Task ${taskId} progress: ${progress}%`);
  }

  /**
   * Terminates all workers and cleans up
   */
  terminate() {
    for (const [id, worker] of this.workers) {
      worker.terminate();
      this.workers.delete(id);
    }
    this.taskQueue = [];
    this.activeWorkers = 0;
  }
}

// Create and export singleton instance
export const workerManager = new WorkerManager();

/**
 * Hook for using the worker manager
 */
export const useWorkerManager = () => {
  const processGeoJSON = async (data) => {
    return workerManager.processData(WorkerMessageTypes.PROCESS_GEOJSON, data);
  };

  const processFlowData = async (data) => {
    return workerManager.processData(WorkerMessageTypes.PROCESS_FLOW_DATA, data);
  };

  const processSpatialData = async (data) => {
    return workerManager.processData(WorkerMessageTypes.PROCESS_SPATIAL, data);
  };

  const generateCSV = async (data) => {
    return workerManager.processData(WorkerMessageTypes.GENERATE_CSV, data);
  };

  const calculateStatistics = async (data) => {
    return workerManager.processData(WorkerMessageTypes.CALCULATE_STATISTICS, data);
  };

  return {
    processGeoJSON,
    processFlowData,
    processSpatialData,
    generateCSV,
    calculateStatistics
  };
};