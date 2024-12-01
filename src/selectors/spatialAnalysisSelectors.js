// src/selectors/spatialAnalysisSelectors.js

import { createSelector } from '@reduxjs/toolkit';
import {
  selectTimeSeriesData,
  selectMarketClusters,
  selectGeometryData,
  selectSpatialAutocorrelation,
  selectMarketShocks,
  selectMarketFlows,
  selectMarketIntegration,
  selectSeasonalAnalysis
} from './optimizedSelectors';
import { DEFAULT_METRICS, DEFAULT_OVERALL_METRICS } from '../components/spatialAnalysis/types';

// Cluster Analysis Selectors
export const selectEnhancedClusters = createSelector(
  [selectMarketClusters, selectTimeSeriesData],
  (clusters, timeSeriesData) => {
    if (!clusters?.length || !timeSeriesData?.length) return [];

    return clusters.map(cluster => {
      const clusterData = timeSeriesData.filter(d => 
        cluster.connected_markets.includes(d.region)
      );

      if (!clusterData.length) {
        return {
          ...cluster,
          metrics: DEFAULT_METRICS
        };
      }

      const avgPrice = clusterData.reduce((sum, d) => sum + (d.usdPrice || 0), 0) / clusterData.length;
      const avgConflict = clusterData.reduce((sum, d) => sum + (d.conflictIntensity || 0), 0) / clusterData.length;

      return {
        ...cluster,
        metrics: {
          avgPrice,
          avgConflict,
          marketCount: cluster.connected_markets.length
        }
      };
    });
  }
);

// Spatial Autocorrelation Selectors
export const selectGlobalAutocorrelation = createSelector(
  [selectSpatialAutocorrelation],
  (autocorrelation) => {
    if (!autocorrelation?.global) {
      return {
        moran_i: 0,
        p_value: null,
        z_score: null,
        significance: false
      };
    }

    return {
      moran_i: autocorrelation.global.moran_i || 0,
      p_value: autocorrelation.global.p_value,
      z_score: autocorrelation.global.z_score,
      significance: autocorrelation.global.significance || false
    };
  }
);

export const selectLocalAutocorrelation = createSelector(
  [selectSpatialAutocorrelation],
  (autocorrelation) => {
    if (!autocorrelation?.local) {
      return {};
    }

    return Object.entries(autocorrelation.local).reduce((acc, [region, stats]) => {
      acc[region] = {
        local_i: stats.local_i || 0,
        p_value: stats.p_value,
        cluster_type: stats.cluster_type || 'not_significant',
        z_score: stats.z_score
      };
      return acc;
    }, {});
  }
);

export const selectAutocorrelationByRegion = createSelector(
  [selectLocalAutocorrelation, (_, regionId) => regionId],
  (localStats, regionId) => localStats[regionId] || null
);

export const selectSignificantClusters = createSelector(
  [selectLocalAutocorrelation],
  (localStats) => {
    const clusters = {
      'high-high': [],
      'low-low': [],
      'high-low': [],
      'low-high': [],
      'not_significant': []
    };

    Object.entries(localStats).forEach(([region, stats]) => {
      const type = stats.cluster_type || 'not_significant';
      clusters[type].push({
        region,
        ...stats
      });
    });

    return clusters;
  }
);

export const selectAutocorrelationSummary = createSelector(
  [selectGlobalAutocorrelation, selectLocalAutocorrelation],
  (global, local) => {
    const localCount = Object.keys(local).length;
    const significantCount = Object.values(local).filter(
      stats => stats.p_value && stats.p_value < 0.05
    ).length;

    return {
      globalMoranI: global.moran_i,
      globalSignificance: global.significance,
      totalRegions: localCount,
      significantRegions: significantCount,
      significanceRate: localCount ? (significantCount / localCount) * 100 : 0
    };
  }
);

