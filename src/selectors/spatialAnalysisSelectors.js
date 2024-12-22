// src/selectors/spatialAnalysisSelectors.js

import { createDeepEqualSelector } from './selectorUtils';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { 
  transformRegionName, 
  getRegionCoordinates, 
  calculateCenter 
} from '../components/spatialAnalysis/utils/spatialUtils';
import { flowValidation } from '../components/spatialAnalysis/features/flows/types';
import {
  DEFAULT_METRICS,
  DEFAULT_OVERALL_METRICS
} from '../components/spatialAnalysis/types';

// Ensure that the selectors imported below are correctly named and exported from 'optimizedSelectors.js'
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

/**
 * Selector to retrieve the entire spatial analysis state.
 */
export const selectSpatialState = createDeepEqualSelector(
  (state) => state.spatialAnalysis,
  (spatialAnalysis) => 
    spatialAnalysis || {
      timeSeriesData: [],
      spatialAutocorrelation: {
        global: null,
        local: null
      }
    }
);

/**
 * Selector to retrieve time series data.
 */
export const selectTimeSeriesDataSelector = createDeepEqualSelector(
  [selectSpatialState],
  (spatialState) => spatialState.timeSeriesData || []
);

/**
 * Selector to retrieve spatial autocorrelation data.
 */
export const selectSpatialAutocorrelationSelector = createDeepEqualSelector(
  [selectSpatialState],
  (spatialState) => 
    spatialState.spatialAutocorrelation || {
      global: null,
      local: null
    }
);

/**
 * Selector to retrieve global autocorrelation metrics.
 */
export const selectGlobalAutocorrelation = createDeepEqualSelector(
  [selectSpatialAutocorrelationSelector],
  (autocorrelation) =>
    autocorrelation.global || {
      moran_i: 0,
      p_value: null,
      z_score: null,
      significance: false
    }
);

/**
 * Selector to retrieve local autocorrelation metrics.
 */
export const selectLocalAutocorrelation = createDeepEqualSelector(
  [selectSpatialAutocorrelationSelector],
  (autocorrelation) => autocorrelation.local || {}
);

/**
 * Selector to categorize significant clusters based on local autocorrelation.
 */
export const selectSignificantClusters = createDeepEqualSelector(
  [selectLocalAutocorrelation],
  (local) => {
    const clusters = {
      'high-high': [],
      'low-low': [],
      'high-low': [],
      'low-high': [],
      'not_significant': []
    };

    if (!local) return clusters;

    Object.entries(local).forEach(([region, stats]) => {
      const type = stats.cluster_type || 'not_significant';
      clusters[type].push({
        region,
        ...stats
      });
    });

    return clusters;
  }
);

/**
 * Selector to summarize autocorrelation data.
 */
