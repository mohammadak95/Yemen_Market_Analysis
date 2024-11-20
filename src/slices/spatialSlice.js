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
  calculateClusterEfficiency
} from '../utils/marketAnalysisUtils';
import { DEFAULT_GEOJSON, DEFAULT_VIEW } from '../constants/index';


export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ commodity, date }, { rejectWithValue }) => {
    try {
      await spatialHandler.initializeCoordinates();
      const data = await spatialHandler.getSpatialData(commodity, date);
      
      return {
        data,
        metadata: {
          commodity,
          date,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchRegressionAnalysis = createAsyncThunk(
  'spatial/fetchRegressionAnalysis',
  async ({ commodity }, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoadingStage('loading-regression'));
      
      // Start monitoring
      const metric = backgroundMonitor.startMetric('regression-data-load');
      
      const data = await spatialHandler.loadRegressionAnalysis(commodity);
      
      if (!data || data === DEFAULT_REGRESSION_DATA) {
        throw new Error('Failed to load regression data');
      }

      // Log success
      metric.finish({ status: 'success', commodity });
      dispatch(setLoadingStage('regression-complete'));
      
      return data;
    } catch (error) {
      dispatch(setLoadingStage('regression-error'));
      console.error('[Spatial Slice] Regression analysis fetch failed:', error);
      return rejectWithValue(error.message);
    }
  }
);

const validateRegressionData = (data) => {
  if (!data || typeof data !== 'object') return false;
  
  const requiredFields = {
    model: ['coefficients', 'intercept', 'p_values', 'r_squared'],
    spatial: ['moran_i', 'vif'],
    residuals: ['raw', 'byRegion', 'stats']
  };

  return Object.entries(requiredFields).every(([key, fields]) => 
    data[key] && fields.every(field => data[key][field] !== undefined)
  );
};

export const initialState = {
  data: {
    timeSeriesData: [], 
    marketShocks: [], 
    flowMaps: [], 
    marketClusters: [],
    clusterEfficiency: [],
    flowAnalysis: [],
    spatialAutocorrelation: {
      global: { moran_i: null, p_value: null, z_score: null },
      local: {}, 
    },

    geoJSON: DEFAULT_GEOJSON,

    // Additional analysis data
    seasonalAnalysis: {
      seasonal_strength: null,
      trend_strength: null,
      peak_month: null,
      trough_month: null,
      seasonal_pattern: [],
    },
    marketIntegration: {
      price_correlation: {},
      flow_density: null,
      accessibility: {},
      integration_score: null,
    },

    // Analysis results and metadata
    metadata: {
      commodity: null,
      data_source: null,
      processed_date: null,
      analysis_parameters: {
        garch_parameters: { p: null, q: null },
        spatial_weights: null,
        significance_level: null,
      },
    },
    uniqueMonths: [],
    regressionAnalysis: DEFAULT_REGRESSION_DATA,
  },

  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    view: DEFAULT_VIEW,
    view: {
      center: [15.3694, 44.191],
      zoom: 6,
    },
  },

  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: null,
  },
};

const spatialSlice = createSlice({
  name: 'spatial',
  initialState,
  reducers: {
    /**
     * Sets the progress percentage for loading operations.
     */
    setProgress: (state, action) => {
      state.status.progress = action.payload;
    },
    /**
     * Sets the current loading stage (e.g., 'initializing', 'fetching', 'complete').
     */
    setLoadingStage: (state, action) => {
      state.status.stage = action.payload;
    },
    /**
     * Sets the currently selected region for analysis.
     */
    setSelectedRegion: (state, action) => {
      state.ui.selectedRegion = action.payload;
    },
    /**
     * Sets the map view configuration (center and zoom level).
     */
    setView: (state, action) => {
      state.ui.view = action.payload;
    },
    /**
     * Sets the selected commodity for market analysis.
     */
    setSelectedCommodity: (state, action) => {
      state.ui.selectedCommodity = action.payload;
    },
    /**
     * Sets the selected date for time series and shock analysis.
     */
    setSelectedDate: (state, action) => {
      state.ui.selectedDate = action.payload;
    },
    /**
     * Sets the selected regimes for spatial analysis.
     */
    setSelectedRegimes: (state, action) => {
      state.ui.selectedRegimes = action.payload;
    },
    /**
     * Resets the spatial slice state to its initial values.
     */
    resetState: (state) => {
      Object.assign(state, initialState);
    },
    /**
     * Clears the regression analysis data, resetting it to default.
     */
    clearRegressionAnalysis: (state) => {
      state.data.regressionAnalysis = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
        state.status.progress = 0;
        state.status.stage = 'fetching';
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        const { data: preprocessedData } = action.payload;
        
        if (!preprocessedData || !Array.isArray(preprocessedData.time_series_data)) {
          state.status.error = 'Invalid data structure';
          state.status.loading = false;
          state.status.stage = 'error';
          return;
        }
      
        // Update state with validated data
        state.data = {
          ...state.data,
          timeSeriesData: preprocessedData.time_series_data.map(entry => ({
            month: entry.month,
            avgUsdPrice: entry.avgUsdPrice || 0,
            volatility: entry.volatility || 0,
            sampleSize: entry.sampleSize || 0,
            conflict_intensity: entry.conflict_intensity || 0
          })),
          flowMaps: preprocessedData.flow_analysis?.map(flow => ({
            source: flow.source,
            target: flow.target,
            totalFlow: flow.total_flow,
            avgFlow: flow.avg_flow,
            flowCount: flow.flow_count,
            avgPriceDifferential: flow.avg_price_differential
          })) || [],
          marketClusters: preprocessedData.market_clusters || [],
          marketShocks: preprocessedData.market_shocks || [],
          clusterEfficiency: preprocessedData.cluster_efficiency || [],
          flowAnalysis: preprocessedData.flow_analysis || [],
          spatialAutocorrelation: preprocessedData.spatial_autocorrelation || {
            global: {},
            local: {}
          },
          seasonalAnalysis: preprocessedData.seasonal_analysis || {},
          marketIntegration: preprocessedData.market_integration || {},
          metadata: {
            ...preprocessedData.metadata,
            lastUpdated: new Date().toISOString()
          },
          regressionAnalysis: preprocessedData.regression_analysis || DEFAULT_REGRESSION_DATA,
          geoJSON: preprocessedData.geoJSON || DEFAULT_GEOJSON,
          uniqueMonths: [...new Set(
            preprocessedData.time_series_data.map(d => d.month)
          )].sort()
        };

        state.status.loading = false;
        state.status.progress = 100;
        state.status.stage = 'complete';
        state.status.error = null;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload?.message || action.error.message;
        state.status.stage = 'error';
      })
      .addCase(fetchRegressionAnalysis.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchRegressionAnalysis.fulfilled, (state, action) => {
        state.status.loading = false;
        state.status.stage = 'regression-complete';
        
        if (action.payload && validateRegressionData(action.payload)) {
          state.data.regressionAnalysis = action.payload;
        } else {
          state.status.error = 'Invalid regression data structure';
          state.data.regressionAnalysis = DEFAULT_REGRESSION_DATA;
        }
      })
      .addCase(fetchRegressionAnalysis.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'Failed to fetch regression analysis';
        // Keep the current regression data rather than resetting to default
      });
  }
});