// Overall Metrics Selector
export const selectOverallMetrics = createSelector(
  [selectEnhancedClusters],
  (clusters) => {
    if (!clusters?.length) return DEFAULT_OVERALL_METRICS;

    const totalMarkets = clusters.reduce((sum, c) => sum + c.metrics.marketCount, 0);
    const avgPrice = clusters.reduce((sum, c) => sum + c.metrics.avgPrice, 0) / clusters.length;
    const avgConflict = clusters.reduce((sum, c) => sum + c.metrics.avgConflict, 0) / clusters.length;

    return {
      totalMarkets,
      avgPrice,
      avgConflict
    };
  }
);

// Cluster Analysis Data Selector
export const selectClusterAnalysisData = createSelector(
  [selectEnhancedClusters, selectOverallMetrics, selectGeometryData],
  (clusters, metrics, geometry) => ({
    clusters,
    metrics,
    geometry
  })
);

// Flow Analysis Selector
export const selectFlowAnalysisData = createSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => {
    if (!flows?.length) return null;

    const flowData = flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      totalFlow: flow.total_flow || flow.value,
      avgFlow: flow.avg_flow || flow.average,
      flowCount: flow.flow_count || flow.count,
      avgPriceDifferential: flow.avg_price_differential || flow.priceDiff
    }));

    return {
      flows: flowData,
      geometry,
      summary: {
        totalFlows: flowData.length,
        averageFlowStrength: flowData.reduce((sum, f) => sum + f.avgFlow, 0) / flowData.length,
        maxFlow: Math.max(...flowData.map(f => f.totalFlow))
      }
    };
  }
);

// Shock Analysis Selector
export const selectShockAnalysisData = createSelector(
  [selectMarketShocks, selectGeometryData],
  (shocks, geometry) => {
    if (!shocks?.length) return null;

    const shocksByType = shocks.reduce((acc, shock) => {
      const type = shock.shock_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(shock);
      return acc;
    }, {});

    return {
      shocks,
      shocksByType,
      geometry,
      summary: {
        totalShocks: shocks.length,
        priceDrops: shocks.filter(s => s.shock_type === 'price_drop').length,
        priceSurges: shocks.filter(s => s.shock_type === 'price_surge').length,
        averageMagnitude: shocks.reduce((sum, s) => sum + s.magnitude, 0) / shocks.length
      }
    };
  }
);

// Conflict Analysis Selector
export const selectConflictAnalysisData = createSelector(
  [selectTimeSeriesData, selectGeometryData],
  (timeSeriesData, geometry) => {
    if (!timeSeriesData?.length) return null;

    const conflictData = timeSeriesData.reduce((acc, entry) => {
      if (!acc[entry.region]) {
        acc[entry.region] = {
          intensities: [],
          average: 0,
          max: 0
        };
      }
      acc[entry.region].intensities.push(entry.conflictIntensity || 0);
      return acc;
    }, {});

    Object.keys(conflictData).forEach(region => {
      const intensities = conflictData[region].intensities;
      conflictData[region].average = intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
      conflictData[region].max = Math.max(...intensities);
    });

    return {
      conflictData,
      geometry,
      summary: {
        averageIntensity: Object.values(conflictData)
          .reduce((sum, r) => sum + r.average, 0) / Object.keys(conflictData).length,
        maxIntensity: Math.max(...Object.values(conflictData).map(r => r.max))
      }
    };
  }
);

// Seasonal Analysis Selector
export const selectSeasonalAnalysisData = createSelector(
  [selectTimeSeriesData],
  (timeSeriesData) => {
    if (!timeSeriesData?.length) return null;

    const monthlyData = timeSeriesData.reduce((acc, entry) => {
      const month = entry.month.split('-')[1];
      if (!acc[month]) acc[month] = [];
      acc[month].push(entry.usdPrice);
      return acc;
    }, {});

    const monthlyStats = Object.entries(monthlyData).map(([month, prices]) => ({
      month,
      averagePrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      volatility: Math.sqrt(
        prices.reduce((sum, p) => sum + Math.pow(p - prices[0], 2), 0) / prices.length
      ) / prices[0]
    }));

    return {
      monthlyStats,
      summary: {
        highestPriceMonth: monthlyStats.reduce((max, curr) => 
          curr.averagePrice > max.averagePrice ? curr : max
        ),
        lowestPriceMonth: monthlyStats.reduce((min, curr) => 
          curr.averagePrice < min.averagePrice ? curr : min
        )
      }
    };
  }
);

