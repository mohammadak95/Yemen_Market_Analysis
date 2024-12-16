// src/utils/optimizedSelectors.js

import { createSelector } from '@reduxjs/toolkit';
import { createSelectorCreator, defaultMemoize } from 'reselect';
import _ from 'lodash';

// Create custom selector with deep equality check
const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  _.isEqual
);

// Base state selectors with safe defaults
const selectSpatialState = state => state.spatial || {};
const selectUIState = state => state.spatial?.ui || {};
const selectData = state => state.spatial?.data || {};
const selectStatus = state => state.spatial?.status || {};

// Optimized UI state selectors
export const selectSelectedCommodity = createSelector(
  [selectUIState],
  ui => ui.selectedCommodity || ''
);

export const selectSelectedDate = createSelector(
  [selectUIState],
  ui => ui.selectedDate || ''
);

export const selectVisualizationMode = createSelector(
  [selectUIState],
  ui => ui.visualizationMode || 'prices'
);

export const selectSelectedRegimes = createSelector(
  [selectUIState],
  ui => ui.selectedRegimes || ['unified']
);

// Optimized data selectors with memoization
export const selectTimeSeriesData = createDeepEqualSelector(
  [selectData],
  data => data.timeSeriesData || []
);

export const selectMarketClusters = createDeepEqualSelector(
  [selectData],
  data => data.marketClusters || []
);

export const selectFlowMaps = createDeepEqualSelector(
  [selectData],
  data => data.flowMaps || []
);

export const selectMarketShocks = createDeepEqualSelector(
  [selectData],
  data => data.marketShocks || []
);

// Complex derived selectors
export const selectFilteredTimeSeriesData = createDeepEqualSelector(
  [selectTimeSeriesData, selectSelectedRegimes, selectSelectedDate],
  (timeSeriesData, selectedRegimes, selectedDate) => {
    if (!timeSeriesData?.length) return [];
    
    return timeSeriesData.filter(data => 
      (!selectedDate || data.date === selectedDate) &&
      (!selectedRegimes.length || selectedRegimes.includes(data.regime))
    );
  }
);

export const selectClusterMetrics = createDeepEqualSelector(
  [selectMarketClusters],
  (clusters) => {
    if (!clusters?.length) return null;

    return {
      totalClusters: clusters.length,
      averageSize: _.meanBy(clusters, c => c.connected_markets.length + 1),
      efficiencyStats: {
        average: _.meanBy(clusters, 'metrics.efficiency'),
        min: _.minBy(clusters, 'metrics.efficiency')?.metrics.efficiency,
        max: _.maxBy(clusters, 'metrics.efficiency')?.metrics.efficiency
      },
      marketCoverage: calculateMarketCoverage(clusters)
    };
  }
);

export const selectFlowAnalysis = createDeepEqualSelector(
  [selectFlowMaps, selectSelectedDate],
  (flows, selectedDate) => {
    if (!flows?.length) return null;

    const filteredFlows = selectedDate ? 
      flows.filter(flow => flow.date === selectedDate) : 
      flows;

    return {
      totalFlows: filteredFlows.length,
      averageWeight: _.meanBy(filteredFlows, 'flow_weight'),
      maxWeight: _.maxBy(filteredFlows, 'flow_weight')?.flow_weight,
      marketConnections: calculateMarketConnections(filteredFlows)
    };
  }
);

export const selectVisualizationData = createDeepEqualSelector(
  [
    selectFilteredTimeSeriesData,
    selectMarketClusters,
    selectFlowMaps,
    selectMarketShocks,
    selectVisualizationMode
  ],
  (timeSeriesData, clusters, flows, shocks, mode) => {
    switch (mode) {
      case 'prices':
        return processPriceData(timeSeriesData);
      case 'integration':
        return processIntegrationData(clusters, flows);
      case 'clusters':
        return processClusterData(clusters);
      case 'shocks':
        return processShockData(shocks);
      default:
        return null;
    }
  }
);

// Helper functions
const calculateMarketCoverage = (clusters) => {
  const uniqueMarkets = new Set();
  clusters.forEach(cluster => {
    uniqueMarkets.add(cluster.main_market);
    cluster.connected_markets.forEach(market => uniqueMarkets.add(market));
  });
  return uniqueMarkets.size;
};

const calculateMarketConnections = (flows) => {
  const connections = new Map();
  flows.forEach(flow => {
    if (!connections.has(flow.source)) {
      connections.set(flow.source, new Set());
    }
    if (!connections.has(flow.target)) {
      connections.set(flow.target, new Set());
    }
    connections.get(flow.source).add(flow.target);
    connections.get(flow.target).add(flow.source);
  });
  return connections;
};

const processPriceData = (timeSeriesData) => {
  return _.groupBy(timeSeriesData, 'region');
};

const processIntegrationData = (clusters, flows) => {
  return {
    clusters: clusters.map(cluster => ({
      id: cluster.cluster_id,
      markets: [cluster.main_market, ...cluster.connected_markets],
      efficiency: cluster.metrics.efficiency
    })),
    flows: flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      weight: flow.flow_weight
    }))
  };
};

const processClusterData = (clusters) => {
  return clusters.map(cluster => ({
    id: cluster.cluster_id,
    mainMarket: cluster.main_market,
    connectedMarkets: cluster.connected_markets,
    metrics: cluster.metrics
  }));
};

const processShockData = (shocks) => {
  return _.groupBy(shocks, 'region');
};