export const selectAutocorrelationSummary = createDeepEqualSelector(
  [selectGlobalAutocorrelation, selectLocalAutocorrelation],
  (global, local) => {
    const localCount = Object.keys(local).length;
    const significantCount = Object.values(local).filter(
      (stats) => stats.p_value && stats.p_value < 0.05
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

/**
 * Selector to retrieve autocorrelation data for a specific region.
 *
 * @param {Object} state - The Redux state.
 * @param {string} regionId - The ID of the region.
 * @returns {Object|null} - Autocorrelation data for the region or null.
 */
export const selectAutocorrelationByRegion = createDeepEqualSelector(
  [selectLocalAutocorrelation, (_, regionId) => regionId],
  (local, regionId) => local[regionId] || null
);

/**
 * Selector to enhance market clusters with additional metrics based on time series data.
 */
export const selectEnhancedClusters = createDeepEqualSelector(
  [selectMarketClusters, selectTimeSeriesDataSelector],
  (clusters, timeSeriesData) => {
    if (!clusters?.length || !timeSeriesData?.length) return [];

    return clusters.map((cluster) => {
      const clusterData = timeSeriesData.filter((d) =>
        cluster.connected_markets.includes(d.region)
      );

      if (!clusterData.length) {
        return {
          ...cluster,
          metrics: DEFAULT_METRICS
        };
      }

      const avgPrice =
        clusterData.reduce((sum, d) => sum + (d.usdPrice || 0), 0) /
        clusterData.length;
      const avgConflict =
        clusterData.reduce((sum, d) => sum + (d.conflictIntensity || 0), 0) /
        clusterData.length;

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

/**
 * Selector to compute overall metrics across all enhanced clusters.
 */
export const selectOverallMetrics = createDeepEqualSelector(
  [selectEnhancedClusters],
  (clusters) => {
    if (!clusters?.length) return DEFAULT_OVERALL_METRICS;

    const totalMarkets = clusters.reduce(
      (sum, c) => sum + c.metrics.marketCount,
      0
    );
    const avgPrice =
      clusters.reduce((sum, c) => sum + c.metrics.avgPrice, 0) /
      clusters.length;
    const avgConflict =
      clusters.reduce((sum, c) => sum + c.metrics.avgConflict, 0) /
      clusters.length;

    return {
      totalMarkets,
      avgPrice,
      avgConflict
    };
  }
);

/**
 * Selector to aggregate cluster analysis data.
 */
export const selectClusterAnalysisData = createDeepEqualSelector(
  [selectEnhancedClusters, selectOverallMetrics, selectGeometryData],
  (clusters, metrics, geometry) => ({
    clusters,
    metrics,
    geometry
  })
);

/**
 * Selector to analyze flow data and summarize key metrics.
 */
export const selectFlowAnalysisData = createDeepEqualSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => {
    if (!flows?.length) return null;

    const flowData = flows.map((flow) => ({
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
        averageFlowStrength:
          flowData.reduce((sum, f) => sum + f.avgFlow, 0) / flowData.length,
        maxFlow: Math.max(...flowData.map((f) => f.totalFlow))
      }
    };
  }
);

/**
 * Selector to analyze shock data and categorize shocks by type.
 */
export const selectShockAnalysisData = createDeepEqualSelector(
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
        priceDrops: shocks.filter((s) => s.shock_type === 'price_drop').length,
        priceSurges: shocks.filter((s) => s.shock_type === 'price_surge').length,
        averageMagnitude:
          shocks.reduce((sum, s) => sum + s.magnitude, 0) / shocks.length
      }
    };
  }
);

/**
 * Selector to analyze conflict intensity across regions.
 */
export const selectConflictAnalysisData = createDeepEqualSelector(
  [selectTimeSeriesDataSelector, selectGeometryData],
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

    Object.keys(conflictData).forEach((region) => {
      const intensities = conflictData[region].intensities;
      conflictData[region].average =
        intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
      conflictData[region].max = Math.max(...intensities);
    });

    return {
      conflictData,
      geometry,
      summary: {
        averageIntensity:
          Object.values(conflictData).reduce((sum, r) => sum + r.average, 0) /
          Object.keys(conflictData).length,
        maxIntensity: Math.max(
          ...Object.values(conflictData).map((r) => r.max)
        )
      }
    };
  }
);

/**
 * Selector to analyze seasonal patterns in price data.
 */
export const selectSeasonalAnalysisData = createDeepEqualSelector(
  [selectTimeSeriesDataSelector],
  (timeSeriesData) => {
    if (!timeSeriesData?.length) return null;

    const monthlyData = timeSeriesData.reduce((acc, entry) => {
      const month = entry.month.split('-')[1];
      if (!acc[month]) acc[month] = [];
      acc[month].push(entry.usdPrice);
      return acc;
    }, {});

    const monthlyStats = Object.entries(monthlyData).map(([month, prices]) => {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance =
        prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) /
        prices.length;
      const volatility = avgPrice !== 0 ? Math.sqrt(variance) / avgPrice : 0;

      return {
        month,
        averagePrice: avgPrice,
        volatility
      };
    });

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

/**
 * Selector to perform network analysis on market flows and clusters.
 */
export const selectNetworkAnalysisData = createDeepEqualSelector(
  [selectMarketFlows, selectMarketClusters],
  (flows, clusters) => {
    if (!flows?.length || !clusters?.length) return null;

    const nodes = clusters.map((cluster) => ({
      id: cluster.region,
      label: cluster.main_market,
      group: cluster.cluster_id,
      markets: cluster.connected_markets.length
    }));

    const edges = flows.map((flow) => ({
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
        density:
          nodes.length > 1
            ? (2 * edges.length) / (nodes.length * (nodes.length - 1))
            : 0
      }
    };
  }
);

/**
 * Selector to perform regression analysis based on the selected commodity.
 *
 * @param {Object} state - The Redux state.
 * @param {string} commodity - The selected commodity.
 * @returns {Object|null} - Processed regression analysis data or null.
 */
export const selectRegressionAnalysis = createDeepEqualSelector(
  [selectSpatialState, (_, commodity) => commodity],
  (spatialState, commodity) => {
    const metric = backgroundMonitor.startMetric('regression-analysis');

    try {
      const regression = spatialState?.regressionAnalysis;
      if (!regression || !commodity) {
        metric.finish({ status: 'success', commodity });
        return null;
      }

      const metadata = regression.metadata || {};

      // Only process if commodity matches
      if (commodity && metadata.commodity !== commodity) {
        metric.finish({ status: 'success', commodity });
        return null;
      }

      const result = {
        model: regression.model || {},
        spatial: {
          moran_i: regression.spatial?.moran_i || { I: 0, 'p-value': null },
          vif: Array.isArray(regression.spatial?.vif)
            ? regression.spatial.vif
            : []
        },
        residuals: {
          raw: Array.isArray(regression.residuals?.raw)
            ? regression.residuals.raw
            : [],
          byRegion: regression.residuals?.byRegion || {},
          stats: {
            mean: 0,
            variance: 0,
            maxAbsolute: 0,
            ...regression.residuals?.stats
          }
        },
        metadata: {
          commodity,
          timestamp: metadata.timestamp || new Date().toISOString(),
          version: metadata.version || '1.0'
        }
      };

      metric.finish({ status: 'success', commodity });
      return result;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Regression analysis error:', error);
      return null;
    }
  }
);

/**
 * Selector to enrich clusters with their corresponding coordinates.
 */
export const selectClustersWithCoordinates = createDeepEqualSelector(
  [selectMarketClusters, selectGeometryData],
  (clusters, geometry) => {
    if (!clusters?.length || !geometry?.features) return [];

    return clusters.map((cluster) => ({
      ...cluster,
      coordinates: getRegionCoordinates(cluster.region) || [0, 0]
    }));
  }
);

/**
 * Selector to enrich flows with source and target coordinates.
 */
export const selectFlowsWithCoordinates = createDeepEqualSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => {
    if (!flows?.length || !geometry?.features) return [];

    return flows.map((flow) => ({
      ...flow,
      sourceCoords: getRegionCoordinates(flow.source) || [0, 0],
      targetCoords: getRegionCoordinates(flow.target) || [0, 0]
    }));
  }
);

/**
 * Selector to aggregate visualization data combining clusters and flows with coordinates.
 */
export const selectVisualizationData = createDeepEqualSelector(
  [selectClustersWithCoordinates, selectFlowsWithCoordinates],
  (clusters, flows) => {
    return {
      clusters,
      flows
    };
  }
);

/**
 * Selector to retrieve market health data along with a summary.
 */
export const selectMarketHealthData = createDeepEqualSelector(
  [selectTimeSeriesDataSelector, selectMarketShocks, selectMarketFlows],
  (timeSeriesData, shocks, flows) => {
    if (!timeSeriesData?.length) return null;

    const marketHealth = {};

    // Build up a structure of region => stats
    timeSeriesData.forEach((entry) => {
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

    // Add shock counts
    (shocks || []).forEach((shock) => {
      if (marketHealth[shock.region]) {
        marketHealth[shock.region].shocks++;
      }
    });

    // Add flows count
    (flows || []).forEach((flow) => {
      if (marketHealth[flow.source]) marketHealth[flow.source].flows++;
      if (marketHealth[flow.target]) marketHealth[flow.target].flows++;
    });

    // Calculate final health scores
    Object.keys(marketHealth).forEach((region) => {
      const health = marketHealth[region];
      const averagePrice =
        health.prices.reduce((sum, p) => sum + p, 0) / health.prices.length;
      const variance =
        health.prices.reduce(
          (sum, p) => sum + Math.pow(p - averagePrice, 2),
          0
        ) / health.prices.length;
      const priceStability = averagePrice
        ? 1 - Math.sqrt(variance) / averagePrice
        : 0;

      // Weighted formula for "healthScore":
      marketHealth[region].healthScore =
        (priceStability * 0.4) +
        ((health.shocks < 10 ? (1 - health.shocks / 10) : 0) * 0.3) +
        ((health.flows / 10) * 0.2) +
        ((1 - (health.conflictIntensity / 10)) * 0.1);
    });

    const totalRegions = Object.keys(marketHealth).length;
    const totalHealth = Object.values(marketHealth).reduce(
      (sum, m) => sum + m.healthScore,
      0
    );
    const averageHealth = totalRegions ? totalHealth / totalRegions : 0;
    const healthyMarkets = Object.values(marketHealth).filter(
      (m) => m.healthScore > 0.7
    ).length;

    return {
      marketHealth,
      summary: {
        averageHealth,
        healthyMarkets
      }
    };
  }
);