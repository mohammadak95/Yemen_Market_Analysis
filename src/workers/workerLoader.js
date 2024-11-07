// src/workers/workerLoader.js

/**
 * Creates a new Web Worker from the specified worker script.
 * @returns {Worker|null} The created Worker instance or null if unsupported.
 */
export const createWorker = () => {
  if (typeof Worker !== 'undefined') {
    try {
      // Dynamically import the worker script using the Worker constructor.
      const worker = new Worker(new URL('./dataWorker.js', import.meta.url), {
        type: 'module',
      });
      console.log('Web Worker created successfully.');
      return worker;
    } catch (error) {
      console.error('Failed to create Web Worker:', error);
      return null;
    }
  }
  console.error('Web Workers are not supported in this environment.');
  return null;
};

/**
 * Processes data using the Web Worker.
 * @param {Object} data - The data to be processed.
 * @param {string} selectedCommodity - The selected commodity for analysis.
 * @returns {Promise<Object>} A promise that resolves with the processed data or rejects with an error.
 */
export const processDataWithWorker = async (data, selectedCommodity) => {
  return new Promise((resolve, reject) => {
    const worker = createWorker();

    if (!worker) {
      reject(new Error('Web Workers are not supported in this environment'));
      return;
    }

    /**
     * Handles messages received from the worker.
     * @param {MessageEvent} event - The message event from the worker.
     */
    const handleMessage = (event) => {
      const { result, error } = event.data;
      if (error) {
        console.error('Error from worker:', error);
        reject(new Error(error));
      } else if (result) {
        resolve(result);
      } else {
        reject(new Error('Worker returned an unexpected message structure'));
      }
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
    };

    /**
     * Handles errors encountered by the worker.
     * @param {ErrorEvent} error - The error event from the worker.
     */
    const handleError = (error) => {
      console.error('Worker encountered an error:', error);
      reject(new Error(error.message));
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
    };

    // Attach event listeners
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // Dispatch the message to the worker with the required action and payload
    worker.postMessage({
      action: 'processAllData',
      payload: { data, selectedCommodity },
    });

    console.log('Message posted to worker:', {
      action: 'processAllData',
      payload: { data, selectedCommodity },
    });
  });
};