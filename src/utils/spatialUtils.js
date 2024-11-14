// src/utils/spatialUtils.js


import { scaleSequential, scaleQuantile } from 'd3-scale';
import { interpolateBlues, interpolateReds, interpolateGreens, interpolateOranges } from 'd3-scale-chromatic';

export const VISUALIZATION_MODES = {
  PRICES: 'prices',
  FLOWS: 'flows',
  CLUSTERS: 'clusters',
  SHOCKS: 'shocks',
  INTEGRATION: 'integration'
};

export const processTimeSeriesData = (timeSeriesData, selectedDate) => {
  if (!Array.isArray(timeSeriesData)) {
    console.error('Invalid time series data', { timeSeriesData });
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

export const calculateMarketMetrics = (data) => {
  if (!data) return null;

  const { timeSeriesData, marketClusters, analysisResults } = data;

  return {
    marketCoverage: marketClusters?.length || 0,
    integrationLevel: analysisResults?.spatialAutocorrelation?.global?.moran_i || 0,
    stability: calculateStability(timeSeriesData),
    observations: timeSeriesData?.length || 0
  };
};

function calculateStability(timeSeriesData) {
  if (!Array.isArray(timeSeriesData) || timeSeriesData.length === 0) return 0;

  const volatilities = timeSeriesData.map(d => d.volatility).filter(v => !isNaN(v));
  if (volatilities.length === 0) return 0;

  return 1 - (volatilities.reduce((a, b) => a + b, 0) / volatilities.length);
}

export const getColorScales = (mode, data) => {
  if (!data || !data.features || !data.features.length) return { getColor: () => '#ccc' };

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

  if (!values.length) return { getColor: () => '#ccc' };

  const min = Math.min(...values);
  const max = Math.max(...values);

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

      if (mode === VISUALIZATION_MODES.CLUSTERS) {
        return colorScale(value);
      }

      return colorScale(value);
    },
    domain: [min, max],
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