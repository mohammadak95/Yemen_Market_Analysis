// src/selectors/optimizedSelectors.js

import { createSelector } from 'reselect';
import _ from 'lodash';

// Base selectors with proper memoization
const selectSpatialSlice = state => state.spatial || {};

const selectSpatialState = createSelector(
  [selectSpatialSlice],
  spatial => spatial
);

const selectSpatialData = createSelector(
  [selectSpatialState],
  spatial => spatial.data || {}
);

const selectUiState = createSelector(
  [selectSpatialState],
  spatial => spatial.ui || {}
);

const selectStatus = createSelector(
  [selectSpatialState],
  spatial => spatial.status || {}
);

// Memoized data selectors with proper validation
export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  data => {
    try {
      const autocorrelation = data.spatialAutocorrelation || {};
      return {
        global: autocorrelation.global || { I: 0, 'p-value': 1 },
        local: autocorrelation.local || {}
      };
    } catch (error) {
      console.error('Error selecting spatial autocorrelation:', error);
      return { global: { I: 0, 'p-value': 1 }, local: {} };
    }
  }
);

export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  data => {
    try {
      return Array.isArray(data.timeSeriesData) ? data.timeSeriesData : [];
    } catch (error) {
      console.error('Error selecting time series data:', error);
      return [];
    }
  }
);

export const selectGeometryData = createSelector(
  [selectSpatialData],
  data => {
    try {
      const geometry = data.geometry;
      if (!geometry) return null;

      return {
        points: Array.isArray(geometry.points) ? geometry.points : [],
        polygons: Array.isArray(geometry.polygons) ? geometry.polygons : [],
        unified: geometry.unified || null,
        type: geometry.type || 'unified'
      };
    } catch (error) {
      console.error('Error selecting geometry data:', error);
      return null;
    }
  }
);

// Unified geometry selector with proper validation
export const selectUnifiedGeometry = createSelector(
  [selectGeometryData],
  geometry => {
    if (!geometry) return null;
    if (geometry.unified) return geometry.unified;

    try {
      const features = [];

      if (Array.isArray(geometry.polygons)) {
        features.push(
          ...geometry.polygons.map(polygon => ({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: Array.isArray(polygon.geometry?.coordinates) 
                ? polygon.geometry.coordinates 
                : [[]]
            },
            properties: {
              ...polygon.properties,
              id: polygon.properties?.shapeISO,
              region_id: polygon.properties?.normalizedName,
              feature_type: 'polygon',
            },
          }))
        );
      }

      if (Array.isArray(geometry.points)) {
        features.push(
          ...geometry.points.map(point => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: Array.isArray(point.coordinates) ? point.coordinates : [0, 0]
            },
            properties: {
              ...point.properties,
              id: point.properties?.normalizedName,
              region_id: point.properties?.normalizedName,
              feature_type: 'point',
            },
          }))
        );
      }

      return {
        type: 'FeatureCollection',
        features,
        crs: {
          type: 'name',
          properties: {
            name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
          },
        },
      };
    } catch (error) {
      console.error('Error creating unified geometry:', error);
      return null;
    }
  }
);

// Market Data Selectors with proper validation
export const selectMarketClusters = createSelector(
  [selectSpatialData],
  data => {
    try {
      return Array.isArray(data.marketClusters) ? data.marketClusters : [];
    } catch (error) {
      console.error('Error selecting market clusters:', error);
      return [];
    }
  }
);

export const selectMarketFlows = createSelector(
  [selectSpatialData],
  data => {
    try {
      return Array.isArray(data.flowMaps) ? data.flowMaps : [];
    } catch (error) {
      console.error('Error selecting market flows:', error);
      return [];
    }
  }
);

export const selectMarketShocks = createSelector(
  [selectSpatialData],
  data => {
    try {
      return Array.isArray(data.marketShocks) ? data.marketShocks : [];
    } catch (error) {
      console.error('Error selecting market shocks:', error);
      return [];
    }
  }
);

// UI State Selectors
export const selectVisualizationMode = createSelector(
  [selectUiState],
  ui => ui.visualizationMode || 'prices'
);

export const selectSelectedCommodity = createSelector(
  [selectUiState],
  ui => ui.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectUiState],
  ui => ui.selectedDate
);

// Feature data selector with metrics
export const selectFeatureDataWithMetrics = createSelector(
  [selectUnifiedGeometry, selectTimeSeriesData],
  (geometry, timeSeriesData) => {
    if (!geometry?.features || !Array.isArray(timeSeriesData)) {
      return null;
    }

    try {
      const timeSeriesByRegion = _.keyBy(timeSeriesData, 'region');

      return {
        ...geometry,
        features: geometry.features.map(feature => {
          const regionData = timeSeriesByRegion[feature.properties?.region_id] || {};
          return {
            ...feature,
            properties: {
              ...feature.properties,
              ...(regionData || {})
            }
          };
        })
      };
    } catch (error) {
      console.error('Error processing feature data with metrics:', error);
      return null;
    }
  }
);

