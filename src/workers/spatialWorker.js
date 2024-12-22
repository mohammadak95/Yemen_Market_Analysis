// Web Worker for heavy spatial computations
import { 
  processTimeSeries,
  calculateFlowMetrics,
  calculateClustersMetrics,
  calculateMarketMetrics
} from '../utils/marketAnalysisUtils';

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data, options } = event.data;

  try {
    let result;
    
    switch (type) {
      case 'processFlowData':
        result = calculateFlowMetrics(data, options);
        break;
        
      case 'processTimeSeriesData':
        result = processTimeSeries(data, options);
        break;
        
      case 'processMarketClusters':
        result = calculateClustersMetrics(data, options);
        break;

      case 'processMarketMetrics':
        result = calculateMarketMetrics(data, options);
        break;

      default:
        throw new Error(`Unknown computation type: ${type}`);
    }

    // Send result back to main thread
    self.postMessage({
      type: 'success',
      result
    });
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};