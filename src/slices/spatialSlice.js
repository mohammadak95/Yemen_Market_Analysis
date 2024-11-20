// src/slices/spatialSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
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
import { DEFAULT_GEOJSON, DEFAULT_VIEW, VISUALIZATION_MODES } from '../constants/index';
import { getDataPath } from '../utils/dataUtils';

// Initial State with Added Loading States
export const initialState = {
  data: {
    // Geometry data
    geometry: {
      polygons: null,   
      points: null,      
      unified: null      
    },
    // Analysis data
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
    // Cache for fetched data
    cache: {}
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
    dataFetching: false,   // Added
    dataCaching: false,    // Added
    lastUpdated: null,     // Added
    retryCount: 0,         // Added
    lastError: null        // Added
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    view: DEFAULT_VIEW,
    activeLayers: [],
    visualizationMode: null,
    analysisFilters: {
      minMarketCount: 0,
      minFlowWeight: 0,
      shockThreshold: 0
    }
  }
};

// Thunk Optimization: fetchAllSpatialData with Caching and Enhanced Error Handling
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
    forceRefresh = false // Added for cache bypass
  }, { getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    const state = getState();
    const cacheKey = `${commodity}_${date}`;
    
    // Cache Check
    if (state.spatial.data.cache[cacheKey] && !forceRefresh) {
      metric.finish({ status: 'success (cache)' });
      return state.spatial.data.cache[cacheKey];
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
      
      // Create unified GeoJSON with time series data
      const unifiedGeoJSON = await spatialHandler.createUnifiedGeoJSON(
        preprocessedData.time_series_data
      );

      // Process flow data with coordinates
      const processedFlows = preprocessedData.flow_analysis?.map(flow => ({
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
        ...preprocessedData,
        geometry: {
          ...result.geometry,
          unified: unifiedGeoJSON
        },
        flowMaps: processedFlows
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

// Error Handling Improvements: handleSpatialError Thunk
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
      return dispatch(fetchAllSpatialData({ 
        commodity: state.spatial.ui.selectedCommodity, 
        date: state.spatial.ui.selectedDate, 
        forceRefresh: true 
      }));
    }
    
    return rejectWithValue(enhancedError);
  }
);

// Performance Optimization: batchUpdateSpatialState Thunk
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
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
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
    setRetryCount: (state, action) => { // Added
      state.status.retryCount = action.payload;
    },
    updateGeometry: (state, action) => { // Added for batch updates
      state.data.geometry = action.payload;
    },
    updateData: (state, action) => { // Added for batch updates
      state.data = { ...state.data, ...action.payload };
    },
    updateUI: (state, action) => { // Added for batch updates
      state.ui = { ...state.ui, ...action.payload };
    },
    // Add any additional reducers if necessary
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSpatialData.pending, (state, action) => {
        // Check which type of loading is occurring
        const { regressionOnly, visualizationOnly } = action.meta.arg;
        
        state.status.loading = !regressionOnly && !visualizationOnly;
        state.status.regressionLoading = regressionOnly;
        state.status.visualizationLoading = visualizationOnly;
        state.status.error = null;
        state.status.dataFetching = true; // Added
      })
      .addCase(fetchAllSpatialData.fulfilled, (state, action) => {
        const { geometry, spatialData, regressionData, visualizationData, metadata, cacheKey, cacheTimestamp } = action.payload;
        const { regressionOnly, visualizationOnly } = action.meta.arg;

        // Handle regression-only update
        if (regressionOnly) {
          state.data.regressionAnalysis = regressionData;
          state.status.regressionLoading = false;
          state.status.dataFetching = false; // Added
          return;
        }

        // Handle visualization-only update
        if (visualizationOnly) {
          if (visualizationData) {
            state.data.visualizationData[visualizationData.mode] = visualizationData.data;
          }
          state.status.visualizationLoading = false;
          state.status.dataFetching = false; // Added
          return;
        }

        // Full data update
        if (geometry) {
          state.data.geometry = geometry;
        }

        if (spatialData) {
          state.data = {
            ...state.data,
            timeSeriesData: spatialData.time_series_data,
            flowMaps: spatialData.flowMaps,
            marketClusters: spatialData.marketClusters || [],
            marketShocks: spatialData.marketShocks || [],
            spatialAutocorrelation: spatialData.spatialAutocorrelation || {
              global: {},
              local: {}
            },
            seasonalAnalysis: spatialData.seasonalAnalysis || {},
            marketIntegration: spatialData.marketIntegration || {},
            uniqueMonths: [...new Set(
              spatialData.time_series_data.map(d => d.month)
            )].sort()
          };
        }

        if (regressionData) {
          state.data.regressionAnalysis = regressionData;
        }

        if (visualizationData) {
          state.data.visualizationData[visualizationData.mode] = visualizationData.data;
        }

        if (metadata) {
          state.data.metadata = metadata;
          state.ui.selectedCommodity = metadata.commodity;
          state.ui.selectedDate = metadata.date;
        }

        // Update Cache
        if (cacheKey) {
          state.data.cache[cacheKey] = {
            ...action.payload,
            cacheTimestamp
          };
          state.status.lastUpdated = cacheTimestamp;
        }

        // Reset loading states
        state.status.loading = false;
        state.status.error = null;
        state.status.progress = 100;
        state.status.stage = 'complete';
        state.status.geometryLoading = false;
        state.status.regressionLoading = false;
        state.status.visualizationLoading = false;
        state.status.dataFetching = false; // Added
      })
      .addCase(fetchAllSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
        state.status.stage = 'error';
        state.status.geometryLoading = false;
        state.status.regressionLoading = false;
        state.status.visualizationLoading = false;
        state.status.dataFetching = false; // Added
        state.status.lastError = action.payload; // Added
      })
      .addCase(handleSpatialError.fulfilled, (state, action) => {
        // Handle any state updates if necessary after error handling
      })
      .addCase(handleSpatialError.rejected, (state, action) => {
        state.status.error = action.payload;
        state.status.stage = 'error';
      })
      .addCase(batchUpdateSpatialState.fulfilled, (state, action) => {
        // Handle any state updates if necessary after batch updates
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
  setSelectedRegion,
  setSelectedRegimes,
  setActiveLayers,
  resetVisualizationData,
  setRetryCount,
  updateGeometry,
  updateData,
  updateUI
} = spatialSlice.actions;

// Selectors
export const selectSpatialData = (state) => state.spatial.data;
export const selectUIState = (state) => state.spatial.ui;
export const selectLoadingStatus = (state) => state.spatial.status;
export const selectTimeSeriesData = (state) => state.spatial.data.timeSeriesData;
export const selectFlowData = (state) => state.spatial.data.flowMaps;
export const selectMarketClusters = (state) => state.spatial.data.marketClusters;
export const selectSpatialAutocorrelation = (state) => state.spatial.data.spatialAutocorrelation;
export const selectMarketIntegration = (state) => state.spatial.data.marketIntegration;
export const selectSeasonalAnalysis = (state) => state.spatial.data.seasonalAnalysis;
export const selectUniqueMonths = (state) => state.spatial.data.uniqueMonths;
export const selectMarketShocks = (state) => state.spatial.data.marketShocks;
export const selectGeoJSON = (state) => state.spatial.data.geometry.unified;
export const selectMetadata = (state) => state.spatial.data.metadata;
export const selectFlowMaps = (state) => state.spatial.data.flowMaps;
export const selectResiduals = (state) => state.spatial.data.regressionAnalysis?.residuals;
export const selectRegressionAnalysis = (state) => state.spatial.data.regressionAnalysis;
export const selectModelStats = (state) => state.spatial.data.regressionAnalysis?.model;
export const selectSpatialStats = (state) => state.spatial.data.regressionAnalysis?.spatial;
export const selectVisualizationMode = (state) => state.spatial.ui.visualizationMode;
export const selectActiveLayers = (state) => state.spatial.ui.activeLayers;
export const selectAnalysisFilters = (state) => state.spatial.ui.analysisFilters;
export const selectGeometryData = (state) => state.spatial.data.geometry;

// Selector Optimization: Memoization for Heavy Selectors
export const selectGeometryWithCache = createSelector(
  [selectGeometryData, (_, options) => options],
  (geometry, options = {}) => {
    if (options.skipCache) return geometry;
    return geometry?.cached || geometry;
  }
);

// Composite Selectors for Analysis
export const selectRegionIntegration = createSelector(
  [selectMarketIntegration, selectUIState],
  (integration, ui) => integration.price_correlation[ui.selectedRegion] || {}
);

export const selectRegionShocks = createSelector(
  [selectMarketShocks, selectUIState],
  (shocks, ui) => shocks.filter(shock => shock.region === ui.selectedRegion)
);

export const selectFilteredTimeSeriesData = createSelector(
  [selectTimeSeriesData, selectUIState],
  (timeSeriesData, ui) => timeSeriesData.filter(d => 
    d.month === ui.selectedDate && 
    ui.selectedRegimes.includes(d.regime)
  )
);

export const selectFilteredClusters = createSelector(
  [selectMarketClusters, selectUIState],
  (clusters, ui) => ui.selectedRegion 
    ? clusters.filter(c => 
        c.main_market === ui.selectedRegion || 
        c.connected_markets.includes(ui.selectedRegion)
      )
    : clusters
);

export const selectMarketMetrics = createSelector(
  [selectTimeSeriesData, selectUIState],
  (timeSeriesData, ui) => {
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

export const selectRegionTimeSeriesData = createSelector(
  [selectTimeSeriesData, selectUIState],
  (data, ui) => data.filter(d => d.region === ui.selectedRegion)
);

// Removed selectRegionEfficiency as it referenced non-existent state property

export const selectDetailedMetrics = createSelector(
  [selectTimeSeriesData, selectRegressionAnalysis, selectUIState],
  (timeData, regressionData, ui) => {
    if (!timeData?.length || !regressionData) return null;

    return {
      priceStats: {
        trend: calculatePriceTrend(timeData),
        seasonality: detectSeasonality(timeData),
        outliers: detectOutliers(timeData)
      },
      spatialDependence: {
        moranI: regressionData.spatial.moran_i?.I || 0,
        pValue: regressionData.spatial.moran_i?.['p-value'] || 1,
        spatialLag: regressionData.model?.coefficients?.spatial_lag_price || 0
      },
      modelFit: {
        rSquared: regressionData.model?.r_squared || 0,
        adjRSquared: regressionData.model?.adj_r_squared || 0,
        mse: regressionData.model?.mse || 0,
        observations: regressionData.model?.observations || 0
      }
    };
  }
);

export const selectMarketIntegrationMetrics = createSelector(
  [selectSpatialData],
  (data) => data?.marketIntegration
);

export const selectSpatialPatterns = createSelector(
  [selectSpatialData],
  (data) => ({
    clusters: data?.marketClusters,
    autocorrelation: data?.spatialAutocorrelation,
    flows: data?.flowMaps
  })
);

export const selectResidualsByRegion = createSelector(
  [selectResiduals, (_, regionId) => regionId],
  (residuals, regionId) => residuals?.byRegion?.[regionId] || []
);

export const selectRegressionMetrics = createSelector(
  [selectModelStats],
  (model) => ({
    r_squared: model?.r_squared || 0,
    adj_r_squared: model?.adj_r_squared || 0,
    mse: model?.mse || 0,
    observations: model?.observations || 0
  })
);

export const selectSpatialMetrics = createSelector(
  [selectSpatialStats],
  (spatial) => ({
    moran_i: spatial?.moran_i || { I: 0, 'p-value': 0 },
    vif: spatial?.vif || []
  })
);

export const selectFilteredMarketData = createSelector(
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

// Removed the first selectGeometryStatus and kept the memoized one below

export const selectRegionGeometry = createSelector(
  [selectGeoJSON, selectUIState],
  (geoJSON, ui) => {
    if (!geoJSON?.features || !ui.selectedRegion) return null;
    return geoJSON.features.find(f => 
      f.properties.region_id === ui.selectedRegion
    );
  }
);

export const selectRegionWithTimeData = createSelector(
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

export const selectMarketConnections = createSelector(
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

export const selectActiveRegionData = createSelector(
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

// Keep only one definition of selectActiveRegionDataOptimized
export const selectActiveRegionDataOptimized = createSelector(
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

// Add supporting selectors for geometric data (removed duplicate)
export const selectGeometryStatus = createSelector(
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


// Add a simple cache for geometric computations
const metricsCache = new Map();

// Helper to clear cache when needed
export const clearGeometricCache = () => {
  metricsCache.clear();
};

// Export the reducer
export default spatialSlice.reducer;