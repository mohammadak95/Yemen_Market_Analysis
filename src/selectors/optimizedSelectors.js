// src/selectors/optimizedSelectors.js
// Based on previous discussions on 'reselect' (Jones 2016) and Redux Toolkit (Redux 2021)

import { createSelector } from '@reduxjs/toolkit';
import { createSelectorCreator } from 'reselect';
import isEqual from 'lodash/isEqual';
import _ from 'lodash';
import { 
  transformRegionName, 
  getRegionCoordinates, 
  calculateCenter 
} from '../components/spatialAnalysis/utils/spatialUtils';

// Custom defaultMemoize function to replicate behavior in older reselect versions
function defaultMemoize(func, equalityCheck = isEqual) {
  let lastArgs = null;
  let lastResult = null;
  return (...args) => {
    if (
      lastArgs !== null &&
      args.length === lastArgs.length &&
      args.every((value, index) => equalityCheck(value, lastArgs[index]))
    ) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = func(...args);
    return lastResult;
  };
}

const YEMEN_COORDINATES = {
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

const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  isEqual
);

const selectData = state => state.spatial?.data;
const selectUI = state => state.spatial?.ui;
export const selectStatus = state => state.spatial?.status;

export const selectLoadingStatus = createSelector(
  [selectStatus],
  (status) => ({
    loading: status?.loading || false,
    stage: status?.stage || '',
    progress: status?.progress || 0
  })
);

const selectSpatialData = state => state.spatial?.data;
const selectSpatialStatus = state => state.spatial?.status;
const selectSpatialUI = state => state.spatial?.ui;

const selectSpatialState = createSelector(
  [selectSpatialData, selectSpatialStatus, selectSpatialUI],
  (data, status, ui) => ({ data, status, ui })
);

export const selectStage = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.status?.stage || 'idle'
);

export const selectTimeSeriesData = createDeepEqualSelector(
  [selectData],
  (data) => data?.timeSeriesData || []
);

export const selectGeometryData = createDeepEqualSelector(
  [selectData],
  (data) => data?.geometry || {}
);

export const selectMarketIntegration = createDeepEqualSelector(
  [selectData],
  (data) => data?.marketIntegration || {}
);

export const selectFlowMaps = createDeepEqualSelector(
  [selectData],
  (data) => data?.flowMaps || []
);

export const selectSelectedDate = createSelector(
  [selectUI],
  (ui) => ui?.selectedDate || ''
);

export const selectFilteredFlowData = createDeepEqualSelector(
  [selectFlowMaps, selectSelectedDate],
  (flowMaps, selectedDate) => {
    if (!Array.isArray(flowMaps) || !selectedDate) return [];
    const targetMonth = selectedDate.substring(0, 7);
    return flowMaps.filter(flow => flow?.date?.substring(0, 7) === targetMonth);
  }
);

export const selectMarketMetrics = createDeepEqualSelector(
  [selectFilteredFlowData],
  (flows) => {
    if (!flows.length) return {
      totalFlows: 0,
      averageFlow: 0,
      maxFlow: 0,
      activeMarkets: 0
    };

    const flowValues = flows.map(f => f.total_flow || 0);
    const markets = new Set();
    flows.forEach(f => {
      markets.add(f.source);
      markets.add(f.target);
    });

    return {
      totalFlows: flowValues.reduce((sum, val) => sum + val, 0),
      averageFlow: flowValues.reduce((sum, val) => sum + val, 0) / flowValues.length,
      maxFlow: Math.max(...flowValues),
      activeMarkets: markets.size
    };
  }
);

