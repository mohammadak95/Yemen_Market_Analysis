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

// Memoized data selectors
export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  data => data.spatialAutocorrelation || {}
);

export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  data => data.timeSeriesData || []
);

export const selectGeometryData = createSelector(
  [selectSpatialData],
  data => data.geometry || null
);

// Unified geometry selector
export const selectUnifiedGeometry = createSelector(
  [selectGeometryData],
  geometry => {
    if (!geometry) return null;
    if (geometry.unified) return geometry.unified;

    try {
      const features = [];

      if (geometry.polygons) {
        features.push(
          ...geometry.polygons.map(polygon => ({
            type: 'Feature',
            geometry: polygon.geometry,
            properties: {
              ...polygon.properties,
              id: polygon.properties.shapeISO,
              region_id: polygon.properties.normalizedName,
              feature_type: 'polygon',
            },
          }))
        );
      }

      if (geometry.points) {
        features.push(
          ...geometry.points.map(point => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: point.coordinates,
            },
            properties: {
              ...point.properties,
              id: point.properties.normalizedName,
              region_id: point.properties.normalizedName,
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

// Market Data Selectors
export const selectMarketClusters = createSelector(
  [selectSpatialData],
  data => data.marketClusters || []
);

export const selectMarketFlows = createSelector(
  [selectSpatialData],
  data => data.flowMaps || []
);

export const selectMarketShocks = createSelector(
  [selectSpatialData],
  data => data.marketShocks || []
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

// Combined Data Selectors
export const selectClustersWithCoordinates = createSelector(
  [selectMarketClusters, selectGeometryData],
  (clusters, geometry) => {
    if (!clusters?.length || !geometry?.points) return [];

    try {
      return clusters.map(cluster => {
        const mainMarketPoint = geometry.points.find(
          point => point.properties.normalizedName === cluster.mainMarket
        );

        return {
          ...cluster,
          mainMarketCoordinates: mainMarketPoint?.coordinates || [NaN, NaN],
        };
      });
    } catch (error) {
      console.error('Error processing clusters with coordinates:', error);
      return [];
    }
  }
);

export const selectFlowsWithCoordinates = createSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => {
    if (!flows?.length || !geometry?.points) return [];

    try {
      return flows.map(flow => {
        const sourcePoint = geometry.points.find(
          point => point.properties.normalizedName === flow.source
        );
        const targetPoint = geometry.points.find(
          point => point.properties.normalizedName === flow.target
        );

        return {
          ...flow,
          sourceCoordinates: sourcePoint?.coordinates || [NaN, NaN],
          targetCoordinates: targetPoint?.coordinates || [NaN, NaN],
        };
      });
    } catch (error) {
      console.error('Error processing flows with coordinates:', error);
      return [];
    }
  }
);

export const selectFeatureDataWithMetrics = createSelector(
  [selectUnifiedGeometry, selectTimeSeriesData],
  (geometry, timeSeriesData) => {
    if (!geometry?.features || !timeSeriesData?.length) return null;

    try {
      const timeSeriesByRegion = _.keyBy(timeSeriesData, 'region');

      return {
        ...geometry,
        features: geometry.features.map(feature => {
          const regionData = timeSeriesByRegion[feature.properties.region_id];
          return {
            ...feature,
            properties: {
              ...feature.properties,
              ...(regionData || {}),
            },
          };
        }),
      };
    } catch (error) {
      console.error('Error processing feature data with metrics:', error);
      return null;
    }
  }
);

// Analysis Data Selectors
export const selectMarketIntegration = createSelector(
  [selectSpatialData],
  data => data.marketIntegration || {}
);

export const selectRegressionAnalysis = createSelector(
  [selectSpatialData],
  data => data.regressionAnalysis || {}
);

export const selectSeasonalAnalysis = createSelector(
  [selectSpatialData],
  data => data.seasonalAnalysis || {}
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

// Region-specific Selectors
export const selectPolygonsByRegion = createSelector(
  [selectGeometryData],
  geometry => {
    if (!geometry?.polygons) return {};
    try {
      return _.keyBy(geometry.polygons, 'properties.normalizedName');
    } catch (error) {
      console.error('Error processing polygons by region:', error);
      return {};
    }
  }
);

export const selectPointsByRegion = createSelector(
  [selectGeometryData],
  geometry => {
    if (!geometry?.points) return {};
    try {
      return _.keyBy(geometry.points, 'properties.normalizedName');
    } catch (error) {
      console.error('Error processing points by region:', error);
      return {};
    }
  }
);

// Complete Spatial Data Selector
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
        uniqueMonths: timeSeriesData
          ?.map(d => d.month)
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort() || [],
      };
    } catch (error) {
      console.error('Error creating optimized spatial data:', error);
      return null;
    }
  }
);

// Visualization Data Selector
export const selectVisualizationData = createSelector(
  [selectSpatialDataOptimized, selectVisualizationMode],
  (data, mode) => {
    if (!data || !mode) return null;

    try {
      return {
        ...data,
        visualizationMode: mode,
        metadata: {
          timestamp: new Date().toISOString(),
          mode,
        },
      };
    } catch (error) {
      console.error('Error creating visualization data:', error);
      return null;
    }
  }
);
