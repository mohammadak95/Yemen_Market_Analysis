// src/utils/dataPrefetcher.js

export class DataPrefetcher {
    constructor() {
      this.cache = new Map();
      this.loading = new Map();
      this.worker = new Worker(
        new URL('../workers/dataProcessor.worker.js', import.meta.url)
      );
    }
  
    async prefetch(key, dataPromise, processor) {
      if (this.cache.has(key)) return this.cache.get(key);
      if (this.loading.has(key)) return this.loading.get(key);
  
      const promise = dataPromise
        .then(async (data) => {
          if (processor) {
            return new Promise((resolve) => {
              this.worker.onmessage = (event) => {
                const processed = event.data;
                this.cache.set(key, processed);
                this.loading.delete(key);
                resolve(processed);
              };
              this.worker.postMessage({ type: processor, data });
            });
          }
          this.cache.set(key, data);
          this.loading.delete(key);
          return data;
        })
        .catch((error) => {
          this.loading.delete(key);
          throw error;
        });
  
      this.loading.set(key, promise);
      return promise;
    }
  
    get(key) {
      return this.cache.get(key);
    }
  
    clear() {
      this.cache.clear();
      this.loading.clear();
      this.worker.terminate();
    }
  }