export const convertUTMtoLatLng = (easting, northing) => {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const falseEasting = 500000;
  const zone = 38;

  const x = easting - falseEasting;
  const y = northing;

  const M = y / k0;
  const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64));

  const phi1 = mu + (3 * e1sq / 2 - 27 * Math.pow(e1sq, 3) / 32) * Math.sin(2 * mu);
  const phi2 = phi1 + (21 * Math.pow(e1sq, 2) / 16 - 55 * Math.pow(e1sq, 4) / 32) * Math.sin(4 * mu);
  const phi = phi2 + (151 * Math.pow(e1sq, 3) / 96) * Math.sin(6 * mu);

  const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi) * Math.sin(phi));
  const T1 = Math.tan(phi) * Math.tan(phi);
  const C1 = (e * e * Math.cos(phi) * Math.cos(phi)) / (1 - e * e);
  const R1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.sin(phi) * Math.sin(phi), 1.5);
  const D = x / (N1 * k0);

  const lat = phi - (N1 * Math.tan(phi) / R1) * (
    (D * D) / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e * e) * Math.pow(D, 4) / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e * e - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720
  );
  const lon = ((zone * 6 - 183) + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e * e + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120)
  ) / Math.cos(phi) * (180 / Math.PI);

  return [lon, lat];
};

const validateCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) {
    return null;
  }
  
  const [lon, lat] = coords;
  if (typeof lon !== 'number' || typeof lat !== 'number' ||
      isNaN(lon) || isNaN(lat) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }
  return [lon, lat];
};

const calculateVolatility = (values) => {
  if (values.length < 2) return 0;
  try {
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i-1] > 0) {
        returns.push(Math.log(values[i] / values[i-1]));
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

const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return 0;
  
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371;
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
  try {
    let totalDistance = 0;
    let count = 0;
    for (let i = 0; i < coordinates.length; i++) {
      for (let j = i + 1; j < coordinates.length; j++) {
        const dist = calculateDistance(coordinates[i], coordinates[j]);
        if (typeof dist === 'number' && !isNaN(dist)) {
          totalDistance += dist;
          count++;
        }
      }
    }
    return count > 0 ? totalDistance / count : 0;
  } catch {
    return 0;
  }
};

const selectUiState = createSelector(
  [selectSpatialState],
  (spatial) => spatial?.ui || {}
);

export const selectVisualizationMode = createSelector(
  [selectSpatialUI],
  (ui) => ui?.visualizationMode || 'prices'
);

export const selectSelectedCommodity = createSelector(
  [selectSpatialUI],
  (ui) => ui?.selectedCommodity || ''
);

export const selectUnifiedGeometry = createSelector(
  [selectGeometryData],
  (geometry) => {
    try {
      if (!geometry?.unified) return null;
      return {
        type: 'FeatureCollection',
        features: Array.isArray(geometry.unified) ? geometry.unified : [],
        properties: {
          type: 'unified',
          timestamp: Date.now()
        }
      };
    } catch {
      return null;
    }
  }
);

export const selectMarketClusters = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      if (!data || !Array.isArray(data.marketClusters)) {
        return [];
      }
      return data.marketClusters.map(cluster => {
        const metrics = cluster.metrics || {};
        return {
          ...cluster,
          metrics: {
            marketCount: cluster.connected_markets?.length || 0,
            avgPrice: typeof metrics.avgPrice === 'number' ? metrics.avgPrice : 0,
            avgConflict: typeof metrics.avgConflict === 'number' ? metrics.avgConflict : 0,
            efficiency: typeof metrics.efficiency === 'number' ? metrics.efficiency : 0,
            efficiencyComponents: {
              connectivity: typeof metrics.efficiencyComponents?.connectivity === 'number' ?
                metrics.efficiencyComponents.connectivity : 0,
              priceIntegration: typeof metrics.efficiencyComponents?.priceIntegration === 'number' ?
                metrics.efficiencyComponents.priceIntegration : 0,
              stability: typeof metrics.efficiencyComponents?.stability === 'number' ?
                metrics.efficiencyComponents.stability : 0,
              conflictResilience: typeof metrics.efficiencyComponents?.conflictResilience === 'number' ?
                metrics.efficiencyComponents.conflictResilience : 0
            },
            internal_connectivity: typeof metrics.internal_connectivity === 'number' ? metrics.internal_connectivity : 0,
            market_coverage: typeof metrics.market_coverage === 'number' ? metrics.market_coverage : 0,
            price_convergence: typeof metrics.price_convergence === 'number' ? metrics.price_convergence : 0
          }
        };
      });
    } catch {
      return [];
    }
  }
);

