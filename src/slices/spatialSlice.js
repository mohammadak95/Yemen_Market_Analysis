// src/slices/spatialSlice.js

import { useMemo } from 'react';
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createSelectorCreator, lruMemoize } from 'reselect';
import _ from 'lodash';
import { spatialHandler } from '../utils/spatialDataHandler';
import { DEFAULT_REGRESSION_DATA } from '../types/dataTypes';
import { backgroundMonitor } from '../utils/backgroundMonitor';
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

// Optimized Selector Creator using the custom selector
const createOptimizedSelector = (...args) => {
  const lastArg = args[args.length - 1];
  const selectorArgs = args.slice(0, -1);
  const options = {
    ...memoizationConfig,
    ...(typeof lastArg === 'object' ? lastArg : {})
  };
  return createDeepEqualSelector(...selectorArgs, options);
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
    regressionAnalysis: DEFAULT_REGRESSION_DATA,
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
      metadata: null,
      lastUpdated: null
    },
    spatialAnalysis: {
      moranI: null,
      clusters: [],
      regressionResults: null
    },
    commodities: [] // Initialized as an empty array
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
    selectedCommodity: '',
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
  async (
    {
      commodity,
      date,
      visualizationMode,
      filters,
      skipGeometry = false,
      regressionOnly = false,
      visualizationOnly = false,
      forceRefresh = false
    },
    { getState, rejectWithValue }
  ) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    const state = getState();
    const cacheKey = `${commodity}_${date}`;

    // Cache Check
    if (state.spatial.data.cache[cacheKey] && !forceRefresh) {
      const cachedData = state.spatial.data.cache[cacheKey];

      // Process cached data to map snake_case to camelCase
      const processedData = {
        ...cachedData,
        spatialData: {
          ...cachedData.spatialData,
          timeSeriesData: cachedData.spatialData.time_series_data || [],
          flowMaps: cachedData.spatialData.flow_analysis || [],
          marketClusters: cachedData.spatialData.market_clusters || [],
          marketShocks: cachedData.spatialData.market_shocks || [],
          spatialAutocorrelation: cachedData.spatialData.spatial_autocorrelation || {
            global: {},
            local: {}
          },
          seasonalAnalysis: cachedData.spatialData.seasonal_analysis || {},
          marketIntegration: cachedData.spatialData.market_integration || {},
          uniqueMonths: [...new Set(cachedData.spatialData.time_series_data?.map(d => d.month) || [])].sort()
        }
      };

      metric.finish({ status: 'success (cache)' });
      return processedData;
    }

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
          const regressionData = await spatialHandler.loadRegressionAnalysis(commodity);
          result.regressionData = regressionData;
        } catch (error) {
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
            state.spatial.data,
            visualizationMode,
            filters
          );
          result.visualizationData = {
            mode: visualizationMode,
            data: visualizationData
          };
        } catch (error) {
          console.warn('Visualization processing failed:', error);
        }
        metric.finish({ status: 'success' });
        return result;
      }

      // Standard full data load
      if (!skipGeometry) {
        // Initialize geometry if needed
        if (!state.spatial.data.geometry.unified) {
          await Promise.all([
            spatialHandler.initializeGeometry(),
            spatialHandler.initializePoints()
          ]);

          result.geometry = {
            polygons: Array.from(spatialHandler.geometryCache.values()),
            points: Array.from(spatialHandler.pointCache.values()),
            unified: await spatialHandler.createUnifiedGeoJSON([])
          };
        } else {
          result.geometry = state.spatial.data.geometry;
        }
      }

      // Get preprocessed spatial data
      const preprocessedData = await spatialHandler.getSpatialData(commodity, date);
      console.log('Loaded preprocessed data:', preprocessedData);

      // Create unified GeoJSON with time series data
      const unifiedGeoJSON = await spatialHandler.createUnifiedGeoJSON(
        preprocessedData.time_series_data
      );

      // Process flow data with coordinates
      const processedFlows =
        preprocessedData.flow_analysis?.map(flow => ({
          source: flow.source,
          target: flow.target,
          totalFlow: flow.total_flow || 0,
          avgFlow: flow.avg_flow || 0,
          flowCount: flow.flow_count || 0,
          avgPriceDifferential: flow.avg_price_differential || 0,
          source_coordinates: spatialHandler.getCoordinates(flow.source),
          target_coordinates: spatialHandler.getCoordinates(flow.target)
        })) || [];

      result.spatialData = {
        timeSeriesData: preprocessedData.time_series_data || [],
        flowMaps: processedFlows || [],
        marketClusters: preprocessedData.market_clusters || [],
        marketShocks: preprocessedData.market_shocks || [],
        spatialAutocorrelation: preprocessedData.spatial_autocorrelation || {
          global: {},
          local: {}
        },
        seasonalAnalysis: preprocessedData.seasonal_analysis || {},
        marketIntegration: preprocessedData.market_integration || {},
        uniqueMonths: [...new Set(preprocessedData.time_series_data?.map(d => d.month) || [])].sort()
      };

      // Add result to cache
      result.cacheTimestamp = Date.now();
      const updatedResult = {
        ...result,
        cacheKey
      };
      metric.finish({ status: 'success' });
      return updatedResult;
    } catch (error) {
      // Enhanced Error Handling
      const enhancedError = {
        message: error.message,
        details: {
          params: { commodity, date },
          state: getState().spatial.status,
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

export const handleSpatialError = createAsyncThunk(
  'spatial/handleError',
  async (error, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    const enhancedError = {
      originalError: error,
      state: {
        status: state.spatial.status,
        ui: state.spatial.ui
      },
      timestamp: Date.now()
    };

    backgroundMonitor.logError('spatial-error', enhancedError);

    // Attempt recovery with retry logic
    if (state.spatial.status.retryCount < 3) {
      dispatch(setRetryCount(state.spatial.status.retryCount + 1));
      return dispatch(
        fetchAllSpatialData({
          commodity: state.spatial.ui.selectedCommodity,
          date: state.spatial.ui.selectedDate,
          forceRefresh: true
        })
      );
    }

    return rejectWithValue(enhancedError);
  }
);

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
const selectSpatialState = state => state.spatial || {};
const selectData = state => state.spatial?.data || {};
const selectStatus = state => state.spatial?.status || {};
const selectUI = state => state.spatial?.ui || {};

export const selectLoadingStatus = createSelector(
  [selectStatus],
  status => Boolean(status.loading)
);

export const selectUniqueMonths = createSelector(
  [selectData],
  data => data.uniqueMonths || []
);

// Optimized Selectors
export const selectSpatialData = createDeepEqualSelector(
  [selectData],
  (data) => {
    // Create stable references for all arrays and objects
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
    state => state.spatial?.data?.timeSeriesData || [],
    state => state.spatial?.ui?.selectedRegimes || ['unified'],
    state => state.spatial?.ui?.selectedDate || ''
  ],
  (timeSeriesData, selectedRegimes, selectedDate) => {
    // Memoize filtered data to maintain referential equality
    return useMemo(() => 
      timeSeriesData.filter(d => 
        (!selectedDate || d.month === selectedDate) &&
        (!selectedRegimes.length || selectedRegimes.includes(d.regime))
      ),
      [timeSeriesData, selectedRegimes, selectedDate]
    );
  }
);

// Market clusters with filtering
export const selectFilteredClusters = createDeepEqualSelector(
  [
    state => state.spatial?.data?.marketClusters || [],
    state => state.spatial?.ui?.selectedRegion
  ],
  (clusters, selectedRegion) => {
    if (!selectedRegion) return clusters;
    return clusters.filter(c => 
      c.main_market === selectedRegion || 
      c.connected_markets?.includes(selectedRegion)
    );
  }
);

// Detailed metrics with proper memoization
export const selectDetailedMetrics = createDeepEqualSelector(
  [
    selectTimeSeriesData,
    state => state.spatial.data.regressionAnalysis || DEFAULT_REGRESSION_DATA,
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
        pValue: _.get(regressionData, 'spatial.moran_i.p-value', 1),
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
export const selectMarketClusters = (state) => state.spatial.data.marketClusters;
export const selectSpatialAutocorrelation = (state) => state.spatial.data.spatialAutocorrelation;
export const selectMarketIntegration = (state) => state.spatial.data.marketIntegration;
export const selectSeasonalAnalysis = (state) => state.spatial.data.seasonalAnalysis;
export const selectMarketShocks = (state) => state.spatial.data.marketShocks;
export const selectGeoJSON = (state) => state.spatial.data.geometry.unified;
export const selectMetadata = (state) => state.spatial.data.metadata;
export const selectFlowMaps = (state) => state.spatial.data.flowMaps;
export const selectResiduals = (state) => state.spatial.data.regressionAnalysis?.residuals;
export const selectRegressionAnalysis = (state) => state.spatial.data.regressionAnalysis;
export const selectModelStats = (state) => state.spatial.data.regressionAnalysis?.model;
export const selectSpatialStats = (state) => state.spatial.data.regressionAnalysis?.spatial;
export const selectActiveLayers = (state) => state.spatial.ui.activeLayers;
export const selectAnalysisFilters = (state) => state.spatial.ui.analysisFilters;
export const selectGeometryData = (state) => state.spatial.data.geometry;
export const selectError = (state) => state.spatial.status.error;
export const selectSelectedCommodity = (state) => state.spatial.ui.selectedCommodity;
export const selectSelectedDate = (state) => state.spatial.ui.selectedDate;
export const selectVisualizationMode = (state) => state.spatial.ui.visualizationMode;

// Selector Optimization: Memoization for Heavy Selectors
export const selectGeometryWithCache = createDeepEqualSelector(
  [selectGeometryData, (_, options) => options],
  (geometry, options = {}) => {
    if (options.skipCache) return geometry;
    return geometry?.cached || geometry;
  }
);

// Composite Selectors for Analysis
export const selectRegionIntegration = createDeepEqualSelector(
  [selectMarketIntegration, selectUIState],
  (integration, ui) => integration.price_correlation[ui.selectedRegion] || {}
);

export const selectRegionShocks = createDeepEqualSelector(
  [selectMarketShocks, selectUIState],
  (shocks, ui) => shocks.filter(shock => shock.region === ui.selectedRegion)
);

export const selectTimeSeriesWithFilters = createDeepEqualSelector(
  [
    selectTimeSeriesData,
    state => state.spatial.ui.selectedRegimes,
    state => state.spatial.ui.selectedDate
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
      marketClusters: data.marketClusters.filter(
        cluster => cluster.market_count >= filters.minMarketCount
      ),
      flowMaps: data.flowMaps.filter(
        flow => flow.flow_weight >= filters.minFlowWeight
      ),
      marketShocks: data.marketShocks.filter(
        shock => Math.abs(shock.magnitude) >= filters.shockThreshold
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
    state => state.spatial?.data?.commodities || [],
    state => state.spatial?.ui?.selectedCommodity || '',
    selectLoadingStatus,
    selectUniqueMonths
  ],
  (commodities, selectedCommodity, loading, uniqueMonths) => {
    // Create a stable reference for arrays
    const stableUnique = useMemo(() => [...uniqueMonths], [uniqueMonths]);
    const stableCommodities = useMemo(() => [...commodities], [commodities]);
    
    return {
      commodities: stableCommodities,
      selectedCommodity,
      loading,
      uniqueMonths: stableUnique
    };
  }
);



export const selectVisualizationData = createDeepEqualSelector(
  [
    state => state.spatial.data.visualizationData,
    state => state.spatial.ui.visualizationMode
  ],
  (visualizationData, mode) => mode ? visualizationData[mode] : null
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
        if (spatialHandler.availableCommodities?.length) {
          state.data.commodities = [
            ...new Set([...(state.data.commodities || []), ...spatialHandler.availableCommodities])
          ].sort();
        }

        const {
          geometry,
          spatialData,
          regressionData,
          visualizationData,
          metadata,
          cacheKey,
          cacheTimestamp
        } = action.payload;
        const { regressionOnly, visualizationOnly } = action.meta.arg;

        if (regressionOnly) {
          state.data.regressionAnalysis = regressionData;
          state.status.regressionLoading = false;
          state.status.dataFetching = false;
          return;
        }

        if (visualizationOnly) {
          if (visualizationData) {
            state.data.visualizationData[visualizationData.mode] = visualizationData.data;
          }
          state.status.visualizationLoading = false;
          state.status.dataFetching = false;
          return;
        }

        if (geometry) {
          state.data.geometry = geometry;
        }

        if (spatialData) {
          state.data = {
            ...state.data,
            // Explicitly map snake_case to camelCase
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
            uniqueMonths: spatialData.uniqueMonths || [],
            // Do not spread spatialData directly to prevent duplicates
          };
        }

        if (metadata) {
          state.data.metadata = metadata;
          state.ui.selectedCommodity = metadata.commodity;
          state.ui.selectedDate = metadata.date;
        }

        if (cacheKey) {
          // Store processed data in cache to prevent duplicates
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
            regressionData,
            visualizationData,
            metadata,
            cacheTimestamp
          };
          state.status.lastUpdated = cacheTimestamp;
        }

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
        state.data.flowData = {
          flows: action.payload,
          metadata: {
            lastUpdated: new Date().toISOString()
          }
        };
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