// Network Analysis Selector
export const selectNetworkAnalysisData = createSelector(
  [selectMarketFlows, selectMarketClusters],
  (flows, clusters) => {
    if (!flows?.length || !clusters?.length) return null;

    const nodes = clusters.map(cluster => ({
      id: cluster.region,
      label: cluster.main_market,
      group: cluster.cluster_id,
      markets: cluster.connected_markets.length
    }));

    const edges = flows.map(flow => ({
      from: flow.source,
      to: flow.target,
      value: flow.total_flow || flow.value,
      title: `Flow: ${(flow.total_flow || flow.value).toFixed(2)}`
    }));

    return {
      network: { nodes, edges },
      summary: {
        nodes: nodes.length,
        edges: edges.length,
        density: (2 * edges.length) / (nodes.length * (nodes.length - 1))
      }
    };
  }
);

// Market Health Selector
export const selectMarketHealthData = createSelector(
  [selectTimeSeriesData, selectMarketShocks, selectMarketFlows],
  (timeSeriesData, shocks, flows) => {
    if (!timeSeriesData?.length) return null;

    const marketHealth = {};
    
    timeSeriesData.forEach(entry => {
      if (!marketHealth[entry.region]) {
        marketHealth[entry.region] = {
          prices: [],
          shocks: 0,
          flows: 0,
          conflictIntensity: 0
        };
      }
      marketHealth[entry.region].prices.push(entry.usdPrice);
      marketHealth[entry.region].conflictIntensity = entry.conflictIntensity || 0;
    });

    shocks.forEach(shock => {
      if (marketHealth[shock.region]) {
        marketHealth[shock.region].shocks++;
      }
    });

    flows.forEach(flow => {
      if (marketHealth[flow.source]) marketHealth[flow.source].flows++;
      if (marketHealth[flow.target]) marketHealth[flow.target].flows++;
    });

    Object.keys(marketHealth).forEach(region => {
      const health = marketHealth[region];
      const priceStability = 1 - (Math.sqrt(
        health.prices.reduce((sum, p) => sum + Math.pow(p - health.prices[0], 2), 0) / 
        health.prices.lengthselectEnhancedClusters
      ) / health.prices[0]);

      marketHealth[region].healthScore = (
        priceStability * 0.4 +
        (1 - health.shocks / 10) * 0.3 +
        (health.flows / 10) * 0.2 +
        (1 - health.conflictIntensity / 10) * 0.1
      );
    });

    return {
      marketHealth,
      summary: {
        averageHealth: Object.values(marketHealth)
          .reduce((sum, m) => sum + m.healthScore, 0) / Object.keys(marketHealth).length,
        healthyMarkets: Object.values(marketHealth)
          .filter(m => m.healthScore > 0.7).length
      }
    };
  }
);

// Export default object with all selectors
export default {
  // Cluster Analysis
  selectEnhancedClusters,
  selectOverallMetrics,
  selectClusterAnalysisData,
  // Spatial Autocorrelation
  selectGlobalAutocorrelation,
  selectLocalAutocorrelation,
  selectAutocorrelationByRegion,
  selectSignificantClusters,
  selectAutocorrelationSummary,
  // Flow Analysis
  selectFlowAnalysisData,
  // Shock Analysis
  selectShockAnalysisData,
  // Conflict Analysis
  selectConflictAnalysisData,
  // Seasonal Analysis
  selectSeasonalAnalysisData,
  // Network Analysis
  selectNetworkAnalysisData,
  // Market Health
  selectMarketHealthData
};
