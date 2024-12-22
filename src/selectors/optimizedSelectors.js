// src/selectors/optimizedSelectors.js

import { createSelector, createSelectorCreator, lruMemoize } from 'reselect';
import { createEntityAdapter } from '@reduxjs/toolkit';
import _ from 'lodash';
import { 
  transformRegionName, 
  getRegionCoordinates, 
  calculateCenter 
} from '../components/spatialAnalysis/utils/spatialUtils';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { flowValidation } from '../components/spatialAnalysis/features/flows/types';
import { 
  calculateAutocorrelationMetrics, 
  processFeatureData, 
  processClustersWithCoordinates, 
  processFlowsWithCoordinates 
} from '../utils/dataProcessingUtils';

// Yemen market coordinates mapping - verified and normalized
export const YEMEN_COORDINATES = {
  'abyan': [45.83, 13.58],
  'aden': [45.03, 12.77],
  'al bayda': [45.57, 14.17],
  'al dhale\'e': [44.73, 13.70],
  'al hudaydah': [42.95, 14.80],
  'al jawf': [45.50, 16.60],
  'al maharah': [51.83, 16.52],
  'al mahwit': [43.55, 15.47],
  'amanat al asimah': [44.21, 15.35],
  'amran': [43.94, 15.66],
  'dhamar': [44.24, 14.54],
  'hadramaut': [48.78, 15.93],
  'hajjah': [43.60, 15.63],
  'ibb': [44.18, 13.97],
  'lahj': [44.88, 13.03],
  'marib': [45.32, 15.47],
  'raymah': [43.71, 14.68],
  'sana\'a': [44.21, 15.35],
  'shabwah': [47.01, 14.53],
  'taizz': [44.02, 13.58],
  'socotra': [53.87, 12.47]
};

// Utility Functions

const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return 0;
  
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg) => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
           Math.sin(dLon/2) * Math.sin(dLon/2);
           
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateAverageDistance = (coordinates) => {
  if (coordinates.length < 2) return 0;
  let totalDistance = 0;
  let count = 0;

  for (let i = 0; i < coordinates.length; i++) {
    for (let j = i + 1; j < coordinates.length; j++) {
      const distance = calculateDistance(coordinates[i], coordinates[j]);
      if (!isNaN(distance)) {
        totalDistance += distance;
        count++;
      }
    }
  }

  return count > 0 ? totalDistance / count : 0;
};

const calculateMaxTheoreticalDistance = (coordinates) => {
  if (coordinates.length < 2) return 0;
  let maxDistance = 0;
  for (let i = 0; i < coordinates.length; i++) {
    for (let j = i + 1; j < coordinates.length; j++) {
      const distance = calculateDistance(coordinates[i], coordinates[j]);
      maxDistance = Math.max(maxDistance, distance);
    }
  }
  return maxDistance;
};

const validateNumber = (value) => {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
};

const calculateVolatility = (prices) => {
  if (!Array.isArray(prices) || prices.length < 2) return 0;

  try {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i-1] > 0) {
        returns.push(Math.log(prices[i] / prices[i-1]));
      }
    }

    if (!returns.length) return 0;
    
    const meanReturn = _.mean(returns);
    const variance = _.meanBy(returns, r => Math.pow(r - meanReturn, 2));
    return Math.sqrt(variance);
  } catch {
    return 0;
  }
};

const calculateTrend = (prices) => {
  if (!Array.isArray(prices) || prices.length < 2) return 0;

  try {
    const xValues = Array.from({ length: prices.length }, (_, i) => i);
    const xMean = _.mean(xValues);
    const yMean = _.mean(prices);

    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < prices.length; i++) {
      const xDiff = xValues[i] - xMean;
      numerator += xDiff * (prices[i] - yMean);
      denominator += xDiff * xDiff;
    }

    return denominator !== 0 ? numerator / denominator : 0;
  } catch {
    return 0;
  }
};