// Export actions
export const {
  setProgress,
  setLoadingStage,
  setSelectedRegion,
  setView,
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegimes,
  resetState,
  clearRegressionAnalysis,
} = spatialSlice.actions;

// Selectors
export const selectSpatialData = (state) => state.spatial.data;
export const selectUIState = (state) => state.spatial.ui;
export const selectLoadingStatus = (state) => state.spatial.status;
export const selectTimeSeriesData = (state) => state.spatial.data.timeSeriesData;
export const selectFlowData = state => state.spatial.data.flowMaps;
export const selectMarketClusters = (state) => state.spatial.data.marketClusters;
export const selectSpatialAutocorrelation = (state) => state.spatial.data.spatialAutocorrelation;
export const selectMarketIntegration = (state) => state.spatial.data.marketIntegration;
export const selectSeasonalAnalysis = (state) => state.spatial.data.seasonalAnalysis;
export const selectUniqueMonths = (state) => state.spatial.data.uniqueMonths;
export const selectMarketShocks = (state) => state.spatial.data.marketShocks;
export const selectClusterEfficiency = (state) => state.spatial.data.clusterEfficiency;
export const selectFlowAnalysis = (state) => state.spatial.data.flowAnalysis;
export const selectGeoJSON = (state) => state.spatial.data.geoJSON;
export const selectMetadata = (state) => state.spatial.data.metadata;
export const selectFlowMaps = (state) => state.spatial.data.flowMaps;
export const selectRegressionAnalysis = state => state.spatial.data.regressionAnalysis;
export const selectResiduals = state => state.spatial.data.regressionAnalysis?.residuals;
export const selectModelStats = state => state.spatial.data.regressionAnalysis?.model;
export const selectSpatialStats = state => state.spatial.data.regressionAnalysis?.spatial;


// Add composite selectors
export const selectSelectedRegionData = createSelector(
  [selectGeoJSON, selectUIState],
  (geoJSON, ui) => {
    if (!geoJSON?.features || !ui.selectedRegion) return null;
    return geoJSON.features.find(f => 
      f.properties.region_id === ui.selectedRegion
    );
  }
);

// Implement startFetchMetric action
export const startFetchMetric = createAsyncThunk(
  'spatial/startFetchMetric',
  async (metricName) => {
    const metric = backgroundMonitor.startMetric(metricName);
    return {
      name: metricName,
      metricId: `${metricName}-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
);

// Add composite selectors for analysis
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

export const selectRegionEfficiency = createSelector(
  [selectClusterEfficiency, selectUIState],
  (efficiency, ui) => efficiency.find(e => e.main_market === ui.selectedRegion)
);

export const selectDetailedMetrics = createSelector(
  [selectTimeSeriesData, selectUIState],
  (data, ui) => {
    if (!data?.length) return null;
    return {
      priceStats: {
        trend: calculatePriceTrend(data),
        seasonality: detectSeasonality(data),
        outliers: detectOutliers(data)
      },
      volatility: calculateVolatility(data),
      integration: calculateIntegration(data),
      clusterEfficiency: calculateClusterEfficiency(data)
    };
  }
);

export const selectMarketIntegrationMetrics = createSelector(
  [selectSpatialData],
  (data) => data?.market_integration
);

export const selectSpatialPatterns = createSelector(
  [selectSpatialData],
  (data) => ({
    clusters: data?.market_clusters,
    autocorrelation: data?.spatial_autocorrelation,
    flows: data?.flow_analysis
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

// Add error handling for data validation
const validateSpatialData = (data) => {
  const required = [
    'time_series_data',
    'market_clusters',
    'market_shocks',
    'flow_analysis',
    'spatial_autocorrelation'
  ];
  
  const missing = required.filter(field => !data[field]);
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  return true;
};

// Export the reducer
export default spatialSlice.reducer;