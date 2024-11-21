// workerManager.js
class WorkerManager {
    constructor() {
      this.workers = {
        spatial: null,
        timeSeries: null
      };
      this.callbacks = new Map();
    }
   
    createWorkerBlob(workerFunction) {
      const blob = new Blob(
        [`(${workerFunction.toString()})()`],
        { type: 'application/javascript' }
      );
      return URL.createObjectURL(blob);
    }
   
    initWorker(type) {
      if (!this.workers[type]) {
        const workerCode = type === 'spatial' ? this.getSpatialWorkerCode() : this.getTimeSeriesWorkerCode();
        const blobUrl = this.createWorkerBlob(workerCode);
        this.workers[type] = new Worker(blobUrl);
        
        this.workers[type].onmessage = (e) => this.handleMessage(type, e);
        this.workers[type].onerror = (e) => this.handleError(type, e);
        
        // Clean up the Blob URL
        URL.revokeObjectURL(blobUrl);
      }
      return this.workers[type];
    }
   
    getSpatialWorkerCode() {
      return () => {
        self.onmessage = async (e) => {
          const { type, payload } = e.data;
          
          const processGeoData = (data) => {
            const features = data.features || [];
            const commodities = new Set();
            
            features.forEach(feature => {
              if (feature?.properties?.commodity) {
                commodities.add(feature.properties.commodity.toLowerCase().trim());
              }
            });
          
            return {
              commodities: [...commodities].sort(),
              processedFeatures: features.map(f => ({
                ...f,
                properties: {
                  ...f.properties,
                  commodity: f.properties.commodity?.toLowerCase?.()
                }
              }))
            };
          };
   
          const processCommodityData = (data) => {
            return data.map(item => ({
              ...item,
              commodity: item.commodity?.toLowerCase?.(),
              processed: true
            }));
          };
   
          switch (type) {
            case 'PROCESS_GEO_DATA':
              try {
                const result = processGeoData(payload);
                self.postMessage({ type: 'PROCESS_COMPLETE', payload: result });
              } catch (error) {
                self.postMessage({ type: 'PROCESS_ERROR', error: error.message });
              }
              break;
   
            case 'PROCESS_COMMODITY_DATA':
              try {
                const result = processCommodityData(payload.data);
                self.postMessage({ type: 'COMMODITY_PROCESS_COMPLETE', payload: result });
              } catch (error) {
                self.postMessage({ type: 'PROCESS_ERROR', error: error.message });
              }
              break;
          }
        };
      };
    }
   
    getTimeSeriesWorkerCode() {
      return () => {
        const calculateVolatility = (prices) => {
          if (!prices?.length) return 0;
          const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
          const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
          return Math.sqrt(variance);
        };
   
        const detectSeasonality = (data) => {
          // Seasonality detection logic
          return {
            hasSeasonal: false,
            period: null,
            strength: 0
          };
        };
   
        const processTimeSeriesData = (data) => {
          return data.map(entry => {
            const prices = entry.prices || [];
            return {
              ...entry,
              volatility: calculateVolatility(prices),
              seasonal: detectSeasonality(entry),
              processed: true
            };
          });
        };
   
        const calculateVisualizationData = (data, options) => {
          // Visualization calculation logic
          return {
            processed: true,
            data: data,
            summary: {
              min: Math.min(...data.map(d => d.value || 0)),
              max: Math.max(...data.map(d => d.value || 0)),
              avg: data.reduce((a, b) => a + (b.value || 0), 0) / data.length
            }
          };
        };
   
        self.onmessage = async (e) => {
          const { type, payload } = e.data;
   
          switch (type) {
            case 'PROCESS_TIME_SERIES':
              try {
                const result = processTimeSeriesData(payload.data);
                self.postMessage({
                  type: 'TIME_SERIES_COMPLETE',
                  payload: {
                    data: result,
                    metadata: {
                      commodity: payload.commodity,
                      processedAt: new Date().toISOString()
                    }
                  }
                });
              } catch (error) {
                self.postMessage({
                  type: 'TIME_SERIES_ERROR',
                  error: error.message
                });
              }
              break;
   
            case 'CALCULATE_VISUALIZATION':
              try {
                const visualData = calculateVisualizationData(payload.data, payload.options);
                self.postMessage({
                  type: 'VISUALIZATION_COMPLETE',
                  payload: visualData
                });
              } catch (error) {
                self.postMessage({
                  type: 'VISUALIZATION_ERROR',
                  error: error.message
                });
              }
              break;
          }
        };
      };
    }
   
    handleMessage(workerType, event) {
      const { type, payload, error } = event.data;
      const callback = this.callbacks.get(`${workerType}_${type}`);
      if (callback) {
        callback(error || null, payload);
        this.callbacks.delete(`${workerType}_${type}`);
      }
    }
   
    handleError(workerType, error) {
      console.error(`Worker error (${workerType}):`, error);
    }
   
    processGeoData(data) {
      return new Promise((resolve, reject) => {
        const worker = this.initWorker('spatial');
        this.callbacks.set('spatial_PROCESS_COMPLETE', (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        worker.postMessage({ type: 'PROCESS_GEO_DATA', payload: data });
      });
    }
   
    processCommodityData(data) {
      return new Promise((resolve, reject) => {
        const worker = this.initWorker('spatial');
        this.callbacks.set('spatial_COMMODITY_PROCESS_COMPLETE', (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        worker.postMessage({ type: 'PROCESS_COMMODITY_DATA', payload: { data } });
      });
    }
   
    processTimeSeriesData(data, commodity) {
      return new Promise((resolve, reject) => {
        const worker = this.initWorker('timeSeries');
        this.callbacks.set('timeSeries_TIME_SERIES_COMPLETE', (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        worker.postMessage({
          type: 'PROCESS_TIME_SERIES',
          payload: { data, commodity }
        });
      });
    }
   
    calculateVisualization(data, options) {
      return new Promise((resolve, reject) => {
        const worker = this.initWorker('timeSeries');
        this.callbacks.set('timeSeries_VISUALIZATION_COMPLETE', (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        worker.postMessage({
          type: 'CALCULATE_VISUALIZATION',
          payload: { data, options }
        });
      });
    }
   
    terminate(type = null) {
      if (type) {
        if (this.workers[type]) {
          this.workers[type].terminate();
          this.workers[type] = null;
        }
      } else {
        Object.keys(this.workers).forEach(workerType => {
          if (this.workers[workerType]) {
            this.workers[workerType].terminate();
            this.workers[workerType] = null;
          }
        });
      }
      this.callbacks.clear();
    }
   }
   
   export const workerManager = new WorkerManager();