const detectSeasonality = (prices) => {
  if (!Array.isArray(prices) || prices.length < 12) return 0;

  try {
    // Calculate autocorrelation at lag 12 (annual seasonality)
    const n = prices.length;
    const mean = _.mean(prices);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - 12; i++) {
      numerator += (prices[i] - mean) * (prices[i + 12] - mean);
    }

    for (let i = 0; i < n; i++) {
      denominator += Math.pow(prices[i] - mean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  } catch {
    return 0;
  }
};

const calculateClusterEfficiency = (cluster, flows, marketCoordinates) => {
  if (!flows.length || !marketCoordinates.length) return 0;

  const flowWeights = flows.map(f => f.flow_weight);
  const maxFlow = Math.max(...flowWeights);
  const avgFlow = _.mean(flowWeights);

  // Calculate network density
  const possibleConnections = (marketCoordinates.length * (marketCoordinates.length - 1)) / 2;
  const actualConnections = flows.length;
  const networkDensity = possibleConnections > 0 ? actualConnections / possibleConnections : 0;

  // Calculate spatial coverage
  const avgDistance = calculateAverageDistance(marketCoordinates.map(m => m.coordinates));
  const maxTheoretical = calculateMaxTheoreticalDistance(marketCoordinates.map(m => m.coordinates));
  const spatialCoverage = maxTheoretical > 0 ? avgDistance / maxTheoretical : 0;

  // Combined efficiency score
  return (
    (0.4 * networkDensity) +
    (0.3 * (avgFlow / maxFlow)) +
    (0.3 * spatialCoverage)
  );
};

const calculateDataSize = (obj) => {
  const str = JSON.stringify(obj);
  return str ? str.length : 0;
};

// Corrected Selector Creator with Deep Equality
const createDeepEqualSelector = createSelectorCreator(
  lruMemoize,
  _.isEqual
);

const getDefaultMetrics = () => ({
  marketEfficiency: { average: 0, max: 0, min: 0 },
  connectivity: { flowDensity: 0, averageConnectivity: 0 },
  spatial: { globalMoransI: 0, clusterCount: 0, significantClusters: 0 },
  coverage: { totalMarkets: 0, averageCoverage: 0 }
});

const getDefaultSpatialData = () => ({
  geometry: null,
  marketClusters: [],
  flowMaps: [],
  timeSeriesData: [],
  marketShocks: [],
  marketIntegration: { price_correlation: {}, flow_density: 0 },
  spatialAutocorrelation: { global: { moran_i: 0 }, local: {} },
  regressionAnalysis: { model: {}, residuals: [], spatial_analysis_results: [] },
  seasonalAnalysis: { seasonal_pattern: [] },
  uniqueMonths: [],
  metrics: getDefaultMetrics(),
  timestamp: Date.now()
});

const calculateEnhancedMetrics = (clusters, flows, integration, autocorrelation) => {
  try {
    const clusterMetrics = clusters?.map(c => c.metrics) || [];
    return {
      marketEfficiency: {
        average: _.meanBy(clusterMetrics, 'efficiency') || 0,
        max: _.maxBy(clusterMetrics, 'efficiency')?.efficiency || 0,
        min: _.minBy(clusterMetrics, 'efficiency')?.efficiency || 0
      },
      connectivity: {
        flowDensity: integration?.flow_density || 0,
        averageConnectivity: _.meanBy(clusterMetrics, 'internal_connectivity') || 0
      },
      spatial: {
        globalMoransI: autocorrelation?.global?.moran_i || 0,
        clusterCount: clusters?.length || 0,
        significantClusters: countSignificantClusters(autocorrelation)
      },
      coverage: {
        totalMarkets: _.sumBy(clusters, c => c.connected_markets?.length || 0),
        averageCoverage: _.meanBy(clusterMetrics, 'market_coverage') || 0
      }
    };
  } catch (error) {
    console.error('Enhanced metrics calculation error:', error);
    return getDefaultMetrics();
  }
};

const countSignificantClusters = (autocorrelation) => {
  if (!autocorrelation?.local) return 0;
  return Object.values(autocorrelation.local)
    .filter(c => c.p_value < 0.05)
    .length;
};

const processRegressionResults = (regression) => {
  if (!regression?.spatial_analysis_results) return [];
  return regression.spatial_analysis_results.map(result => ({
    ...result,
    residual: Array.isArray(result.residual) ? result.residual : [],
    coefficients: result.coefficients || {},
    moran_i: result.moran_i || { I: null, 'p-value': null }
  }));
};

const extractUniqueMonths = (timeSeriesData) => {
  if (!Array.isArray(timeSeriesData)) return [];
  return _.uniq(timeSeriesData.map(d => d.month))
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));
};