export const selectMarketFlows = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      if (!data || !Array.isArray(data.flowMaps)) {
        return [];
      }
      return data.flowMaps.map(flow => ({
        ...flow,
        source: flow.source || '',
        target: flow.target || '',
        total_flow: typeof flow.total_flow === 'number' ? flow.total_flow : 0,
        avg_flow: typeof flow.avg_flow === 'number' ? flow.avg_flow : 0,
        flow_count: typeof flow.flow_count === 'number' ? flow.flow_count : 0,
        avg_price_differential: typeof flow.avg_price_differential === 'number' ? flow.avg_price_differential : 0
      }));
    } catch {
      return [];
    }
  }
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      if (!data || !data.spatialAutocorrelation) {
        return {
          global: { moran_i: 0, p_value: 1, z_score: null, significance: false },
          local: {}
        };
      }
      const autocorr = data.spatialAutocorrelation;
      return {
        global: {
          moran_i: typeof autocorr.global?.moran_i === 'number' ? autocorr.global.moran_i : 0,
          p_value: typeof autocorr.global?.p_value === 'number' ? autocorr.global.p_value : 1,
          z_score: autocorr.global?.z_score || null,
          significance: Boolean(autocorr.global?.significance)
        },
        local: Object.entries(autocorr.local || {}).reduce((acc, [key, value]) => {
          acc[key] = {
            local_i: typeof value.local_i === 'number' ? value.local_i : 0,
            p_value: typeof value.p_value === 'number' ? value.p_value : 1,
            cluster_type: value.cluster_type || 'not-significant',
            z_score: typeof value.z_score === 'number' ? value.z_score : 0
          };
          return acc;
        }, {})
      };
    } catch {
      return {
        global: { moran_i: 0, p_value: 1, z_score: null, significance: false },
        local: {}
      };
    }
  }
);

export const selectRegressionAnalysis = createSelector(
  [selectSpatialData, selectSelectedCommodity],
  (data, selectedCommodity) => {
    try {
      if (!data || !data.regressionAnalysis) return null;
      const regression = data.regressionAnalysis;
      const metadata = regression.metadata || {};
      if (metadata.commodity !== selectedCommodity) {
        return null;
      }
      return {
        model: regression.model || {},
        spatial: {
          moran_i: regression.spatial?.moran_i || { I: 0, 'p-value': 1 },
          vif: Array.isArray(regression.spatial?.vif) ? regression.spatial.vif : []
        },
        residuals: {
          raw: Array.isArray(regression.residuals?.raw) ? regression.residuals.raw : [],
          byRegion: regression.residuals?.byRegion || {},
          stats: {
            mean: typeof regression.residuals?.stats?.mean === 'number' ? regression.residuals.stats.mean : 0,
            variance: typeof regression.residuals?.stats?.variance === 'number' ? regression.residuals.stats.variance : 0,
            maxAbsolute: typeof regression.residuals?.stats?.maxAbsolute === 'number' ? regression.residuals.stats.maxAbsolute : 0
          }
        },
        metadata: {
          ...metadata,
          commodity: selectedCommodity,
          timestamp: metadata.timestamp || new Date().toISOString(),
          version: metadata.version || "1.0"
        }
      };
    } catch {
      return {
        model: {},
        spatial: { moran_i: { I: 0, 'p-value': 1 }, vif: [] },
        residuals: { raw: [], byRegion: {}, stats: { mean: 0, variance: 0, maxAbsolute: 0 } },
        metadata: {
          commodity: '',
          timestamp: new Date().toISOString(),
          version: "1.0"
        }
      };
    }
  }
);

