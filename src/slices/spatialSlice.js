import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelectorCreator } from 'reselect';
import isEqual from 'lodash/isEqual';
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

// Custom memoization function using lodash's isEqual for deep comparison
const deepMemoize = (func) => {
  let lastArgs = [];
  let lastResult = null;
  return (...args) => {
    if (!isEqual(args, lastArgs)) {
      lastResult = func(...args);
      lastArgs = args;
    }
    return lastResult;
  };
};

// Create a selector creator that uses deepMemoize for memoization
const createDeepEqualSelector = createSelectorCreator(deepMemoize);

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
    try {
      // Skip invalid flows
      if (!flow || typeof flow !== 'object') return acc;
      
      // Ensure flow has required fields
      if (!flow.source || !flow.target || !flow.flow_weight) return acc;
      
      const date = flow.date || flow.month;
      if (!date || typeof date !== 'string') return acc;
      
      // Format date to YYYY-MM, ensuring we have enough characters
      if (date.length < 7) return acc;
      const formattedDate = date.substring(0, 7);
      
      // Initialize array for this date if it doesn't exist
      if (!acc[formattedDate]) {
        acc[formattedDate] = [];
      }
      
      // Add validated flow to the date group with safe number conversions
      acc[formattedDate].push({
        source: String(flow.source),
        target: String(flow.target),
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
    } catch (error) {
      console.warn('Error processing flow:', error);
      return acc;
    }
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

// Initial State with Required Properties
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
    regressionAnalysis: {
      ...DEFAULT_REGRESSION_DATA,
      metadata: {
        ...DEFAULT_REGRESSION_DATA.metadata,
        commodity: "beans (kidney red)",
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
    selectedCommodity: 'beans (kidney red)',
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
    signal
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

      const spatialData = await spatialHandler.getSpatialData(commodity, date, signal);
      
      result.spatialData = {
        timeSeriesData: spatialData.timeSeriesData || [],
        flowMaps: spatialData.flowMaps || [],
        marketClusters: spatialData.marketClusters || [],
        marketShocks: spatialData.marketShocks || [],
        spatialAutocorrelation: spatialData.spatialAutocorrelation || {},
        uniqueMonths: [...new Set(spatialData.timeSeriesData?.map(d => d.month) || [])].sort(),
        commodities: spatialData.commodities || []
      };

      result.cacheTimestamp = Date.now();
      const updatedResult = {
        ...result,
        cacheKey
      };

      metric.finish({ status: 'success' });
      return updatedResult;

    } catch (error) {
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

// Backward compatibility exports
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
  return {
    data: state.spatial.data,
    status: state.spatial.status,
    ui: state.spatial.ui
  };
};

const selectData = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data || initialState.data
);

const selectStatus = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.status || initialState.status
);

const selectUI = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.ui || initialState.ui
);

// Create safe selector
const createSafeSelector = (selectors, combiner) => 
  createDeepEqualSelector(selectors, (...args) => {
    try {
      return combiner(...args);
    } catch (error) {
      console.warn('Selector error:', error);
      return null;
    }
  });

// Backward compatibility selectors (returning null or empty objects)
export const selectMarketIntegration = createDeepEqualSelector(
  [selectSpatialState],
  () => ({})
);

export const selectSeasonalAnalysis = createDeepEqualSelector(
  [selectSpatialState],
  () => null
);

// Regular selectors
export const selectLoadingStatus = createDeepEqualSelector(
  [selectStatus],
  (status) => Boolean(status.loading)
);

export const selectUniqueMonths = createDeepEqualSelector(
  [selectData],
  (data) => data.uniqueMonths || []
);

export const selectSpatialData = createSafeSelector(
  [selectData],
  (data) => ({
    geometry: data.geometry || {},
    flowMaps: data.flowMaps || [],
    timeSeriesData: data.timeSeriesData || [],
    marketClusters: data.marketClusters || [],
    marketShocks: data.marketShocks || [],
    commodities: data.commodities || [],
    spatialAutocorrelation: data.spatialAutocorrelation || {},
    regressionAnalysis: data.regressionAnalysis || null,
    uniqueMonths: data.uniqueMonths || [],
    visualizationData: data.visualizationData || {}
  })
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

export const selectMarketClustersMemoized = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.marketClusters || []
);

export const selectSpatialAutocorrelation = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.spatialAutocorrelation || {}
);

export const selectMarketShocks = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.marketShocks || []
);

export const selectGeoJSON = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.geometry?.unified || {}
);

export const selectMetadata = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.metadata || {}
);

export const selectFlowMaps = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.flowMaps || []
);

export const selectResiduals = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.regressionAnalysis?.residuals || {}
);

export const selectRegressionAnalysis = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.regressionAnalysis || {}
);

export const selectModelStats = createDeepEqualSelector(
  [selectRegressionAnalysis],
  (regression) => regression?.model || {}
);

export const selectSpatialStats = createDeepEqualSelector(
  [selectRegressionAnalysis],
  (regression) => regression?.spatial || {}
);

export const selectActiveLayers = createDeepEqualSelector(
  [selectUIState],
  (ui) => ui?.activeLayers || []
);

export const selectAnalysisFilters = createDeepEqualSelector(
  [selectUIState],
  (ui) => ui?.analysisFilters || {}
);

export const selectGeometryData = createDeepEqualSelector(
  [selectSpatialState],
  (spatial) => spatial?.data?.geometry || {}
);

export const selectError = createDeepEqualSelector(
  [selectStatus],
  (status) => status?.error || null
);

export const selectSelectedCommodity = createDeepEqualSelector(
  [selectUIState],
  (ui) => ui?.selectedCommodity || ''
);

export const selectSelectedDate = createDeepEqualSelector(
  [selectUIState],
  (ui) => ui?.selectedDate || ''
);

export const selectVisualizationMode = createDeepEqualSelector(
  [selectUIState],
  (ui) => ui?.visualizationMode || 'prices'
);

export const selectGeometryWithCache = createDeepEqualSelector(
  [selectGeometryData],
  (geometry) => geometry?.cached || geometry
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
    selectRegionShocks
  ],
  (geometry, connections, shocks) => ({
    geometry,
    connections,
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
    }
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
      
        if (spatialData?.commodities?.length > 0) {
          state.data.commodities = [...new Set([
            ...(state.data.commodities || []),
            ...spatialData.commodities
          ])].sort();
        }

        if (spatialData?.flowMaps) {
          state.data.flowData = processFlowData(spatialData.flowMaps);
        }

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

        if (regressionOnly) {
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
            timeSeriesData: spatialData.timeSeriesData || [],
            flowMaps: spatialData.flowMaps || [],
            marketClusters: spatialData.marketClusters || [],
            marketShocks: spatialData.marketShocks || [],
            spatialAutocorrelation: spatialData.spatialAutocorrelation || {},
            uniqueMonths: spatialData.uniqueMonths || []
          };
        }

        if (metadata) {
          state.data.metadata = metadata;
          state.ui.selectedCommodity = metadata.commodity;
          state.ui.selectedDate = metadata.date;
        }

        if (cacheKey) {
          state.data.cache[cacheKey] = {
            geometry: state.data.geometry,
            spatialData: {
              timeSeriesData: state.data.timeSeriesData,
              flowMaps: state.data.flowMaps,
              marketClusters: state.data.marketClusters,
              marketShocks: state.data.marketShocks,
              spatialAutocorrelation: state.data.spatialAutocorrelation,
              uniqueMonths: state.data.uniqueMonths
            },
            regressionData: state.data.regressionAnalysis,
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