// Core state selectors with performance monitoring
const selectSpatialRoot = (state) => {
  const metric = backgroundMonitor.startMetric('spatial-root-selector');
  try {
    const result = state.spatial ?? { data: {}, status: {}, ui: {} };
    metric.finish({ status: 'success' });
    return result;
  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    return { data: {}, status: {}, ui: {} };
  }
};

const selectSpatialData = createSelector(
  [selectSpatialRoot],
  (spatial) => spatial.data ?? {}
);

const selectSpatialStatus = createSelector(
  [selectSpatialRoot],
  (spatial) => spatial.status ?? {}
);

const selectSpatialUI = createSelector(
  [selectSpatialRoot],
  (spatial) => spatial.ui ?? {}
);

export const selectLoadingStatus = createSelector(
  [selectSpatialStatus],
  (status) => ({
    loading: status?.loading || false,
    stage: status?.stage || '',
    progress: status?.progress || 0
  })
);

export const selectStatus = createSelector(
  [selectSpatialStatus],
  (status) => status
);

export const selectGeometryData = createSelector(
  [selectSpatialData],
  (data) => data?.geometry || {}
);

export const selectMarketFlows = createSelector(
  [selectSpatialData],
  (data) => data?.flowMaps || []
);

export const selectMarketIntegration = createSelector(
  [selectSpatialData],
  (data) => data?.marketIntegration || {}
);

export const selectVisualizationMode = createSelector(
  [selectSpatialUI],
  (ui) => ui?.visualizationMode || 'prices'
);

export const selectSelectedDate = createSelector(
  [selectSpatialUI],
  (ui) => ui?.selectedDate || ''
);

export const selectSelectedCommodity = createSelector(
  [selectSpatialUI],
  (ui) => ui?.selectedCommodity || ''
);

export const selectMarketShocks = createSelector(
  [selectSpatialData],
  (data) => data?.marketShocks || []
);

export const selectSeasonalAnalysis = createSelector(
  [selectSpatialData],
  (data) => data?.seasonalAnalysis || {}
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => data?.spatialAutocorrelation || {
    global: { moran_i: 0, p_value: 1 },
    local: {}
  }
);

export const selectAutocorrelationMetrics = createSelector(
  [selectSpatialAutocorrelation],
  (autocorrelation) => calculateAutocorrelationMetrics(autocorrelation)
);

export const selectTimeSeriesData = createDeepEqualSelector(
  [
    selectSpatialData,
    (state) => state.spatial.ui.selectedRegimes,
    (state) => state.spatial.ui.selectedDate
  ],
  (spatialData, selectedRegimes, selectedDate) => {
    const metric = backgroundMonitor.startMetric('time-series-analysis');

    try {
      const timeSeriesData = spatialData.timeSeriesData;
      if (!Array.isArray(timeSeriesData)) {
        metric.finish({ status: 'success', seriesCount: 0, date: selectedDate });
        return [];
      }

      const filteredData = timeSeriesData.filter(d => {
        const dateMatch = !selectedDate || d.month === selectedDate;
        const regimeMatch = !selectedRegimes.length || selectedRegimes.includes(d.regime);
        return dateMatch && regimeMatch;
      });

      const processedData = filteredData.map(series => {
        const priceValues = series.prices?.filter(p => typeof p === 'number') || [];
        const volatility = calculateVolatility(priceValues);
        const trend = calculateTrend(priceValues);

        return {
          ...series,
          metrics: {
            volatility,
            trend,
            average: priceValues.length ? _.mean(priceValues) : 0,
            seasonality: detectSeasonality(priceValues)
          }
        };
      });

      metric.finish({ 
        status: 'success',
        seriesCount: processedData.length,
        date: selectedDate
      });

      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Time series analysis error:', error);
      return [];
    }
  }
);

