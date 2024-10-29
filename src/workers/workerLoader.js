//src/workers/workerLoader.js

export const createWorker = () => {
  if (typeof Worker !== 'undefined') {
    const workerCode = `
      self.onmessage = async (event) => {
        const { data } = event;
        try {
          const result = await processData(data);
          self.postMessage({ success: true, data: result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };

      async function processData(data) {
        // Add your data processing logic here
        return data;
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
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
      if (event.data.success) {
        resolve(event.data.data);
      } else {
        reject(new Error(event.data.error));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage(data);
  });
};