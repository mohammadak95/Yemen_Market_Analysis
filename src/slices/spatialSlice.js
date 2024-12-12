// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createSelectorCreator, lruMemoize } from 'reselect';
import _ from 'lodash';
import { spatialHandler } from '../utils/spatialDataHandler';
import { DEFAULT_REGRESSION_DATA } from '../types/dataTypes';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { workerManager } from '../workers/enhancedWorkerSystem';
import {
  calculatePriceTrend,
  detectSeasonality,
  detectOutliers,
  calculateVolatility,
  calculateIntegration,
  calculateClusterEfficiency,
  calculateCenterOfMass,
  calculateBoundingBox,
  findNeighboringRegions
} from '../utils/marketAnalysisUtils';
import { DEFAULT_VIEW } from '../constants/index';

// Custom Selector Creator with lodash's isEqual for deep comparison
const createDeepEqualSelector = createSelectorCreator(
  lruMemoize,
  _.isEqual
);

// Memoization Configuration
const memoizationConfig = {
  resultEqualityCheck: _.isEqual,
  maxSize: 50,
  defaultValue: null
};

// Helper function for processing flow data
const processFlowData = (flows) => {
  if (!Array.isArray(flows)) return {
    flows: [],
    byDate: {},
    metadata: {
      lastUpdated: new Date().toISOString(),
      dateRange: { start: null, end: null }
    }
  };

  // Group flows by date and validate each flow
  const byDate = flows.reduce((acc, flow) => {
    // Ensure flow has required fields
    if (!flow.source || !flow.target || !flow.flow_weight) return acc;
    
    const date = flow.date || flow.month;
    if (!date) return acc;
    
    // Format date to YYYY-MM
    const formattedDate = date.substring(0, 7);
    
    if (!acc[formattedDate]) {
      acc[formattedDate] = [];
    }
    
    // Add validated flow to the date group
    acc[formattedDate].push({
      source: flow.source,
      target: flow.target,
      flow_weight: Number(flow.flow_weight) || 0,
      price_differential: Number(flow.price_differential) || 0,
      source_price: Number(flow.source_price) || 0,
      target_price: Number(flow.target_price) || 0,
      total_flow: Number(flow.total_flow || flow.flow_weight) || 0,
      avg_flow: Number(flow.avg_flow || flow.total_flow || flow.flow_weight) || 0,
      flow_count: Number(flow.flow_count) || 1,
      date: formattedDate
    });
    
    return acc;
  }, {});

  // Calculate date range
  const dates = Object.keys(byDate).sort();
  const dateRange = {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null
  };

  // Flatten flows for the flows array
  const allFlows = Object.values(byDate).flat();

  return {
    flows: allFlows,
    byDate,
    metadata: {
      lastUpdated: new Date().toISOString(),
      dateRange,
      totalFlows: allFlows.length,
      uniqueDates: dates.length
    }
  };
};

// Initial State with All Required Properties Initialized
export const initialState = {
  data: {
    geometry: {
      polygons: null,
      points: null,
      unified: null
    },
    flowMaps: [],
    timeSeriesData: [],
    marketClusters: [],
    marketShocks: [],
    spatialAutocorrelation: {},
    seasonalAnalysis: null,
    marketIntegration: null,
    regressionAnalysis: {
      ...DEFAULT_REGRESSION_DATA,
      metadata: {
        ...DEFAULT_REGRESSION_DATA.metadata,
        commodity: "beans (kidney red)", // Set default commodity
        timestamp: new Date().toISOString(),
        version: "1.0"
      },
      model: {
        ...DEFAULT_REGRESSION_DATA.model,
        coefficients: { spatial_lag_price: 0 },
        p_values: { spatial_lag_price: 1 }
      },
      residuals: {
        raw: [],
        byRegion: {},
        stats: { mean: 0, variance: 0, maxAbsolute: 0 }
      },
      spatial: {
        moran_i: { I: 0, 'p-value': 1 },
        vif: []
      }
    },
    uniqueMonths: [],
    visualizationData: {
      prices: null,
      integration: null,
      clusters: null,
      shocks: null
    },
    metadata: null,
    cache: {},
    flowData: {
      flows: [],
      byDate: {},
      metadata: {
        lastUpdated: null,
        dateRange: {
          start: null,
          end: null
        }
      }
    },
    spatialAnalysis: {
      moranI: null,
      clusters: [],
      regressionResults: null
    },
    commodities: []
  },
  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: 'idle',
    geometryLoading: false,
    geometryError: null,
    regressionLoading: false,
    regressionError: null,
    visualizationLoading: false,
    visualizationError: null,
    dataFetching: false,
    dataCaching: false,
    lastUpdated: null,
    retryCount: 0,
    lastError: null
  },
  ui: {
    selectedCommodity: 'beans (kidney red)', // Set default commodity
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    view: DEFAULT_VIEW,
    activeLayers: [],
    visualizationMode: 'prices',
    analysisFilters: {
      minMarketCount: 0,
      minFlowWeight: 0,
      shockThreshold: 0
    }
  }
};