export const selectFeatureDataWithMetrics = createSelector(
  [selectGeometryData, selectTimeSeriesData],
  (geometry, timeSeriesData) => processFeatureData(geometry, timeSeriesData)
);

export const selectMarketClusters = createDeepEqualSelector(
  [selectSpatialData, (state) => state.flow?.flows || []],
  (spatialData, flows) => {
    const metric = backgroundMonitor.startMetric('market-cluster-analysis');

    try {
      if (!spatialData.marketClusters?.length) {
        metric.finish({ status: 'success', clusterCount: 0 });
        return [];
      }

      const processedClusters = spatialData.marketClusters.map(cluster => {
        const clusterFlows = flows.filter(flow => 
          cluster.connected_markets.includes(flow.source) || 
          cluster.connected_markets.includes(flow.target)
        );

        const marketCoordinates = cluster.connected_markets.map(market => {
          const coords = getRegionCoordinates(market);
          return coords ? { market, coordinates: coords } : null;
        }).filter(Boolean);

        const totalFlow = clusterFlows.reduce((sum, flow) => sum + flow.flow_weight, 0);
        const internalFlows = clusterFlows.filter(flow => 
          cluster.connected_markets.includes(flow.source) && 
          cluster.connected_markets.includes(flow.target)
        );

        return {
          ...cluster,
          metrics: {
            marketCount: cluster.connected_markets.length,
            totalFlow,
            internalFlowRatio: internalFlows.length / Math.max(clusterFlows.length, 1),
            spatialCoverage: marketCoordinates.length / cluster.connected_markets.length,
            avgDistance: calculateAverageDistance(marketCoordinates.map(m => m.coordinates)),
            efficiency: calculateClusterEfficiency(cluster, clusterFlows, marketCoordinates)
          }
        };
      });

      metric.finish({ 
        status: 'success', 
        clusterCount: processedClusters.length 
      });

      return processedClusters;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Market cluster analysis error:', error);
      return [];
    }
  }
);

export const selectFlowData = createDeepEqualSelector(
  [
    (state) => state.flow?.flows || [],
    (state) => state.spatial.ui.selectedDate,
    (state) => state.spatial.ui.selectedCommodity
  ],
  (flows, selectedDate, selectedCommodity) => {
    const metric = backgroundMonitor.startMetric('flow-data-selection');
    
    try {
      if (!flows.length || !selectedDate || !selectedCommodity) {
        metric.finish({ status: 'success', flowCount: 0, date: selectedDate, commodity: selectedCommodity });
        return [];
      }

      const filteredFlows = flows.filter(flow => {
        if (!flowValidation.isValidFlow(flow)) {
          return false;
        }
        const flowDate = flow.date?.substring(0, 7);
        return flowDate === selectedDate;
      });

      metric.finish({ 
        status: 'success',
        flowCount: filteredFlows.length,
        date: selectedDate,
        commodity: selectedCommodity
      });

      return filteredFlows;
    } catch (error) {
      metric.finish({ 
        status: 'error', 
        error: error.message 
      });
      console.error('Flow data selection error:', error);
      return [];
    }
  }
);

