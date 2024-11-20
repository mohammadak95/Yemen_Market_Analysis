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




/**
 * Async thunk to fetch spatial data based on selected commodity and date.
 * This thunk fetches comprehensive spatial data, including time series, market structure,
 * spatial autocorrelation, seasonal analysis, market integration, and regression analysis.
 */
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchSpatialData',
  async ({ commodity, date }, { rejectWithValue }) => {
    try {
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

/**
 * Initial state adhering to the updated structure.
 */
export const initialState = {
  data: {
    // Time series data from preprocessed_yemen_market_data_*.json
    timeSeriesData: [],
    flowMaps: [],  
    // Market structure data
    marketClusters: [], 
    marketShocks: [], 
    flowMaps: [], 
    // Spatial analysis data
    clusterEfficiency: [],
    flowAnalysis: [],
    spatialAutocorrelation: {
      global: { moran_i: null, p_value: null, z_score: null },
      local: {}, 
    },

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
    geoJSON: null,
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

/**
 * Create the spatial slice with reducers and extra reducers to handle spatial data.
 */
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
      state.data.regressionAnalysis = initialState.data.regressionAnalysis;
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
        console.log('Preprocessed data:', preprocessedData);

        // Stronger validation
        if (!preprocessedData) {
          state.status.error = 'No data received';
          state.status.loading = false;
          state.status.stage = 'error';
          return;
        }

        // Ensure time_series_data exists and has correct structure
        const hasTimeSeriesData = Array.isArray(preprocessedData.time_series_data) && 
                                 preprocessedData.time_series_data.length > 0;

        if (!hasTimeSeriesData) {
          state.status.error = `Invalid time series data: ${JSON.stringify(Object.keys(preprocessedData))}`;
          state.status.loading = false;
          state.status.stage = 'error';
          return;
        }

        // Update time series data with proper normalization
        state.data.timeSeriesData = preprocessedData.time_series_data.map(entry => ({
          month: entry.month,
          avgUsdPrice: entry.avgUsdPrice || 0,
          volatility: entry.volatility || 0,
          sampleSize: entry.sampleSize || 0,
          conflict_intensity: entry.conflict_intensity || 0
        }));

        if (preprocessedData.flow_analysis) {
          state.data.flowMaps = preprocessedData.flow_analysis.map(flow => ({
            source: flow.source,
            target: flow.target,
            totalFlow: flow.total_flow,
            avgFlow: flow.avg_flow,
            flowCount: flow.flow_count,
            avgPriceDifferential: flow.avg_price_differential
          }));
        }
  
        // Update market data with proper validation
        state.data.marketClusters = preprocessedData.market_clusters || [];
        state.data.marketShocks = preprocessedData.market_shocks || [];
        state.data.clusterEfficiency = preprocessedData.cluster_efficiency || [];
        state.data.flowAnalysis = preprocessedData.flow_analysis || [];
        state.data.spatialAutocorrelation = preprocessedData.spatial_autocorrelation || {
          global: {},
          local: {}
        };
        state.data.seasonalAnalysis = preprocessedData.seasonal_analysis || {};
        state.data.marketIntegration = preprocessedData.market_integration || {};
        state.data.metadata = preprocessedData.metadata || {};
        state.data.regressionAnalysis = preprocessedData.regression_analysis || DEFAULT_REGRESSION_DATA;
        state.data.geoJSON = preprocessedData.geoJSON || null;
  
        // Calculate unique months
        state.data.uniqueMonths = [...new Set(
          preprocessedData.time_series_data.map(d => d.month)
        )].sort();
  
        // Update status
        state.status.loading = false;
        state.status.progress = 100;
        state.status.stage = 'complete';
        state.status.error = null;
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload?.message || action.error.message;
        state.status.stage = 'error';
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
export const selectRegressionAnalysis = (state) => state.spatial.data.regressionAnalysis;
export const selectMarketShocks = (state) => state.spatial.data.marketShocks;
export const selectClusterEfficiency = (state) => state.spatial.data.clusterEfficiency;
export const selectFlowAnalysis = (state) => state.spatial.data.flowAnalysis;
export const selectGeoJSON = (state) => state.spatial.data.geoJSON;
export const selectMetadata = (state) => state.spatial.data.metadata;
export const selectFlowMaps = (state) => state.spatial.data.flowMaps;

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