// Async Thunks

export const fetchFlowData = createAsyncThunk(
  'spatial/fetchFlowData',
  async ({ commodity, date }, { getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('flow-data-fetch');
    try {
      const response = await spatialHandler.loadFlowDataWithRecovery(commodity);
      metric.finish({ status: 'success' });
      return response;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAllSpatialData = createAsyncThunk(
  'spatial/fetchAllSpatialData',
  async ({
    commodity,
    date,
    visualizationMode,
    filters,
    skipGeometry = false,
    regressionOnly = false,
    visualizationOnly = false,
    forceRefresh = false,
    signal // Add signal parameter
  }, { getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    const state = getState();
    const cacheKey = `${commodity}_${date}`;

    try {
      let result = {
        geometry: null,
        spatialData: null,
        regressionData: null,
        visualizationData: null,
        metadata: {
          commodity,
          date,
          timestamp: new Date().toISOString()
        }
      };

      // Handle regression-only request
      if (regressionOnly) {
        try {
          const regressionData = await spatialHandler.loadRegressionAnalysis(commodity, signal);
          result.regressionData = regressionData;
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          console.warn('Regression analysis fetch failed:', error);
          result.regressionData = DEFAULT_REGRESSION_DATA;
        }
        metric.finish({ status: 'success' });
        return result;
      }

      // Handle visualization-only request
      if (visualizationOnly && visualizationMode) {
        try {
          const visualizationData = await spatialHandler.processVisualizationData(
            state.spatial?.data,
            visualizationMode,
            filters
          );
          result.visualizationData = {
            mode: visualizationMode,
            data: visualizationData
          };
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          console.warn('Visualization processing failed:', error);
        }
        metric.finish({ status: 'success' });
        return result;
      }

      // Standard full data load
      if (!skipGeometry) {
        await Promise.all([
          spatialHandler.initializeGeometry(signal),
          spatialHandler.initializePoints(signal)
        ]);

        result.geometry = {
          polygons: Array.from(spatialHandler.geometryCache.values()),
          points: Array.from(spatialHandler.pointCache.values()),
          unified: await spatialHandler.createUnifiedGeoJSON([], signal)
        };
      }

      // Get spatial data using the enhanced method
      const spatialData = await spatialHandler.getSpatialData(commodity, date, signal);
      
      result.spatialData = {
        timeSeriesData: spatialData.timeSeriesData || [],
        flowMaps: spatialData.flowMaps || [],
        marketClusters: spatialData.marketClusters || [],
        marketShocks: spatialData.marketShocks || [],
        spatialAutocorrelation: spatialData.spatialAutocorrelation || {},
        seasonalAnalysis: spatialData.seasonalAnalysis || {},
        marketIntegration: spatialData.marketIntegration || {},
        uniqueMonths: [...new Set(spatialData.timeSeriesData?.map(d => d.month) || [])].sort(),
        commodities: spatialData.commodities || []
      };

      // Update cache
      result.cacheTimestamp = Date.now();
      const updatedResult = {
        ...result,
        cacheKey
      };

      metric.finish({ status: 'success' });
      return updatedResult;

    } catch (error) {
      // Don't log AbortError as it's an expected case
      if (error.name === 'AbortError') {
        metric.finish({ status: 'aborted' });
        throw error;
      }

      const enhancedError = {
        message: error.message,
        details: {
          params: { commodity, date },
          state: getState().spatial?.status,
          timestamp: Date.now()
        }
      };
      backgroundMonitor.logError('spatial-data-fetch', enhancedError);
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(enhancedError);
    }
  }
);

// Compatibility exports for backward compatibility
export const fetchSpatialData = ({ commodity, date }) => {
  return fetchAllSpatialData({ commodity, date });
};

export const fetchRegressionAnalysis = ({ selectedCommodity }) => {
  return fetchAllSpatialData({
    commodity: selectedCommodity,
    skipGeometry: true,
    regressionOnly: true
  });
};

export const fetchVisualizationData = ({ mode, filters }) => {
  return fetchAllSpatialData({
    visualizationMode: mode,
    filters,
    visualizationOnly: true
  });
};

// Base Selectors with Safe Fallbacks
const selectSpatialState = (state) => {
  if (!state.spatial) {
    console.warn('Spatial state is undefined, using initial state');
    return initialState;
  }
  return state.spatial;
};

const selectData = createSelector(
  [selectSpatialState],
  (spatial) => spatial.data || initialState.data
);

const selectStatus = createSelector(
  [selectSpatialState],
  (spatial) => spatial.status || initialState.status
);

const selectUI = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui || initialState.ui
);

// Safe selector creator with error handling
const createSafeSelector = (selectors, combiner) => 
  createDeepEqualSelector(selectors, (...args) => {
    try {
      return combiner(...args);
    } catch (error) {
      console.warn('Selector error:', error);
      return null;
    }
  });

// Update handleSpatialError to use safe state access
export const handleSpatialError = createAsyncThunk(
  'spatial/handleError',
  async (error, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    const spatialState = selectSpatialState(state);
    
    const enhancedError = {
      originalError: error,
      state: {
        status: spatialState.status,
        ui: spatialState.ui
      },
      timestamp: Date.now()
    };

    backgroundMonitor.logError('spatial-error', enhancedError);

    const retryCount = spatialState.status.retryCount || 0;
    if (retryCount < 3) {
      dispatch(setRetryCount(retryCount + 1));
      return dispatch(
        fetchAllSpatialData({
          commodity: spatialState.ui.selectedCommodity,
          date: spatialState.ui.selectedDate,
          forceRefresh: true
        })
      );
    }

    return rejectWithValue(enhancedError);
  }
);

// Batch Update Thunk remains unchanged
export const batchUpdateSpatialState = createAsyncThunk(
  'spatial/batchUpdate',
  async (updates, { dispatch }) => {
    const metric = backgroundMonitor.startMetric('batch-update');

    try {
      const { geometry, data, ui } = updates;

      // Perform updates in order
      if (geometry) dispatch(updateGeometry(geometry));
      if (data) dispatch(updateData(data));
      if (ui) dispatch(updateUI(ui));

      metric.finish({ status: 'success' });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }
);

// Base Selectors
export const selectLoadingStatus = createSelector(
  [selectStatus],
  (status) => Boolean(status.loading)
);

export const selectUniqueMonths = createSelector(
  [selectData],
  (data) => data.uniqueMonths || []
);

// Optimized Selectors
export const selectSpatialData = createSafeSelector(
  [selectData],
  (data) => {
    return {
      geometry: data.geometry || {},
      flowMaps: data.flowMaps || [],
      timeSeriesData: data.timeSeriesData || [],
      marketClusters: data.marketClusters || [],
      marketShocks: data.marketShocks || [],
      commodities: data.commodities || [],
      spatialAutocorrelation: data.spatialAutocorrelation || {},
      seasonalAnalysis: data.seasonalAnalysis || null,
      marketIntegration: data.marketIntegration || null,
      regressionAnalysis: data.regressionAnalysis || null,
      uniqueMonths: data.uniqueMonths || [],
      visualizationData: data.visualizationData || {}
    };
  }
);

export const selectUIState = createDeepEqualSelector(
  [selectUI],
  (ui) => ({
    selectedCommodity: ui.selectedCommodity || '',
    selectedDate: ui.selectedDate || '',
    selectedRegimes: ui.selectedRegimes || ['unified'],
    selectedRegion: ui.selectedRegion || null,
    view: ui.view,
    activeLayers: ui.activeLayers || [],
    visualizationMode: ui.visualizationMode || null,
    analysisFilters: ui.analysisFilters || {}
  })
);

export const selectTimeSeriesData = createDeepEqualSelector(
  [
    (state) => selectSpatialState(state)?.data?.timeSeriesData || [],
    (state) => selectSpatialState(state)?.ui?.selectedRegimes || ['unified'],
    (state) => selectSpatialState(state)?.ui?.selectedDate || ''
  ],
  (timeSeriesData, selectedRegimes, selectedDate) => 
    timeSeriesData.filter(d => 
      (!selectedDate || d.month === selectedDate) &&
      (!selectedRegimes.length || selectedRegimes.includes(d.regime))
    )
);

export const selectFilteredClusters = createDeepEqualSelector(
  [
    (state) => selectSpatialState(state)?.data?.marketClusters || [],
    (state) => selectSpatialState(state)?.ui?.selectedRegion
  ],
  (clusters, selectedRegion) => {
    if (!selectedRegion) return clusters;
    return clusters.filter(c => 
      c.main_market === selectedRegion || 
      c.connected_markets?.includes(selectedRegion)
    );
  }
);

export const selectDetailedMetrics = createDeepEqualSelector(
  [
    selectTimeSeriesData,
    (state) => selectSpatialState(state)?.data?.regressionAnalysis || DEFAULT_REGRESSION_DATA,
    selectUIState
  ],
  (timeData, regressionData, ui) => {
    if (!timeData.length || !regressionData) return null;

    return {
      priceStats: {
        trend: calculatePriceTrend(timeData),
        seasonality: detectSeasonality(timeData),
        outliers: detectOutliers(timeData)
      },
      spatialDependence: {
        moranI: _.get(regressionData, 'spatial.moran_i.I', 0),
        pValue: _.get(regressionData, 'spatial.moran_i["p-value"]', 1),
        spatialLag: _.get(regressionData, 'model.coefficients.spatial_lag_price', 0)
      },
      modelFit: {
        rSquared: _.get(regressionData, 'model.r_squared', 0),
        adjRSquared: _.get(regressionData, 'model.adj_r_squared', 0),
        mse: _.get(regressionData, 'model.mse', 0),
        observations: _.get(regressionData, 'model.observations', 0)
      }
    };
  }
);

// Additional Selectors
export const selectMarketClusters = (state) => selectSpatialState(state)?.data?.marketClusters;
export const selectSpatialAutocorrelation = (state) => selectSpatialState(state)?.data?.spatialAutocorrelation;
export const selectMarketIntegration = (state) => selectSpatialState(state)?.data?.marketIntegration;
export const selectSeasonalAnalysis = (state) => selectSpatialState(state)?.data?.seasonalAnalysis;
export const selectMarketShocks = (state) => selectSpatialState(state)?.data?.marketShocks;
export const selectGeoJSON = (state) => selectSpatialState(state)?.data?.geometry?.unified;
export const selectMetadata = (state) => selectSpatialState(state)?.data?.metadata;
export const selectFlowMaps = (state) => selectSpatialState(state)?.data?.flowMaps;
export const selectResiduals = (state) => selectSpatialState(state)?.data?.regressionAnalysis?.residuals;
export const selectRegressionAnalysis = (state) => selectSpatialState(state)?.data?.regressionAnalysis;
export const selectModelStats = (state) => selectSpatialState(state)?.data?.regressionAnalysis?.model;
export const selectSpatialStats = (state) => selectSpatialState(state)?.data?.regressionAnalysis?.spatial;
export const selectActiveLayers = (state) => selectSpatialState(state)?.ui?.activeLayers;
export const selectAnalysisFilters = (state) => selectSpatialState(state)?.ui?.analysisFilters;
export const selectGeometryData = (state) => selectSpatialState(state)?.data?.geometry;
export const selectError = (state) => selectSpatialState(state)?.status?.error;
export const selectSelectedCommodity = (state) => selectSpatialState(state)?.ui?.selectedCommodity;
export const selectSelectedDate = (state) => selectSpatialState(state)?.ui?.selectedDate;
export const selectVisualizationMode = (state) => selectSpatialState(state)?.ui?.visualizationMode;

export const selectGeometryWithCache = createDeepEqualSelector(
  [selectGeometryData, (_, options) => options],
  (geometry, options = {}) => {
    if (options.skipCache) return geometry;
    return geometry?.cached || geometry;
  }
);

export const selectRegionIntegration = createDeepEqualSelector(
  [selectMarketIntegration, selectUIState],
  (integration, ui) => integration?.price_correlation?.[ui.selectedRegion] || {}
);

export const selectRegionShocks = createDeepEqualSelector(
  [selectMarketShocks, selectUIState],
  (shocks, ui) => (shocks || []).filter(shock => shock.region === ui.selectedRegion)
);

export const selectTimeSeriesWithFilters = createDeepEqualSelector(
  [
    selectTimeSeriesData,
    (state) => selectSpatialState(state)?.ui?.selectedRegimes,
    (state) => selectSpatialState(state)?.ui?.selectedDate
  ],
  (timeSeriesData, selectedRegimes, selectedDate) => {
    if (!timeSeriesData) return [];
    return timeSeriesData.filter(d => 
      (!selectedDate || d.month === selectedDate) &&
      (!selectedRegimes.length || selectedRegimes.includes(d.regime))
    );
  }
);

export const selectMarketMetrics = createDeepEqualSelector(
  [selectTimeSeriesData, selectUIState],
  (timeSeriesData, ui) => {
    if (!timeSeriesData?.length) return null;

    const filteredData = timeSeriesData.filter(d => 
      ui.selectedRegimes.includes(d.regime)
    );

    if (!filteredData.length) return null;

    return {
      averagePrice: filteredData.reduce((acc, d) => acc + (d.avgUsdPrice || 0), 0) / filteredData.length,
      volatility: filteredData.reduce((acc, d) => acc + (d.volatility || 0), 0) / filteredData.length,
      conflictIntensity: filteredData.reduce((acc, d) => acc + (d.conflict_intensity || 0), 0) / filteredData.length
    };
  }
);

export const selectMarketIntegrationMetrics = createDeepEqualSelector(
  [selectSpatialData],
  (data) => data?.marketIntegration
);

export const selectSpatialPatterns = createDeepEqualSelector(
  [selectSpatialData],
  (data) => ({
    clusters: data?.marketClusters,
    autocorrelation: data?.spatialAutocorrelation,
    flows: data?.flowMaps
  })
);

export const selectResidualsByRegion = createDeepEqualSelector(
  [selectResiduals, (_, regionId) => regionId],
  (residuals, regionId) => residuals?.byRegion?.[regionId] || []
);

export const selectRegressionMetrics = createDeepEqualSelector(
  [selectModelStats],
  (model) => ({
    r_squared: model?.r_squared || 0,
    adjRSquared: model?.adj_r_squared || 0,
    mse: model?.mse || 0,
    observations: model?.observations || 0
  })
);

export const selectSpatialMetrics = createDeepEqualSelector(
  [selectSpatialStats],
  (spatial) => ({
    moran_i: spatial?.moran_i || { I: 0, 'p-value': 0 },
    vif: spatial?.vif || []
  })
);

export const selectFilteredMarketData = createDeepEqualSelector(
  [selectSpatialData, selectAnalysisFilters],
  (data, filters) => {
    if (!data) return null;
    
    return {
      marketClusters: (data.marketClusters || []).filter(
        cluster => cluster.market_count >= (filters.minMarketCount || 0)
      ),
      flowMaps: (data.flowMaps || []).filter(
        flow => flow.flow_weight >= (filters.minFlowWeight || 0)
      ),
      marketShocks: (data.marketShocks || []).filter(
        shock => Math.abs(shock.magnitude) >= (filters.shockThreshold || 0)
      )
    };
  }
);

export const selectRegionGeometry = createDeepEqualSelector(
  [selectGeoJSON, selectUIState],
  (geoJSON, ui) => {
    if (!geoJSON?.features || !ui.selectedRegion) return null;
    return geoJSON.features.find(f => 
      f.properties.region_id === ui.selectedRegion
    );
  }
);

export const selectRegionWithTimeData = createDeepEqualSelector(
  [selectGeoJSON, selectTimeSeriesData, selectUIState],
  (geoJSON, timeData, ui) => {
    if (!geoJSON?.features || !ui.selectedRegion) return null;
    
    const feature = geoJSON.features.find(f => 
      f.properties.region_id === ui.selectedRegion
    );
    
    if (!feature) return null;

    const regionTimeData = timeData.filter(d => 
      d.region === ui.selectedRegion || 
      d.admin1 === ui.selectedRegion
    );

    return {
      ...feature,
      properties: {
        ...feature.properties,
        timeData: regionTimeData
      }
    };
  }
);

export const selectMarketConnections = createDeepEqualSelector(
  [selectFlowMaps, selectUIState],
  (flows, ui) => {
    if (!flows || !ui.selectedRegion) return [];
    
    return flows.filter(flow => 
      flow.source === ui.selectedRegion || 
      flow.target === ui.selectedRegion
    ).map(flow => ({
      ...flow,
      isSource: flow.source === ui.selectedRegion,
      coordinates: flow.source === ui.selectedRegion ? 
        flow.target_coordinates : 
        flow.source_coordinates
    }));
  }
);

export const selectActiveRegionData = createDeepEqualSelector(
  [
    selectRegionWithTimeData,
    selectMarketConnections,
    selectRegionIntegration,
    selectRegionShocks
  ],
  (geometry, connections, integration, shocks) => ({
    geometry,
    connections,
    integration,
    shocks,
    hasData: Boolean(geometry && geometry.properties.timeData.length)
  })
);

export const selectActiveRegionDataOptimized = createDeepEqualSelector(
  [
    selectActiveRegionData,
    selectGeometryData,
    selectUIState
  ],
  (regionData, geometryData, ui) => {
    if (!regionData?.geometry || !geometryData) return null;

    // Calculate geometric properties
    try {
      const center = calculateCenterOfMass(regionData.geometry);
      const bounds = calculateBoundingBox(regionData.geometry);
      const neighbors = findNeighboringRegions(
        regionData.geometry, 
        ui.selectedRegion,
        geometryData.polygons
      );

      return {
        ...regionData,
        computedMetrics: {
          centerOfMass: center,
          boundingBox: bounds,
          neighbors,
          hasComputedMetrics: true
        }
      };
    } catch (error) {
      console.warn('Error computing geometric metrics:', error);
      return {
        ...regionData,
        computedMetrics: {
          centerOfMass: null,
          boundingBox: null,
          neighbors: [],
          hasComputedMetrics: false,
          error: error.message
        }
      };
    }
  }
);

export const selectGeometryStatus = createDeepEqualSelector(
  [selectGeometryData],
  (geometry) => ({
    hasPolygons: Boolean(geometry?.polygons),
    hasPoints: Boolean(geometry?.points),
    hasUnified: Boolean(geometry?.unified),
    isComplete: Boolean(
      geometry?.polygons && 
      geometry?.points && 
      geometry?.unified
    )
  })
);

export const selectFlowData = createDeepEqualSelector(
  [selectSpatialData],
  (data) => data?.flowData?.flows || []
);

export const selectSpatialAnalysisResults = createDeepEqualSelector(
  [selectSpatialData],
  (data) => data?.spatialAnalysis || null
);

export const selectFlowMetadata = createDeepEqualSelector(
  [selectSpatialData],
  (data) => data?.flowData?.metadata || null
);

export const selectFlowsByRegion = createDeepEqualSelector(
  [selectFlowData, (_, regionId) => regionId],
  (flows, regionId) => flows.filter(flow => 
    flow.source === regionId || flow.target === regionId
  )
);

export const selectCommodityInfo = createDeepEqualSelector(
  [
    (state) => selectSpatialState(state)?.data?.commodities || [],
    (state) => selectSpatialState(state)?.ui?.selectedCommodity || '',
    selectLoadingStatus,
    selectUniqueMonths
  ],
  (commodities, selectedCommodity, loading, uniqueMonths) => ({
    commodities: [...(commodities || [])],
    selectedCommodity: selectedCommodity || '',
    loading: loading || false,
    uniqueMonths: [...(uniqueMonths || [])]
  })
);

// Metrics Cache and Helper
const metricsCache = new Map();

// Helper to clear cache and terminate workers when needed
export const clearGeometricCache = () => {
  metricsCache.clear();
  Object.values(workerManager.workers).forEach(worker => {
    if (worker) worker.terminate();
  });
};

// Create Slice
const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    setProgress: (state, action) => {
      state.status.progress = action.payload;
    },
    setLoadingStage: (state, action) => {
      state.status.stage = action.payload;
    },
    setView: (state, action) => {
      state.ui.view = action.payload;
    },
    setSelectedCommodity(state, action) {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedDate(state, action) {
      state.ui.selectedDate = action.payload;
    },
    setVisualizationMode(state, action) {
      state.ui.visualizationMode = action.payload;
    },
    setSelectedRegion: (state, action) => {
      state.ui.selectedRegion = action.payload;
    },
    setSelectedRegimes: (state, action) => {
      state.ui.selectedRegimes = action.payload;
    },
    setActiveLayers: (state, action) => {
      state.ui.activeLayers = action.payload;
    },
    resetVisualizationData: (state) => {
      state.data.visualizationData = initialState.data.visualizationData;
    },
    setRetryCount: (state, action) => {
      state.status.retryCount = action.payload;
    },
    updateGeometry: (state, action) => {
      state.data.geometry = action.payload;
    },
    updateData: (state, action) => {
      state.data = { ...state.data, ...action.payload };
    },
    updateUI: (state, action) => {
      state.ui = { ...state.ui, ...action.payload };
    },
    // Add any additional reducers if necessary
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSpatialData.pending, (state, action) => {
        const { regressionOnly, visualizationOnly } = action.meta.arg;
        state.status.loading = !regressionOnly && !visualizationOnly;
        state.status.regressionLoading = regressionOnly;
        state.status.visualizationLoading = visualizationOnly;
        state.status.error = null;
        state.status.dataFetching = true;
      })
      .addCase(fetchAllSpatialData.fulfilled, (state, action) => {
        const {
          geometry,
          spatialData,
          regressionData,
          visualizationData,
          metadata,
          cacheKey,
          cacheTimestamp
        } = action.payload;
        const { regressionOnly, visualizationOnly, commodity } = action.meta.arg;
      
        // Update commodities from spatialData
        if (spatialData?.commodities?.length > 0) {
          state.data.commodities = [...new Set([
            ...(state.data.commodities || []),
            ...spatialData.commodities
          ])].sort();
        }

        // Process flow data if available
        if (spatialData?.flowMaps) {
          state.data.flowData = processFlowData(spatialData.flowMaps);
        }

        // Update regression data if available
        if (regressionData) {
          const currentCommodity = commodity || state.ui.selectedCommodity;
          state.data.regressionAnalysis = {
            ...regressionData,
            model: regressionData.model || {},
            spatial: regressionData.spatial || { moran_i: { I: 0, 'p-value': 1 }, vif: [] },
            residuals: regressionData.residuals || { raw: [], byRegion: {}, stats: {} },
            metadata: {
              commodity: currentCommodity,
              timestamp: new Date().toISOString(),
              version: "1.0"
            }
          };
        }

        // Handle regression-only fulfillment
        if (regressionOnly) {
          state.status.regressionLoading = false;
          state.status.dataFetching = false;
          return;
        }

        // Handle visualization-only fulfillment
        if (visualizationOnly) {
          if (visualizationData) {
            state.data.visualizationData[visualizationData.mode] = visualizationData.data;
          }
          state.status.visualizationLoading = false;
          state.status.dataFetching = false;
          return;
        }

        // Update geometry if available
        if (geometry) {
          state.data.geometry = geometry;
        }

        // Update spatial data
        if (spatialData) {
          state.data = {
            ...state.data,
            timeSeriesData: spatialData.timeSeriesData || [],
            flowMaps: spatialData.flowMaps || [],
            marketClusters: spatialData.marketClusters || [],
            marketShocks: spatialData.marketShocks || [],
            spatialAutocorrelation: spatialData.spatialAutocorrelation || {
              global: {},
              local: {}
            },
            seasonalAnalysis: spatialData.seasonalAnalysis || {},
            marketIntegration: spatialData.marketIntegration || {},
            uniqueMonths: spatialData.uniqueMonths || []
          };
        }

        // Update metadata
        if (metadata) {
          state.data.metadata = metadata;
          state.ui.selectedCommodity = metadata.commodity;
          state.ui.selectedDate = metadata.date;
        }

        // Update cache if cacheKey is present
        if (cacheKey) {
          state.data.cache[cacheKey] = {
            geometry: state.data.geometry,
            spatialData: {
              timeSeriesData: state.data.timeSeriesData,
              flowMaps: state.data.flowMaps,
              marketClusters: state.data.marketClusters,
              marketShocks: state.data.marketShocks,
              spatialAutocorrelation: state.data.spatialAutocorrelation,
              seasonalAnalysis: state.data.seasonalAnalysis,
              marketIntegration: state.data.marketIntegration,
              uniqueMonths: state.data.uniqueMonths
            },
            regressionData: state.data.regressionAnalysis,
            visualizationData,
            metadata,
            cacheTimestamp
          };
          state.status.lastUpdated = cacheTimestamp;
        }

        // Update status
        state.status = {
          ...state.status,
          loading: false,
          dataFetching: false,
          error: null,
          progress: 100,
          stage: 'complete',
          geometryLoading: false,
          regressionLoading: false,
          visualizationLoading: false
        };
      })
      .addCase(fetchAllSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.stage = 'error';
        state.status.geometryLoading = false;
        state.status.regressionLoading = false;
        state.status.visualizationLoading = false;
        state.status.dataFetching = false;
        state.status.lastError = action.payload;
      })
      .addCase(fetchFlowData.pending, (state) => {
        state.status.dataFetching = true;
        state.status.error = null;
      })
      .addCase(fetchFlowData.fulfilled, (state, action) => {
        state.data.flowData = processFlowData(action.payload);
        state.status.dataFetching = false;
        state.status.error = null;
      })
      .addCase(fetchFlowData.rejected, (state, action) => {
        state.status.dataFetching = false;
        state.status.error = action.payload;
      });
  }
});

// Export actions
export const {
  setProgress,
  setLoadingStage,
  setView,
  setSelectedCommodity,
  setSelectedDate,
  setVisualizationMode,
  setSelectedRegion,
  setSelectedRegimes,
  setActiveLayers,
  resetVisualizationData,
  setRetryCount,
  updateGeometry,
  updateData,
  updateUI
} = spatialSlice.actions;

// Export the reducer
export default spatialSlice.reducer;