export const selectMarketMetrics = createDeepEqualSelector(
  [selectFlowData],
  (flows) => {
    const metric = backgroundMonitor.startMetric('market-metrics-calculation');
    
    try {
      if (!flows.length) {
        metric.finish({ status: 'success', marketCount: 0, flowCount: 0 });
        return {
          totalFlows: 0,
          averageFlow: 0,
          maxFlow: 0,
          activeMarkets: 0,
          flowDensity: 0
        };
      }

      const validFlows = flows.filter(flow => flow.flow_weight > 0);
      const markets = new Set();
      
      validFlows.forEach(flow => {
        if (flow.source) markets.add(flow.source);
        if (flow.target) markets.add(flow.target);
      });

      const flowValues = validFlows.map(f => f.flow_weight);
      const totalFlow = _.sum(flowValues);
      const avgFlow = totalFlow / flowValues.length;

      const result = {
        totalFlows: validFlows.length,
        averageFlow: avgFlow,
        maxFlow: Math.max(...flowValues),
        activeMarkets: markets.size,
        flowDensity: markets.size > 1 ? 
          validFlows.length / (markets.size * (markets.size - 1) / 2) : 0
      };

      metric.finish({ 
        status: 'success',
        marketCount: markets.size,
        flowCount: validFlows.length
      });

      return result;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Market metrics calculation error:', error);
      return {
        totalFlows: 0,
        averageFlow: 0,
        maxFlow: 0,
        activeMarkets: 0,
        flowDensity: 0
      };
    }
  }
);

export const selectSpatialNetwork = createDeepEqualSelector(
  [selectFlowData, selectSpatialData],
  (flows, spatialData) => {
    const metric = backgroundMonitor.startMetric('spatial-network-analysis');

    try {
      if (!flows.length || !spatialData.geometry) {
        metric.finish({ status: 'success', marketCount: 0, connectionCount: 0 });
        return null;
      }

      const markets = new Map();
      const connections = [];

      flows.forEach(flow => {
        const sourceCoords = getRegionCoordinates(flow.source);
        const targetCoords = getRegionCoordinates(flow.target);

        if (!sourceCoords || !targetCoords) return;

        if (!markets.has(flow.source)) {
          markets.set(flow.source, {
            id: flow.source,
            coordinates: sourceCoords,
            totalFlow: 0,
            incomingFlows: 0,
            outgoingFlows: 0
          });
        }

        const sourceMarket = markets.get(flow.source);
        const targetMarket = markets.get(flow.target) || {
          id: flow.target,
          coordinates: targetCoords,
          totalFlow: 0,
          incomingFlows: 0,
          outgoingFlows: 0
        };

        sourceMarket.totalFlow += flow.flow_weight;
        sourceMarket.outgoingFlows++;
        targetMarket.totalFlow += flow.flow_weight;
        targetMarket.incomingFlows++;

        if (!markets.has(flow.target)) {
          markets.set(flow.target, targetMarket);
        }

        connections.push({
          source: flow.source,
          target: flow.target,
          weight: flow.flow_weight,
          coordinates: {
            source: sourceCoords,
            target: targetCoords
          }
        });
      });

      const result = {
        markets: Array.from(markets.values()),
        connections,
        metrics: {
          totalMarkets: markets.size,
          totalConnections: connections.length,
          networkDensity: markets.size > 1 ? 
            connections.length / (markets.size * (markets.size - 1) / 2) : 0,
          averageConnections: markets.size > 0 ? 
            connections.length / markets.size : 0
        }
      };

      metric.finish({ status: 'success', marketCount: markets.size, connectionCount: connections.length });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Spatial network analysis error:', error);
      return null;
    }
  }
);

export const selectRegressionAnalysis = createDeepEqualSelector(
  [selectSpatialData, selectSelectedCommodity],
  (spatialData, selectedCommodity) => {
    const metric = backgroundMonitor.startMetric('regression-analysis');

    try {
      const regression = spatialData.regressionAnalysis;
      if (!regression || !selectedCommodity) {
        metric.finish({ status: 'success', commodity: selectedCommodity });
        return null;
      }

      const metadata = regression.metadata || {};
      
      // Only process if commodity matches
      if (selectedCommodity && metadata.commodity !== selectedCommodity) {
        metric.finish({ status: 'success', commodity: selectedCommodity });
        return null;
      }

      const result = {
        model: regression.model || {},
        spatial: {
          moran_i: regression.spatial?.moran_i || { I: 0, 'p-value': 1 },
          vif: Array.isArray(regression.spatial?.vif) ? regression.spatial.vif : []
        },
        residuals: {
          raw: Array.isArray(regression.residuals?.raw) ? regression.residuals.raw : [],
          byRegion: regression.residuals?.byRegion || {},
          stats: {
            mean: validateNumber(regression.residuals?.stats?.mean),
            variance: validateNumber(regression.residuals?.stats?.variance),
            maxAbsolute: validateNumber(regression.residuals?.stats?.maxAbsolute)
          }
        },
        metadata: {
          commodity: selectedCommodity,
          timestamp: metadata.timestamp || new Date().toISOString(),
          version: metadata.version || "1.0"
        }
      };

      metric.finish({ status: 'success', commodity: selectedCommodity });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Regression analysis error:', error);
      return null;
    }
  }
);

