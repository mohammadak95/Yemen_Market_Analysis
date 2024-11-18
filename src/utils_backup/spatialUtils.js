// src/utils/spatialUtils.js

import { debugUtils } from './debugUtils';


/**
 * Updated utility functions for working with preprocessed spatial data
 */
export const THRESHOLDS = {
  VOLATILITY: 0.05,
  PRICE_CHANGE: 0.15,
  MIN_DATA_POINTS: 3,
  MAX_OUTLIER_STDDEV: 3,
  MIN_CLUSTER_SIZE: 2,
  NEIGHBOR_THRESHOLD_KM: 200
};

/**
 * Process time series data for visualization
 */
export const processTimeSeriesData = (timeSeriesData, selectedDate) => {
  if (debugUtils.isEnabled()) {
    debugUtils.log('Processing time series data', {
      dataPoints: timeSeriesData?.length,
      selectedDate
    });
  }

  if (!Array.isArray(timeSeriesData)) {
    debugUtils.logError('Invalid time series data', { timeSeriesData });
    return [];
  }

  return timeSeriesData
    .map(entry => ({
      month: entry.month,
      avgPrice: entry.avgUsdPrice,
      volatility: entry.volatility,
      sampleSize: entry.sampleSize,
      date: new Date(entry.month)
    }))
    .sort((a, b) => a.date - b.date);
};

/**
 * Calculate market metrics from preprocessed data
 */
export const calculateMarketMetrics = (data) => {
  if (!data) return null;

  const { timeSeriesData, marketClusters, analysisResults } = data;
  
  return {
    marketCoverage: marketClusters?.length || 0,
    integrationLevel: analysisResults?.spatialAutocorrelation?.moran_i || 0,
    stability: calculateStability(timeSeriesData),
    observations: timeSeriesData?.length || 0
  };
};

/**
 * Process spatial diagnostics from preprocessed data
 */
export const processSpatialDiagnostics = (data) => {
  if (!data) return null;

  const { spatialAutocorrelation, marketClusters } = data;
  
  return {
    moranI: spatialAutocorrelation?.moran_i || 0,
    pValue: spatialAutocorrelation?.p_value || 1,
    significance: spatialAutocorrelation?.significance || false,
    clusterCount: marketClusters?.length || 0,
    averageClusterSize: calculateAverageClusterSize(marketClusters)
  };
};

/**
 * Process market clusters for visualization
 */
export const processMarketClusters = (clusters) => {
  if (!Array.isArray(clusters)) return [];

  return clusters.map(cluster => ({
    id: cluster.cluster_id,
    mainMarket: cluster.main_market,
    markets: cluster.connected_markets,
    size: cluster.market_count,
    density: calculateClusterDensity(cluster)
  }));
};

// Helper functions
function calculateStability(timeSeriesData) {
  if (!Array.isArray(timeSeriesData) || timeSeriesData.length === 0) return 0;
  
  const volatilities = timeSeriesData.map(d => d.volatility).filter(v => !isNaN(v));
  if (volatilities.length === 0) return 0;
  
  return 1 - (volatilities.reduce((a, b) => a + b, 0) / volatilities.length);
}

function calculateAverageClusterSize(clusters) {
  if (!Array.isArray(clusters) || clusters.length === 0) return 0;
  return clusters.reduce((sum, c) => sum + c.market_count, 0) / clusters.length;
}

function calculateClusterDensity(cluster) {
  const totalPossibleConnections = cluster.market_count * (cluster.market_count - 1) / 2;
  const actualConnections = cluster.connected_markets.length;
  return totalPossibleConnections > 0 ? actualConnections / totalPossibleConnections : 0;
}

export const getColorScales = (mode, data) => {
  if (!data?.features?.length) return { getColor: () => '#ccc' };

  try {
    const values = data.features
      .map(f => f.properties?.priceData?.avgUsdPrice)
      .filter(price => typeof price === 'number' && !isNaN(price));

    if (!values.length) return { getColor: () => '#ccc' };

    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      getColor: (feature) => {
        const value = feature.properties?.priceData?.avgUsdPrice;
        if (typeof value !== 'number' || isNaN(value)) return '#ccc';
        return interpolateBlues((value - min) / (max - min));
      }
    };
  } catch (error) {
    console.error('Error creating color scales:', error);
    return { getColor: () => '#ccc' };
  }
};