export const selectSeasonalAnalysis = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      if (!data || !data.seasonalAnalysis) {
        return {
          seasonal_strength: 0,
          trend_strength: 0,
          peak_month: 0,
          trough_month: 0,
          seasonal_pattern: []
        };
      }
      const seasonal = data.seasonalAnalysis;
      return {
        seasonal_strength: typeof seasonal.seasonal_strength === 'number' ? seasonal.seasonal_strength : 0,
        trend_strength: typeof seasonal.trend_strength === 'number' ? seasonal.trend_strength : 0,
        peak_month: seasonal.peak_month || 0,
        trough_month: seasonal.trough_month || 0,
        seasonal_pattern: Array.isArray(seasonal.seasonal_pattern) ? seasonal.seasonal_pattern : []
      };
    } catch {
      return {
        seasonal_strength: 0,
        trend_strength: 0,
        peak_month: 0,
        trough_month: 0,
        seasonal_pattern: []
      };
    }
  }
);

export const selectMarketShocks = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      if (!data || !Array.isArray(data.marketShocks)) {
        return [];
      }
      return data.marketShocks.map(shock => ({
        ...shock,
        region: shock.region || '',
        date: shock.date || '',
        shock_type: shock.shock_type || '',
        magnitude: typeof shock.magnitude === 'number' ? shock.magnitude : 0,
        current_price: typeof shock.current_price === 'number' ? shock.current_price : 0,
        previous_price: typeof shock.previous_price === 'number' ? shock.previous_price : 0
      }));
    } catch {
      return [];
    }
  }
);

function calculateSpatialDispersion(coordinates) {
  if (!coordinates?.length || coordinates.length < 2) return 0;
  try {
    const center = calculateCenter(coordinates);
    if (!center) return 0;
    const distances = coordinates.map(coord => calculateDistance(coord, center));
    return Math.sqrt(
      distances.reduce((sum, dist) => sum + Math.pow(dist, 2), 0) / distances.length
    );
  } catch {
    return 0;
  }
}

function calculateBoundingBox(coordinates) {
  if (!coordinates?.length) return null;
  try {
    return coordinates.reduce((bounds, coord) => ({
      minLon: Math.min(bounds.minLon, coord[0]),
      maxLon: Math.max(bounds.maxLon, coord[0]),
      minLat: Math.min(bounds.minLat, coord[1]),
      maxLat: Math.max(bounds.maxLat, coord[1])
    }), {
      minLon: Infinity,
      maxLon: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity
    });
  } catch {
    return null;
  }
}

