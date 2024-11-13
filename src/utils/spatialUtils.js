// src/utils/spatialUtils.js

import { debugUtils } from './debugUtils';
import { scaleSequential, scaleQuantile } from 'd3-scale';
import { interpolateBlues, interpolateReds, interpolateGreens, interpolateOranges } from 'd3-scale-chromatic';

export const VISUALIZATION_MODES = {
  PRICES: 'prices',
  FLOWS: 'flows',
  CLUSTERS: 'clusters',
  SHOCKS: 'shocks',
  INTEGRATION: 'integration'
};


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

  // Extract values based on visualization mode
  const values = data.features.map(feature => {
    const props = feature.properties;
    switch (mode) {
      case VISUALIZATION_MODES.PRICES:
        return props.priceData?.avgUsdPrice || props.usdprice;
      case VISUALIZATION_MODES.FLOWS:
        return props.flow_weight;
      case VISUALIZATION_MODES.CLUSTERS:
        return props.clusterSize;
      case VISUALIZATION_MODES.SHOCKS:
        return props.shock_magnitude;
      case VISUALIZATION_MODES.INTEGRATION:
        return props.integration_score;
      default:
        return props.priceData?.avgUsdPrice || props.usdprice;
    }
  }).filter(value => value !== undefined && value !== null);

  // If no valid values, return default color
  if (!values.length) return { getColor: () => '#ccc' };

  // Calculate domain
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Create color scale based on visualization mode
  const getColorScale = () => {
    switch (mode) {
      case VISUALIZATION_MODES.PRICES:
        return scaleSequential()
          .domain([min, max])
          .interpolator(interpolateBlues);
      
      case VISUALIZATION_MODES.FLOWS:
        return scaleSequential()
          .domain([min, max])
          .interpolator(interpolateGreens);
      
      case VISUALIZATION_MODES.CLUSTERS:
        // Use quantile scale for discrete cluster sizes
        const clusterScale = scaleQuantile()
          .domain(values)
          .range(['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']);
        return value => clusterScale(value);
      
      case VISUALIZATION_MODES.SHOCKS:
        return scaleSequential()
          .domain([min, max])
          .interpolator(interpolateReds);
      
      case VISUALIZATION_MODES.INTEGRATION:
        return scaleSequential()
          .domain([min, max])
          .interpolator(interpolateOranges);
      
      default:
        return scaleSequential()
          .domain([min, max])
          .interpolator(interpolateBlues);
    }
  };

  const colorScale = getColorScale();

  return {
    getColor: (feature) => {
      if (!feature?.properties) return '#ccc';

      const props = feature.properties;
      let value;

      switch (mode) {
        case VISUALIZATION_MODES.PRICES:
          value = props.priceData?.avgUsdPrice || props.usdprice;
          break;
        case VISUALIZATION_MODES.FLOWS:
          value = props.flow_weight;
          break;
        case VISUALIZATION_MODES.CLUSTERS:
          value = props.clusterSize;
          break;
        case VISUALIZATION_MODES.SHOCKS:
          value = props.shock_magnitude;
          break;
        case VISUALIZATION_MODES.INTEGRATION:
          value = props.integration_score;
          break;
        default:
          value = props.priceData?.avgUsdPrice || props.usdprice;
      }

      if (value === undefined || value === null) return '#ccc';
      
      // For cluster mode, use the function directly
      if (mode === VISUALIZATION_MODES.CLUSTERS) {
        return colorScale(value);
      }

      // For other modes, call the scale as a function
      return colorScale(value);
    },
    // Add domain info for legend
    domain: [min, max],
    // Add mode-specific formatting
    format: (value) => {
      switch (mode) {
        case VISUALIZATION_MODES.PRICES:
          return `$${value.toFixed(2)}`;
        case VISUALIZATION_MODES.FLOWS:
          return value.toFixed(1);
        case VISUALIZATION_MODES.CLUSTERS:
          return Math.round(value);
        case VISUALIZATION_MODES.SHOCKS:
          return `${value.toFixed(1)}%`;
        case VISUALIZATION_MODES.INTEGRATION:
          return (value * 100).toFixed(1) + '%';
        default:
          return value.toFixed(2);
      }
    }
  };
};

// Helper function to get color for specific visualization types
export const getFlowLineColor = (flow, maxFlow = 100) => {
  const normalizedValue = Math.min(flow.flow_weight / maxFlow, 1);
  const opacity = 0.2 + (normalizedValue * 0.8); // Scale opacity between 0.2 and 1.0
  return `rgba(0, 128, 255, ${opacity})`;
};

export const getClusterColor = (clusterId, totalClusters) => {
  const colors = [
    '#e41a1c', // red
    '#377eb8', // blue
    '#4daf4a', // green
    '#984ea3', // purple
    '#ff7f00', // orange
    '#ffff33'  // yellow
  ];
  return colors[clusterId % colors.length];
};

export const getShockColor = (shock) => {
  if (shock.magnitude > 50) return '#d73027'; // high severity
  if (shock.magnitude > 25) return '#fc8d59'; // medium severity
  return '#fee090'; // low severity
};