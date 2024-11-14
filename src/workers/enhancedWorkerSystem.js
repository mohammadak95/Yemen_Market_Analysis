// src/workers/enhancedWorkerSystem.js

/**
 * Simplified worker system to process data without affecting other parts of the website.
 */

class WorkerManager {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;

    const workerCode = `
      self.onmessage = (event) => {
        const { type, data } = event.data;

        try {
          let result;
          switch (type) {
            case 'PROCESS_DATA':
              result = processData(data);
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }

          self.postMessage({ type, data: result });
        } catch (error) {
          self.postMessage({ type: 'ERROR', error: error.message });
        }
      };

      function processData(data) {
        // Implement your data processing logic here
        return data; // Return processed data
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(blob);

    this.worker = new Worker(workerURL);
    this.isInitialized = true;

    URL.revokeObjectURL(workerURL);
  }

  processData(data) {
    return new Promise((resolve, reject) => {
      this.initialize();

      this.worker.onmessage = (event) => {
        const { type, data, error } = event.data;

        if (type === 'ERROR') {
          reject(new Error(error));
        } else {
          resolve(data);
        }
      };

      this.worker.onerror = (error) => {
        reject(error);
      };

      this.worker.postMessage({ type: 'PROCESS_DATA', data });
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

export const workerManager = new WorkerManager();