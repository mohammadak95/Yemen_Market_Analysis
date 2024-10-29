// src/workers/enhancedDataProcessor.worker.js

const CHUNK_SIZE = parseInt(process.env.REACT_APP_CHUNK_SIZE) || 500000;

// Message types
const MessageTypes = {
  PROCESS_GEOJSON: 'PROCESS_GEOJSON',
  PROCESS_FLOW_DATA: 'PROCESS_FLOW_DATA',
  GENERATE_CSV: 'GENERATE_CSV',
  CALCULATE_STATISTICS: 'CALCULATE_STATISTICS',
  ERROR: 'ERROR',
  PROGRESS: 'PROGRESS'
};

class WorkerProcessor {
  constructor() {
    this.activeTask = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    self.onmessage = (event) => {
      const { type, data, taskId } = event.data;
      
      try {
        this.activeTask = taskId;
        this.processMessage(type, data, taskId);
      } catch (error) {
        this.sendError(error, taskId);
      }
    };
  }

  sendProgress(progress, taskId) {
    self.postMessage({
      type: MessageTypes.PROGRESS,
      data: { progress },
      taskId
    });
  }

  sendError(error, taskId) {
    self.postMessage({
      type: MessageTypes.ERROR,
      error: error.message,
      taskId
    });
  }

  sendResult(type, data, taskId) {
    self.postMessage({
      type,
      data,
      taskId
    });
  }

  async processMessage(type, data, taskId) {
    switch (type) {
      case MessageTypes.PROCESS_GEOJSON:
        await this.processGeoJSON(data, taskId);
        break;
      case MessageTypes.PROCESS_FLOW_DATA:
        await this.processFlowData(data, taskId);
        break;
      case MessageTypes.GENERATE_CSV:
        await this.generateCSV(data, taskId);
        break;
      case MessageTypes.CALCULATE_STATISTICS:
        await this.calculateStatistics(data, taskId);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  async processGeoJSON(data, taskId) {
    const { features, options } = data;
    const chunks = this.chunkArray(features, CHUNK_SIZE);
    const processedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const processedChunk = chunk.map(feature => {
        // Process each feature
        const processed = this.processFeature(feature);
        return processed;
      });

      processedChunks.push(...processedChunk);
      this.sendProgress((i + 1) / chunks.length * 100, taskId);
    }

    this.sendResult(MessageTypes.PROCESS_GEOJSON, {
      type: 'FeatureCollection',
      features: processedChunks
    }, taskId);
  }

  async processFlowData(data, taskId) {
    const { flows, options } = data;
    const chunks = this.chunkArray(flows, CHUNK_SIZE);
    const processedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const processedChunk = chunk.map(flow => {
        // Process each flow
        return this.processFlow(flow);
      });

      processedChunks.push(...processedChunk);
      this.sendProgress((i + 1) / chunks.length * 100, taskId);
    }

    this.sendResult(MessageTypes.PROCESS_FLOW_DATA, processedChunks, taskId);
  }

  async generateCSV(data, taskId) {
    const { records, options } = data;
    const chunks = this.chunkArray(records, CHUNK_SIZE);
    let csvContent = '';

    // Add headers
    if (records.length > 0) {
      csvContent += Object.keys(records[0]).join(',') + '\n';
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const processedChunk = chunk.map(record => {
        return Object.values(record)
          .map(value => this.escapeCSVValue(value))
          .join(',');
      }).join('\n');

      csvContent += processedChunk + '\n';
      this.sendProgress((i + 1) / chunks.length * 100, taskId);
    }

    this.sendResult(MessageTypes.GENERATE_CSV, csvContent, taskId);
  }

  async calculateStatistics(data, taskId) {
    const { features, options } = data;
    const stats = {
      count: features.length,
      summary: this.calculateSummaryStatistics(features),
      spatial: this.calculateSpatialStatistics(features)
    };

    this.sendResult(MessageTypes.CALCULATE_STATISTICS, stats, taskId);
  }

  // Helper methods
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  processFeature(feature) {
    try {
      return {
        ...feature,
        properties: {
          ...feature.properties,
          processed: true,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error processing feature:', error);
      return feature;
    }
  }

  processFlow(flow) {
    try {
      return {
        ...flow,
        processed: true,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing flow:', error);
      return flow;
    }
  }

  escapeCSVValue(value) {
    if (value == null) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  calculateSummaryStatistics(features) {
    // Implement summary statistics calculation
    return {};
  }

  calculateSpatialStatistics(features) {
    // Implement spatial statistics calculation
    return {};
  }
}

// Initialize the worker processor
const processor = new WorkerProcessor();