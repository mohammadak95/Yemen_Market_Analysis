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

  async processData(type, data, options) {
    const { worker, id } = await this.getWorker();
    return new Promise((resolve, reject) => {
      const handleMessage = (event) => {
        if (event.data.type === 'success') {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error));
        }
        worker.removeEventListener('message', handleMessage);
        this.taskQueue.delete(id);
      };

      worker.addEventListener('message', handleMessage);
      this.taskQueue.set(id, { type, data, options });
      worker.postMessage({ type, data, options });
    });
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