export const selectClustersWithCoordinates = createSelector(
  [selectMarketClusters, selectGeometryData],
  (clusters, geometry) => {
    try {
      if (!clusters?.length || !geometry?.points) {
        return [];
      }

      const coordMap = new Map();
      geometry.points.forEach(point => {
        const normalizedName = transformRegionName(
          point.properties?.normalizedName || 
          point.properties?.region_id || 
          point.properties?.name
        );
        if (normalizedName && Array.isArray(point.coordinates)) {
          coordMap.set(normalizedName, validateCoordinates(point.coordinates));
        }
      });

      return clusters.map(cluster => {
        const marketCoords = (cluster.connected_markets || [])
          .map(market => {
            const normalizedName = transformRegionName(market);
            const coordinates = coordMap.get(normalizedName) || 
                                getRegionCoordinates(normalizedName);
            return {
              name: market,
              normalizedName,
              coordinates,
              isMainMarket: market === cluster.main_market
            };
          })
          .filter(m => m.coordinates);

        const center = calculateCenter(marketCoords.map(m => m.coordinates));
        const avgDistance = calculateAverageDistance(marketCoords.map(m => m.coordinates));
        const spatialCoverage = cluster.connected_markets.length ? 
          marketCoords.length / cluster.connected_markets.length : 0;

        return {
          ...cluster,
          cluster_id: cluster.cluster_id,
          main_market: cluster.main_market,
          connected_markets: cluster.connected_markets,
          markets: marketCoords,
          center: center || [0, 0],
          metrics: {
            efficiency: typeof cluster.metrics?.efficiency === 'number' ? cluster.metrics.efficiency : 0,
            efficiencyComponents: {
              connectivity: typeof cluster.metrics?.efficiencyComponents?.connectivity === 'number' ?
                cluster.metrics.efficiencyComponents.connectivity : 0,
              priceIntegration: typeof cluster.metrics?.efficiencyComponents?.priceIntegration === 'number' ?
                cluster.metrics.efficiencyComponents.priceIntegration : 0,
              stability: typeof cluster.metrics?.efficiencyComponents?.stability === 'number' ?
                cluster.metrics.efficiencyComponents.stability : 0,
              conflictResilience: typeof cluster.metrics?.efficiencyComponents?.conflictResilience === 'number' ?
                cluster.metrics.efficiencyComponents.conflictResilience : 0
            },
            marketCount: cluster.connected_markets?.length || 0,
            avgPrice: typeof cluster.metrics?.avgPrice === 'number' ? 
              cluster.metrics.avgPrice : 0,
            avgConflict: typeof cluster.metrics?.avgConflict === 'number' ? 
              cluster.metrics.avgConflict : 0,
            internal_connectivity: typeof cluster.metrics?.internal_connectivity === 'number' ? 
              cluster.metrics.internal_connectivity : 0,
            market_coverage: typeof cluster.metrics?.market_coverage === 'number' ? 
              cluster.metrics.market_coverage : 0,
            price_convergence: typeof cluster.metrics?.price_convergence === 'number' ? 
              cluster.metrics.price_convergence : 0,
            priceVolatility: typeof cluster.metrics?.priceVolatility === 'number' ?
              cluster.metrics.priceVolatility : 0,
            priceRange: typeof cluster.metrics?.priceRange === 'number' ?
              cluster.metrics.priceRange : 0,
            minPrice: typeof cluster.metrics?.minPrice === 'number' ?
              cluster.metrics.minPrice : 0,
            maxPrice: typeof cluster.metrics?.maxPrice === 'number' ?
              cluster.metrics.maxPrice : 0,
            flowDensity: typeof cluster.metrics?.flowDensity === 'number' ?
              cluster.metrics.flowDensity : 0,
            avgFlowStrength: typeof cluster.metrics?.avgFlowStrength === 'number' ?
              cluster.metrics.avgFlowStrength : 0,
            totalFlows: typeof cluster.metrics?.totalFlows === 'number' ?
              cluster.metrics.totalFlows : 0,
            spatial_coverage: spatialCoverage,
            avg_distance: avgDistance,
            spatial_metrics: {
              centerLat: center ? center[1] : 0,
              centerLon: center ? center[0] : 0,
              boundingBox: calculateBoundingBox(marketCoords.map(m => m.coordinates)),
              marketDensity: marketCoords.length / (avgDistance || 1),
              spatialDispersion: calculateSpatialDispersion(marketCoords.map(m => m.coordinates))
            },
            timeSeriesCompleteness: typeof cluster.metrics?.timeSeriesCompleteness === 'number' ?
              cluster.metrics.timeSeriesCompleteness : 0,
            lastUpdateTimestamp: cluster.metrics?.lastUpdateTimestamp || null,
            stabilityScore: typeof cluster.metrics?.stabilityScore === 'number' ?
              cluster.metrics.stabilityScore : 0,
            integrationScore: typeof cluster.metrics?.integrationScore === 'number' ?
              cluster.metrics.integrationScore : 0,
            performanceScore: typeof cluster.metrics?.performanceScore === 'number' ?
              cluster.metrics.performanceScore : 0,
            active: typeof cluster.metrics?.active === 'boolean' ?
              cluster.metrics.active : true,
            lastCalculated: cluster.metrics?.lastCalculated || new Date().toISOString(),
            dataQualityScore: typeof cluster.metrics?.dataQualityScore === 'number' ?
              cluster.metrics.dataQualityScore : 1
          }
        };
      });
    } catch {
      return [];
    }
  }
);