export const selectClustersWithCoordinates = createSelector(
  [selectMarketClusters, selectGeometryData],
  (clusters, geometry) => processClustersWithCoordinates(clusters, geometry)
);

export const selectFlowsWithCoordinates = createSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => processFlowsWithCoordinates(flows, geometry)
);

export const selectVisualizationData = createDeepEqualSelector(
  [selectFeatureDataWithMetrics, selectMarketFlows, selectMarketClusters],
  (featureData, flows, clusters) => {
    const metric = backgroundMonitor.startMetric('visualization-data-processing');

    try {
      const processedFlows = (flows || []).map(flow => {
        const sourceCoords = getRegionCoordinates(flow.source);
        const targetCoords = getRegionCoordinates(flow.target);

        if (!sourceCoords || !targetCoords) return null;

        return {
          ...flow,
          coordinates: {
            source: sourceCoords,
            target: targetCoords
          },
          normalized: {
            source: transformRegionName(flow.source),
            target: transformRegionName(flow.target)
          }
        };
      }).filter(Boolean);

      const processedClusters = (clusters || []).map(cluster => {
        const marketCoords = (cluster.connected_markets || [])
          .map(market => {
            const coords = getRegionCoordinates(market);
            return coords ? { name: market, coordinates: coords } : null;
          })
          .filter(Boolean);

        return {
          ...cluster,
          markets: marketCoords,
          center: calculateCenter(marketCoords.map(m => m.coordinates)) || [0, 0]
        };
      });

      const result = {
        features: featureData?.points || [],
        flows: processedFlows,
        clusters: processedClusters,
        timestamp: Date.now()
      };

      metric.finish({ 
        status: 'success',
        flowCount: processedFlows.length,
        clusterCount: processedClusters.length
      });

      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Visualization data processing error:', error);
      return {
        features: [],
        flows: [],
        clusters: [],
        timestamp: Date.now()
      };
    }
  }
);

export const selectSpatialDataOptimized = createDeepEqualSelector(
  [
    selectGeometryData,
    selectMarketClusters,
    selectMarketFlows,
    selectTimeSeriesData,
    selectMarketShocks,
    selectMarketIntegration,
    selectSpatialAutocorrelation,
    selectRegressionAnalysis,
    selectSeasonalAnalysis
  ],
  (
    geometry,
    clusters,
    flows,
    timeSeriesData,
    shocks,
    integration,
    autocorrelation,
    regression,
    seasonal
  ) => {
    const metric = backgroundMonitor.startMetric('spatial-data-optimization');

    try {
      const spatial_analysis_results = processRegressionResults(regression);
      const uniqueMonths = extractUniqueMonths(timeSeriesData);
      const metrics = calculateEnhancedMetrics(
        clusters,
        flows,
        integration,
        autocorrelation
      );

      const result = {
        geometry,
        marketClusters: clusters,
        flowMaps: flows,
        timeSeriesData,
        marketShocks: shocks,
        marketIntegration: integration,
        spatialAutocorrelation: autocorrelation,
        regressionAnalysis: {
          ...regression,
          spatial_analysis_results
        },
        seasonalAnalysis: seasonal,
        uniqueMonths,
        metrics,
        timestamp: Date.now()
      };

      metric.finish({ 
        status: 'success',
        dataSize: calculateDataSize(result)
      });

      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Spatial data optimization error:', error);
      return getDefaultSpatialData();
    }
  }
);


// Make sure all these selectors are properly exported individually
export {
  selectSpatialData,
  selectSpatialStatus,
  selectSpatialUI,
};