// Analysis Data Selectors with proper validation
export const selectMarketIntegration = createSelector(
  [selectSpatialData],
  data => {
    try {
      const integration = data.marketIntegration || {};
      return {
        price_correlation: integration.price_correlation || {},
        flow_density: integration.flow_density || 0,
        accessibility: integration.accessibility || {},
        integration_score: integration.integration_score || 0
      };
    } catch (error) {
      console.error('Error selecting market integration:', error);
      return {
        price_correlation: {},
        flow_density: 0,
        accessibility: {},
        integration_score: 0
      };
    }
  }
);

export const selectRegressionAnalysis = createSelector(
  [selectSpatialData],
  data => {
    try {
      const regression = data.regressionAnalysis || {};
      return {
        model: regression.model || {},
        spatial: regression.spatial || { moran_i: { I: 0, 'p-value': 1 }, vif: [] },
        residuals: regression.residuals || { raw: [], byRegion: {}, stats: {} }
      };
    } catch (error) {
      console.error('Error selecting regression analysis:', error);
      return {
        model: {},
        spatial: { moran_i: { I: 0, 'p-value': 1 }, vif: [] },
        residuals: { raw: [], byRegion: {}, stats: {} }
      };
    }
  }
);

export const selectSeasonalAnalysis = createSelector(
  [selectSpatialData],
  data => {
    try {
      const seasonal = data.seasonalAnalysis || {};
      return {
        seasonal_strength: seasonal.seasonal_strength || 0,
        trend_strength: seasonal.trend_strength || 0,
        peak_month: seasonal.peak_month || 0,
        trough_month: seasonal.trough_month || 0,
        seasonal_pattern: seasonal.seasonal_pattern || []
      };
    } catch (error) {
      console.error('Error selecting seasonal analysis:', error);
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

// Status Selectors
export const selectLoadingStatus = createSelector(
  [selectStatus],
  status => ({
    loading: status.loading || false,
    error: status.error || null,
    progress: status.progress || 0,
    stage: status.stage || 'idle',
  })
);

// New selectors for visualization and spatial data
export const selectVisualizationData = createSelector(
  [selectFeatureDataWithMetrics, selectMarketFlows, selectMarketClusters],
  (featureData, flows, clusters) => {
    try {
      return {
        features: featureData?.features || [],
        flows: flows || [],
        clusters: clusters || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error selecting visualization data:', error);
      return {
        features: [],
        flows: [],
        clusters: [],
        timestamp: Date.now()
      };
    }
  }
);

export const selectFlowsWithCoordinates = createSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => {
    try {
      if (!flows || !geometry?.points) return [];

      const pointsMap = new Map(
        geometry.points.map(point => [
          point.properties?.normalizedName,
          point.coordinates || [0, 0]
        ])
      );

      return flows.map(flow => ({
        ...flow,
        sourceCoordinates: pointsMap.get(flow.source) || [0, 0],
        targetCoordinates: pointsMap.get(flow.target) || [0, 0]
      }));
    } catch (error) {
      console.error('Error selecting flows with coordinates:', error);
      return [];
    }
  }
);

export const selectClustersWithCoordinates = createSelector(
  [selectMarketClusters, selectGeometryData],
  (clusters, geometry) => {
    try {
      if (!clusters || !geometry?.points) return [];

      const pointsMap = new Map(
        geometry.points.map(point => [
          point.properties?.normalizedName,
          point.coordinates || [0, 0]
        ])
      );

      return clusters.map(cluster => ({
        ...cluster,
        markets: cluster.markets.map(market => ({
          ...market,
          coordinates: pointsMap.get(market.name) || [0, 0]
        }))
      }));
    } catch (error) {
      console.error('Error selecting clusters with coordinates:', error);
      return [];
    }
  }
);

// Complete Spatial Data Selector with proper validation
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
      return {
        geometry,
        marketClusters: clusters,
        flowMaps: flows,
        timeSeriesData,
        marketShocks: shocks,
        marketIntegration: integration,
        spatialAutocorrelation: autocorrelation,
        regressionAnalysis: regression,
        seasonalAnalysis: seasonal,
        uniqueMonths: _.uniq(timeSeriesData?.map(d => d.month)).sort() || [],
      };
    } catch (error) {
      console.error('Error creating optimized spatial data:', error);
      return null;
    }
  }
);
