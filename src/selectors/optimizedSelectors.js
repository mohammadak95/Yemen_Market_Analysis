// src/selectors/optimizedSelectors.js

import { createSelector } from 'reselect';
import _ from 'lodash';
import { transformRegionName, getRegionCoordinates, calculateCenter  } from '../components/analysis/spatial-analysis/utils/spatialUtils';


// Yemen coordinates mapping for fallback
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

// Helper function to convert UTM coordinates to LatLng
const convertUTMtoLatLng = (easting, northing) => {
  // Constants for UTM Zone 38N to WGS84 conversion
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
// Base selectors with proper memoization
const selectSpatialSlice = (state) => state.spatial || {};

const selectSpatialState = createSelector(
  [selectSpatialSlice],
  (spatial) => spatial
);

const selectSpatialData = createSelector(
  [selectSpatialState],
  (spatial) => spatial.data || {}
);

const selectUiState = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui || {}
);

export const selectStatus = createSelector(
  [selectSpatialState],
  (spatial) => spatial.status || {}
);

// Memoized data selectors with proper validation
export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      const autocorrelation = data.spatialAutocorrelation || {};
      return {
        global: autocorrelation.global || { moran_i: 0, p_value: 1, z_score: null, significance: false },
        local: autocorrelation.local || {}
      };
    } catch (error) {
      console.error('Error selecting spatial autocorrelation:', error);
      return { global: { moran_i: 0, p_value: 1, z_score: null, significance: false }, local: {} };
    }
  }
);

export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => {
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
  (data) => {
    try {
      const geometry = data.geometry;
      if (!geometry) return null;

      return {
        points: Array.isArray(geometry.points) ? geometry.points : [],
        polygons: Array.isArray(geometry.polygons) ? geometry.polygons : [],
        unified: geometry.unified || null,
        type: geometry.type || 'unified',
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
  (geometry) => {
    if (!geometry) return null;
    if (geometry.unified) return geometry.unified;

    try {
      const features = [];

      if (Array.isArray(geometry.polygons)) {
        features.push(
          ...geometry.polygons.map((polygon) => ({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: Array.isArray(polygon.geometry?.coordinates)
                ? polygon.geometry.coordinates
                : [[]],
            },
            properties: {
              ...polygon.properties,
              id: polygon.properties?.shapeISO || polygon.properties?.region_id || polygon.properties?.name,
              region_id: transformRegionName(polygon.properties?.normalizedName || polygon.properties?.region_id || polygon.properties?.name),
              feature_type: 'polygon',
            },
          }))
        );
      }

      if (Array.isArray(geometry.points)) {
        features.push(
          ...geometry.points.map((point) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: Array.isArray(point.coordinates)
                ? point.coordinates
                : [0, 0],
            },
            properties: {
              ...point.properties,
              id: transformRegionName(point.properties?.normalizedName || point.properties?.region_id || point.properties?.name),
              region_id: transformRegionName(point.properties?.normalizedName || point.properties?.region_id || point.properties?.name),
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
      if (!flows || !geometry?.points) {
        console.warn('Missing flows or geometry data:', { 
          hasFlows: !!flows, 
          hasGeometry: !!geometry,
          pointsCount: geometry?.points?.length 
        });
        return [];
      }

      // Create a map of normalized market names to coordinates
      const pointsMap = new Map();
      geometry.points.forEach(point => {
        const names = [
          point.properties?.name,
          point.properties?.normalizedName,
          point.properties?.region_id
        ].filter(Boolean).map(name => transformRegionName(name));

        const coords = point.coordinates?.length === 2
          ? point.coordinates
          : getRegionCoordinates(names[0]);

        names.forEach(name => {
          if (name && !pointsMap.has(name)) {
            pointsMap.set(name, coords);
          }
        });
      });

      const enhancedFlows = flows.map(flow => {
        const sourceNormalized = transformRegionName(flow.source);
        const targetNormalized = transformRegionName(flow.target);

        const sourceCoords = pointsMap.get(sourceNormalized) || getRegionCoordinates(flow.source);
        const targetCoords = pointsMap.get(targetNormalized) || getRegionCoordinates(flow.target);

        if (!sourceCoords) {
          console.warn(`No coordinates found for source market: ${flow.source} (normalized: ${sourceNormalized})`);
        }
        if (!targetCoords) {
          console.warn(`No coordinates found for target market: ${flow.target} (normalized: ${targetNormalized})`);
        }

        return {
          ...flow,
          source_normalized: sourceNormalized,
          target_normalized: targetNormalized,
          sourceCoordinates: sourceCoords || [0, 0],
          targetCoordinates: targetCoords || [0, 0]
        };
      });

      return enhancedFlows;
    } catch (error) {
      console.error('Error enhancing flows with coordinates:', error);
      return [];
    }
  }
);

export const selectClustersWithCoordinates = createSelector(
  [selectMarketClusters, selectGeometryData],
  (clusters, geometry) => {
    try {
      if (!clusters || !geometry?.points) {
        console.warn('Missing clusters or geometry data:', { 
          hasClusters: !!clusters, 
          hasGeometry: !!geometry,
          pointsCount: geometry?.points?.length 
        });
        return [];
      }

      // Create a map of normalized market names to coordinates
      const pointsMap = new Map();
      geometry.points.forEach(point => {
        const names = [
          point.properties?.name,
          point.properties?.normalizedName,
          point.properties?.region_id
        ].filter(Boolean).map(name => transformRegionName(name));

        const coords = point.coordinates?.length === 2
          ? point.coordinates
          : getRegionCoordinates(names[0]);

        names.forEach(name => {
          if (name && !pointsMap.has(name)) {
            pointsMap.set(name, coords);
          }
        });
      });

      const enhancedClusters = clusters.map(cluster => {
        const markets = cluster.connected_markets || [];
        
        const marketCoordinates = markets
          .map(marketName => {
            const normalizedName = transformRegionName(marketName);
            const coords = pointsMap.get(normalizedName) || getRegionCoordinates(marketName);
            if (!coords) {
              console.warn(`No coordinates found for market: ${marketName} (normalized: ${normalizedName})`);
            }
            return coords;
          })
          .filter(coords => Array.isArray(coords) && coords.length === 2);

        const center = calculateCenter(marketCoordinates);

        return {
          ...cluster,
          center_lat: center ? center[1] : 0,
          center_lon: center ? center[0] : 0,
          market_count: markets.length,
          markets: markets.map(marketName => {
            const normalizedName = transformRegionName(marketName);
            const coords = pointsMap.get(normalizedName) || getRegionCoordinates(marketName);
            return {
              name: marketName,
              normalized_name: normalizedName,
              coordinates: coords || [0, 0]
            };
          })
        };
      });

      return enhancedClusters;
    } catch (error) {
      console.error('Error enhancing clusters with coordinates:', error);
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

export const selectAutocorrelationMetrics = createSelector(
  [selectSpatialAutocorrelation],
  (autocorrelation) => {
    if (!autocorrelation?.local) return null;

    const clusters = Object.values(autocorrelation.local);
    return {
      highHigh: clusters.filter(c => c.cluster_type === 'high-high').length,
      lowLow: clusters.filter(c => c.cluster_type === 'low-low').length,
      highLow: clusters.filter(c => c.cluster_type === 'high-low').length,
      lowHigh: clusters.filter(c => c.cluster_type === 'low-high').length,
      notSignificant: clusters.filter(c => c.cluster_type === 'not-significant').length,
      totalClusters: clusters.length
    };
  }
);