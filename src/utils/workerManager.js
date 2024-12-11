// Worker Manager for handling Web Worker communication
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.taskQueue = new Map();
    this.activeWorkers = 0;
    this.maxWorkers = navigator.hardwareConcurrency || 4;
  }

  async getWorker() {
    // Reuse existing idle worker if available
    for (const [id, worker] of this.workers.entries()) {
      if (!this.taskQueue.has(id)) {
        return { worker, id };
      }
    }

    // Create new worker if under limit
    if (this.workers.size < this.maxWorkers) {
      const id = this.workers.size;
      const worker = new Worker(new URL('../workers/spatialWorker.js', import.meta.url), {
        type: 'module'
      });
      this.workers.set(id, worker);
      return { worker, id };
    }

    // Wait for next available worker
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        for (const [id, worker] of this.workers.entries()) {
          if (!this.taskQueue.has(id)) {
            clearInterval(checkInterval);
            resolve({ worker, id });
            return;
          }
        }
      }, 100);
    });
  }

  async processData(type, data, options = {}) {
    const { worker, id } = await this.getWorker();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.taskQueue.delete(id);
        reject(new Error(`Worker task timed out: ${type}`));
      }, 30000); // 30 second timeout

      const messageHandler = (event) => {
        if (event.data.type === 'success') {
          cleanup();
          resolve(event.data.result);
        } else if (event.data.type === 'error') {
          cleanup();
          reject(new Error(event.data.error));
        }
      };

      const errorHandler = (error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.taskQueue.delete(id);
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
      };

      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      this.taskQueue.set(id, { type, startTime: Date.now() });
      worker.postMessage({ type, data, options });
    });
  }

  async processFlowData(data) {
    return this.processData('processFlowData', data);
  }

  async processTimeSeriesData(data) {
    return this.processData('processTimeSeriesData', data);
  }

  async processMarketClusters(data, options) {
    return this.processData('processMarketClusters', data, options);
  }

  terminateAll() {
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    this.workers.clear();
    this.taskQueue.clear();
  }
}

export const workerManager = new WorkerManager();