export const selectFeatureDataWithMetrics = createSelector(
  [selectGeometryData, selectTimeSeriesData],
  (geometry, timeSeriesData) => {
    if (!geometry?.points || !Array.isArray(timeSeriesData)) {
      return null;
    }
    try {
      const timeSeriesByRegion = _.groupBy(timeSeriesData, 'region');
      const regionalMetrics = Object.entries(timeSeriesByRegion).reduce((acc, [region, data]) => {
        const prices = data.map(d => d.usdPrice).filter(p => typeof p === 'number');
        const conflicts = data.map(d => d.conflictIntensity).filter(c => typeof c === 'number');
        acc[region] = {
          averagePrice: prices.length ? _.mean(prices) : 0,
          priceVolatility: prices.length > 1 ? calculateVolatility(prices) : 0,
          conflictIntensity: conflicts.length ? _.mean(conflicts) : 0,
          dataPoints: data.length,
          lastUpdate: data.reduce((latest, point) => {
            const date = point.additionalProperties?.date;
            return date && (!latest || new Date(date) > new Date(latest)) ? date : latest;
          }, null)
        };
        return acc;
      }, {});

      const processedPoints = geometry.points.map(point => {
        const regionId = transformRegionName(
          point.properties?.normalizedName || 
          point.properties?.region_id || 
          point.properties?.name
        );

        return {
          ...point,
          properties: {
            ...point.properties,
            metrics: regionalMetrics[regionId] || {
              averagePrice: 0,
              priceVolatility: 0,
              conflictIntensity: 0,
              dataPoints: 0,
              lastUpdate: null
            },
            region_id: regionId,
            coordinates: validateCoordinates(point.coordinates)
          }
        };
      });

      return {
        points: processedPoints,
        metrics: regionalMetrics,
        timestamp: Date.now()
      };
    } catch {
      return null;
    }
  }
);

export const selectAutocorrelationMetrics = createSelector(
  [selectSpatialAutocorrelation],
  (autocorrelation) => {
    if (!autocorrelation?.local) return null;
    try {
      const clusters = Object.values(autocorrelation.local);
      const clusterTypes = clusters.map(c => c.cluster_type);
      return {
        highHigh: clusterTypes.filter(t => t === 'high-high').length,
        lowLow: clusterTypes.filter(t => t === 'low-low').length,
        highLow: clusterTypes.filter(t => t === 'high-low').length,
        lowHigh: clusterTypes.filter(t => t === 'low-high').length,
        notSignificant: clusterTypes.filter(t => t === 'not-significant').length,
        totalClusters: clusters.length,
        globalIndex: autocorrelation.global?.moran_i || 0,
        significance: autocorrelation.global?.p_value < 0.05
      };
    } catch {
      return {
        highHigh: 0,
        lowLow: 0,
        highLow: 0,
        lowHigh: 0,
        notSignificant: 0,
        totalClusters: 0,
        globalIndex: 0,
        significance: false
      };
    }
  }
);

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
        significantClusters: Object.values(autocorrelation?.local || {})
          .filter(c => c.p_value < 0.05).length
      },
      coverage: {
        totalMarkets: _.sumBy(clusters, c => c.connected_markets?.length || 0),
        averageCoverage: _.meanBy(clusterMetrics, 'market_coverage') || 0
      }
    };
  } catch {
    return {
      marketEfficiency: { average: 0, max: 0, min: 0 },
      connectivity: { flowDensity: 0, averageConnectivity: 0 },
      spatial: { globalMoransI: 0, clusterCount: 0, significantClusters: 0 },
      coverage: { totalMarkets: 0, averageCoverage: 0 }
    };
  }
};

const getDefaultMetrics = () => ({
  marketEfficiency: { average: 0, max: 0, min: 0 },
  connectivity: { flowDensity: 0, averageConnectivity: 0 },
  spatial: { globalMoransI: 0, clusterCount: 0, significantClusters: 0 },
  coverage: { totalMarkets: 0, averageCoverage: 0 }
});

