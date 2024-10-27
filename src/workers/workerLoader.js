//src/workers/workerLoader.js

export const createWorker = () => {
  if (typeof Worker !== 'undefined') {
    return new Worker(new URL('./dataProcessor.worker.js', import.meta.url));
  }
  return null;
};

export const processDataWithWorker = async (data) => {
  return new Promise((resolve, reject) => {
    const worker = createWorker();
    
    if (!worker) {
      reject(new Error('Web Workers are not supported in this environment'));
      return;
    }

    worker.onmessage = (event) => {
      worker.terminate();
      resolve(event.data);
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage(data);
  });
};