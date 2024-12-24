/* eslint-disable no-restricted-globals */
import {
  calculatePriceTrend,
  detectSeasonality,
  detectOutliers,
  calculateVolatility,
  calculateMarketIntegration,
  calculateClusterEfficiency
} from '../utils/marketAnalysisUtils';

// Helper function to process time series data
const processTimeSeriesData = (data) => {
  if (!Array.isArray(data)) return [];
  
  return data.map(entry => ({
    ...entry,
    trend: calculatePriceTrend([entry]),
    seasonality: detectSeasonality([entry]),
    volatility: calculateVolatility([entry]),
    integration: calculateMarketIntegration([entry])
  }));
};

// Helper function to process flow data
const processFlowData = (flows) => {
  if (!Array.isArray(flows)) return {
    flows: [],
    byDate: {},
    metadata: {
      lastUpdated: new Date().toISOString(),
      dateRange: { start: null, end: null }
    }
  };

  const byDate = flows.reduce((acc, flow) => {
    try {
      if (!flow || typeof flow !== 'object') return acc;
      
      if (!flow.source || !flow.target || !flow.flow_weight) return acc;
      
      const date = flow.date || flow.month;
      if (!date || typeof date !== 'string') return acc;
      
      const formattedDate = date.substring(0, 7);
      
      if (!acc[formattedDate]) {
        acc[formattedDate] = [];
      }
      
      acc[formattedDate].push({
        source: String(flow.source),
        target: String(flow.target),
        flow_weight: Number(flow.flow_weight) || 0,
        price_differential: Number(flow.price_differential) || 0,
        source_price: Number(flow.source_price) || 0,
        target_price: Number(flow.target_price) || 0,
        total_flow: Number(flow.total_flow || flow.flow_weight) || 0,
        avg_flow: Number(flow.avg_flow || flow.total_flow || flow.flow_weight) || 0,
        flow_count: Number(flow.flow_count) || 1,
        date: formattedDate
      });
      
      return acc;
    } catch (error) {
      console.warn('Error processing flow:', error);
      return acc;
    }
  }, {});

  const dates = Object.keys(byDate).sort();
  const dateRange = {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null
  };

  const allFlows = Object.values(byDate).flat();

  return {
    flows: allFlows,
    byDate,
    metadata: {
      lastUpdated: new Date().toISOString(),
      dateRange,
      totalFlows: allFlows.length,
      uniqueDates: dates.length
    }
  };
};

// Helper function to process market clusters
const processMarketClusters = (clusters, options = {}) => {
  if (!Array.isArray(clusters)) return [];
  
  const { minMarketCount = 0, minEfficiency = 0 } = options;
  
  return clusters
    .filter(cluster => 
      cluster.market_count >= minMarketCount &&
      calculateClusterEfficiency(cluster) >= minEfficiency
    )
    .map(cluster => ({
      ...cluster,
      efficiency: calculateClusterEfficiency(cluster),
      processed: true
    }));
};

// Helper function to process spatial analysis results
const processSpatialAnalysis = (data) => {
  if (!data || typeof data !== 'object') return null;

  const {
    timeSeriesData,
    flowMaps,
    marketClusters,
    marketShocks,
    spatialAutocorrelation,
    regressionAnalysis
  } = data;

  return {
    timeSeriesData: processTimeSeriesData(timeSeriesData),
    flowData: processFlowData(flowMaps),
    marketClusters: processMarketClusters(marketClusters),
    marketShocks,
    spatialAutocorrelation,
    regressionAnalysis
  };
};

// Message handler
self.onmessage = async (event) => {
  const { type, data, options } = event.data;

  try {
    let result;

    switch (type) {
      case 'processSpatialData':
        result = processSpatialAnalysis(data);
        break;

      case 'processTimeSeries':
        result = processTimeSeriesData(data);
        break;

      case 'processFlows':
        result = processFlowData(data);
        break;

      case 'processClusters':
        result = processMarketClusters(data, options);
        break;

      default:
        throw new Error(`Unknown processing type: ${type}`);
    }

    self.postMessage({ type: 'success', result });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message || 'Unknown error in spatial worker'
    });
  }
};