export const selectVisualizationData = createSelector(
  [selectFeatureDataWithMetrics, selectMarketFlows, selectMarketClusters],
  (featureData, flows, clusters) => {
    try {
      const processedFlows = (flows || []).map(flow => ({
        ...flow,
        coordinates: {
          source: getRegionCoordinates(flow.source),
          target: getRegionCoordinates(flow.target)
        },
        normalized: {
          source: transformRegionName(flow.source),
          target: transformRegionName(flow.target)
        }
      }));

      const processedClusters = (clusters || []).map(cluster => {
        const marketCoords = (cluster.connected_markets || [])
          .map(market => ({
            name: market,
            coordinates: getRegionCoordinates(market)
          }))
          .filter(m => m.coordinates);

        return {
          ...cluster,
          markets: marketCoords,
          center: calculateCenter(marketCoords.map(m => m.coordinates)) || [0, 0]
        };
      });

      return {
        features: featureData?.points || [],
        flows: processedFlows,
        clusters: processedClusters,
        timestamp: Date.now()
      };
    } catch {
      return {
        features: [],
        flows: [],
        clusters: [],
        timestamp: Date.now()
      };
    }
  }
);

export const selectSpatialDataOptimized = createSelector(
  [
    selectUnifiedGeometry,
    selectMarketClusters,
    selectMarketFlows,
    selectTimeSeriesData,
    selectMarketShocks,
    selectMarketIntegration,
    selectSpatialAutocorrelation,
    selectRegressionAnalysis,
    selectSeasonalAnalysis,
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
    try {
      const spatial_analysis_results = Array.isArray(regression?.spatial_analysis_results)
        ? regression.spatial_analysis_results.map(result => ({
            ...result,
            residual: Array.isArray(result.residual) ? result.residual : [],
            coefficients: result.coefficients || {},
            moran_i: result.moran_i || { I: null, 'p-value': null },
          }))
        : [];

      const uniqueMonths = timeSeriesData
        ? _.uniq(timeSeriesData.map(d => d.month))
            .filter(Boolean)
            .sort((a, b) => new Date(a) - new Date(b))
        : [];

      const metrics = calculateEnhancedMetrics(
        clusters,
        flows,
        integration,
        autocorrelation
      );

      return {
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
    } catch {
      return {
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
      };
    }
  }
);

export const selectFlowsWithCoordinates = createSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => {
    try {
      if (!flows || !geometry?.points) {
        return [];
      }

      const pointsMap = new Map();
      geometry.points.forEach(point => {
        const names = [
          point.properties?.name,
          point.properties?.normalizedName,
          point.properties?.region_id
        ].filter(Boolean).map(name => transformRegionName(name));
        const coords = Array.isArray(point.coordinates) && point.coordinates.length === 2
          ? point.coordinates
          : getRegionCoordinates(names[0]);
        names.forEach(name => {
          if (name && !pointsMap.has(name)) {
            pointsMap.set(name, coords ? validateCoordinates(coords) : null);
          }
        });
      });

      return flows.map(flow => {
        const sourceNormalized = transformRegionName(flow.source);
        const targetNormalized = transformRegionName(flow.target);

        const sourceCoords = pointsMap.get(sourceNormalized) || getRegionCoordinates(flow.source);
        const targetCoords = pointsMap.get(targetNormalized) || getRegionCoordinates(flow.target);

        return {
          ...flow,
          source_normalized: sourceNormalized,
          target_normalized: targetNormalized,
          sourceCoordinates: sourceCoords || [0, 0],
          targetCoordinates: targetCoords || [0, 0],
          flow_strength: typeof flow.total_flow === 'number' ? flow.total_flow : 0,
          price_differential: typeof flow.avg_price_differential === 'number' ? 
            flow.avg_price_differential : 0
        };
      });
    } catch {
      return [];
    }
  }
);

export const utils = {
  calculateDistance,
  validateCoordinates,
  calculateVolatility,
  calculateAverageDistance,
  calculateEnhancedMetrics,
  getDefaultMetrics
};

export { YEMEN_COORDINATES };

export default {
  selectLoadingStatus,
  selectStage,
  selectTimeSeriesData,
  selectGeometryData,
  selectMarketIntegration,
  selectFlowMaps,
  selectSelectedDate,
  selectFilteredFlowData,
  selectMarketMetrics
};
