// src/selectors/optimizedSelectors.js

import { createSelector } from 'reselect';
import _ from 'lodash';

// Base selectors
const selectSpatialState = (state) => state.spatial;
const selectSpatialData = (state) => state.spatial?.data || {};
const selectUiState = (state) => state.spatial?.ui || {};
const selectStatus = (state) => state.spatial?.status || {};

// Geometry Selectors
export const selectGeometryData = createSelector(
  [selectSpatialData],
  (data) => data.geometry || null
);

export const selectUnifiedGeometry = createSelector(
  [selectGeometryData],
  (geometry) => {
    if (!geometry) return null;
    
    // Return existing unified GeoJSON if available
    if (geometry.unified) return geometry.unified;
    
    // Construct unified GeoJSON from points and polygons
    const features = [];
    
    if (geometry.polygons) {
      features.push(...geometry.polygons.map(polygon => ({
        type: 'Feature',
        geometry: polygon.geometry,
        properties: {
          ...polygon.properties,
          id: polygon.properties.shapeISO,
          region_id: polygon.properties.normalizedName,
          feature_type: 'polygon'
        }
      })));
    }
    
    if (geometry.points) {
      features.push(...geometry.points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point.coordinates
        },
        properties: {
          ...point.properties,
          id: point.properties.normalizedName,
          region_id: point.properties.normalizedName,
          feature_type: 'point'
        }
      })));
    }
    
    return {
      type: 'FeatureCollection',
      features,
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
        }
      }
    };
  }
);

// Market Data Selectors
export const selectMarketClusters = createSelector(
  [selectSpatialData],
  (data) => data.marketClusters || data.market_clusters || []
);

export const selectMarketFlows = createSelector(
  [selectSpatialData],
  (data) => data.flowMaps || data.flow_analysis || []
);

export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => data.timeSeriesData || data.time_series_data || []
);

export const selectMarketShocks = createSelector(
  [selectSpatialData],
  (data) => data.marketShocks || data.market_shocks || []
);

// UI State Selectors
export const selectVisualizationMode = createSelector(
  [selectUiState],
  (ui) => ui.visualizationMode || 'prices'
);

export const selectSelectedCommodity = createSelector(
  [selectUiState],
  (ui) => ui.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectUiState],
  (ui) => ui.selectedDate
);

// Combined Data Selectors
export const selectClustersWithCoordinates = createSelector(
  [selectMarketClusters, selectGeometryData],
  (clusters, geometry) => {
    if (!clusters.length || !geometry?.points) return [];
    
    return clusters.map(cluster => {
      const mainMarketPoint = geometry.points.find(
        point => point.properties.normalizedName === cluster.main_market
      );
      
      return {
        ...cluster,
        main_market_coordinates: mainMarketPoint?.coordinates || [NaN, NaN]
      };
    });
  }
);

export const selectFlowsWithCoordinates = createSelector(
  [selectMarketFlows, selectGeometryData],
  (flows, geometry) => {
    if (!flows.length || !geometry?.points) return [];
    
    return flows.map(flow => {
      const sourcePoint = geometry.points.find(
        point => point.properties.normalizedName === flow.source
      );
      const targetPoint = geometry.points.find(
        point => point.properties.normalizedName === flow.target
      );
      
      return {
        ...flow,
        source_coordinates: sourcePoint?.coordinates || [NaN, NaN],
        target_coordinates: targetPoint?.coordinates || [NaN, NaN]
      };
    });
  }
);

export const selectFeatureDataWithMetrics = createSelector(
  [selectUnifiedGeometry, selectTimeSeriesData],
  (geometry, timeSeriesData) => {
    if (!geometry?.features || !timeSeriesData?.length) return null;
    
    return {
      ...geometry,
      features: geometry.features.map(feature => {
        const regionData = timeSeriesData.find(d => 
          d.region === feature.properties.region_id
        );
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            ...(regionData || {})
          }
        };
      })
    };
  }
);

// Analysis Data Selectors
export const selectMarketIntegration = createSelector(
  [selectSpatialData],
  (data) => data.market_integration || {}
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => data.spatialAutocorrelation || data.spatial_autocorrelation || {}
);

export const selectRegressionAnalysis = createSelector(
  [selectSpatialData],
  (data) => data.regressionAnalysis || {}
);

export const selectSeasonalAnalysis = createSelector(
  [selectSpatialData],
  (data) => data.seasonal_analysis || {}
);

// Status Selectors
export const selectLoadingStatus = createSelector(
  [selectStatus],
  (status) => ({
    loading: status.loading || false,
    error: status.error || null,
    progress: status.progress || 0,
    stage: status.stage || 'idle'
  })
);

// Region-specific Selectors
export const selectPolygonsByRegion = createSelector(
  [selectGeometryData],
  (geometry) => {
    if (!geometry?.polygons) return {};
    return _.keyBy(geometry.polygons, 'properties.normalizedName');
  }
);

export const selectPointsByRegion = createSelector(
  [selectGeometryData],
  (geometry) => {
    if (!geometry?.points) return {};
    return _.keyBy(geometry.points, 'properties.normalizedName');
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
    selectSeasonalAnalysis
  ],
  (geometry, clusters, flows, timeSeriesData, shocks, integration, autocorrelation, regression, seasonal) => ({
    geometry,
    marketClusters: clusters,
    flowMaps: flows,
    timeSeriesData,
    marketShocks: shocks,
    market_integration: integration,
    spatialAutocorrelation: autocorrelation,
    regressionAnalysis: regression,
    seasonal_analysis: seasonal,
    uniqueMonths: timeSeriesData?.map(d => d.month).filter((v, i, a) => a.indexOf(v) === i).sort() || []
  })
);

// Helper Selectors for Visualization
export const selectVisualizationData = createSelector(
  [selectSpatialDataOptimized, selectVisualizationMode],
  (data, mode) => {
    if (!data || !mode) return null;
    
    return {
      ...data,
      visualizationMode: mode,
      metadata: {
        timestamp: new Date().toISOString(),
        mode
      }
    };
  }
);