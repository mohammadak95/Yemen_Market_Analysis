// src/utils/workerPool.js

import { backgroundMonitor } from './backgroundMonitor';

class WorkerPool {
  constructor() {
    this.maxWorkers = Math.min(navigator.hardwareConcurrency - 1, 4);
    this.workers = new Map();
    this.taskQueue = [];
    this.processing = new Set();
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0
    };
  }

  async processTask(type, data, options = {}) {
    const metric = backgroundMonitor.startMetric('worker-task', { type });
    const startTime = performance.now();

    try {
      // Get available worker
      const worker = await this.getWorker();
      const taskId = this._generateTaskId();
      
      const result = await new Promise((resolve, reject) => {
        // Set task timeout
        const timeoutId = setTimeout(() => {
          this.handleTaskFailure(taskId, worker, 'Task timeout');
          reject(new Error('Task timeout'));
        }, options.timeout || 30000);

        // Set up message handler
        worker.onmessage = (event) => {
          clearTimeout(timeoutId);
          this.stats.completedTasks++;
          this.updateAverageTime(performance.now() - startTime);
          resolve(event.data);
        };

        // Set up error handler
        worker.onerror = (error) => {
          clearTimeout(timeoutId);
          this.handleTaskFailure(taskId, worker, error);
          reject(error);
        };

        // Track task
        this.processing.add(taskId);
        this.stats.totalTasks++;

        // Send task to worker
        worker.postMessage({ type, data, taskId });
      });

      this.releaseWorker(worker);
      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      this.stats.failedTasks++;
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  async getWorker() {
    // Reuse available worker
    for (const [worker, busy] of this.workers.entries()) {
      if (!busy) {
        this.workers.set(worker, true);
        return worker;
      }
    }

    // Create new worker if under limit
    if (this.workers.size < this.maxWorkers) {
      const worker = new Worker(new URL('../workers/dataWorker.js', import.meta.url));
      this.workers.set(worker, true);
      return worker;
    }

    // Wait for available worker
    return new Promise(resolve => {
      this.taskQueue.push(resolve);
    });
  }

  releaseWorker(worker) {
    this.workers.set(worker, false);
    
    // Process next queued task
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift();
      this.workers.set(worker, true);
      nextTask(worker);
    }
  }

  handleTaskFailure(taskId, worker, error) {
    this.processing.delete(taskId);
    this.releaseWorker(worker);
    this.stats.failedTasks++;
    
    backgroundMonitor.logError('worker-task-failure', {
      taskId,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
  }

  updateAverageTime(processingTime) {
    this.stats.averageProcessingTime = (
      (this.stats.averageProcessingTime * (this.stats.completedTasks - 1) + 
       processingTime) / this.stats.completedTasks
    );
  }

  _generateTaskId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      ...this.stats,
      activeWorkers: Array.from(this.workers.values()).filter(Boolean).length,
      totalWorkers: this.workers.size,
      queuedTasks: this.taskQueue.length,
      processingTasks: this.processing.size
    };
  }

  terminate() {
    this.workers.forEach((_, worker) => worker.terminate());
    this.workers.clear();
    this.taskQueue = [];
    this.processing.clear();
    
    backgroundMonitor.logMetric('worker-pool-terminated', {
      timestamp: Date.now(),
      stats: this.getStats()
    });
  }
}

// Create singleton instance
export const workerPool = new WorkerPool();

// Export task types
export const TaskTypes = {
  PROCESS_SPATIAL: 'PROCESS_SPATIAL',
  PROCESS_FLOW: 'PROCESS_FLOW',
  PROCESS_CLUSTERS: 'PROCESS_CLUSTERS',
  PROCESS_SHOCKS: 'PROCESS_SHOCKS',
  PROCESS_TIME_SERIES: 'PROCESS_TIME_SERIES'
};