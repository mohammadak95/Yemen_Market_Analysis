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
  async ({ commodity, date }, { rejectWithValue, dispatch }) => {
    try {
      const metric = await dispatch(startFetchMetric('spatial-data-fetch')).unwrap();
      const data = await spatialHandler.getSpatialData(commodity, date);
      
      // Log completion using backgroundMonitor directly
      backgroundMonitor.logMetric(metric.name, {
        status: 'success',
        metricId: metric.metricId,
        dataSize: JSON.stringify(data).length,
        commodity,
        monthsCount: data.time_series_data?.length || 0
      });

      return {
        ...data,
        uniqueMonths: [...new Set(data.time_series_data.map(d => d.month))].sort(),
        selectedCommodity: commodity,
        selectedDate: date
      };
    } catch (error) {
      // Handle error logging similarly
      backgroundMonitor.logMetric('spatial-data-fetch-error', {
        status: 'error',
        error: error.message,
        commodity,
        date
      });
      
      return rejectWithValue({
        message: error.message,
        commodity,
        date,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Initial state adhering to the updated structure.
 */
export const initialState = {
  data: {
    // Time series data from preprocessed_yemen_market_data_*.json
    timeSeriesData: [], // Array of {month, avgUsdPrice, volatility, sampleSize, conflict_intensity, garch_volatility, price_stability}

    // Market structure data
    marketClusters: [], // Array of {cluster_id, main_market, connected_markets, market_count, metrics}
    marketShocks: [], // Array of {region, date, magnitude, type, price_change, previous_price, current_price}
    flowMaps: [], // From time_varying_flows.csv

    // Spatial analysis data
    clusterEfficiency: [], // Array of {cluster_id, internal_connectivity, market_coverage, price_convergence, stability}
    flowAnalysis: [], // Array of {source, target, total_flow, avg_flow, flow_count}
    spatialAutocorrelation: {
      global: { moran_i: null, p_value: null, z_score: null },
      local: {}, // Region-specific Moran's I values
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
        const {
          time_series_data,
          market_clusters,
          market_shocks,
          cluster_efficiency,
          flow_analysis,
          spatial_autocorrelation,
          seasonal_analysis,
          market_integration,
          metadata,
          uniqueMonths,
          geoJSON,
          flowMaps,
          regression_analysis,
        } = action.payload;

        // Update time series data
        state.data.timeSeriesData = time_series_data;

        // Update market clusters
        state.data.marketClusters = market_clusters;

        // Update market shocks
        state.data.marketShocks = market_shocks;

        // Update cluster efficiency
        state.data.clusterEfficiency = cluster_efficiency;

        // Update flow analysis
        state.data.flowAnalysis = flow_analysis;

        // Update spatial autocorrelation
        state.data.spatialAutocorrelation = spatial_autocorrelation;

        // Update seasonal analysis
        state.data.seasonalAnalysis = seasonal_analysis;

        // Update market integration
        state.data.marketIntegration = market_integration;

        // Update metadata
        state.data.metadata = metadata;

        // Update unique months
        state.data.uniqueMonths = uniqueMonths;

        // Update geoJSON
        state.data.geoJSON = geoJSON;

        // Update flow maps
        state.data.flowMaps = flowMaps;

        // Update regression analysis
        state.data.regressionAnalysis = regression_analysis || DEFAULT_REGRESSION_DATA;

        // Set loading status to complete
        state.status.loading = false;
        state.status.progress = 100;
        state.status.stage = 'complete';
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload?.message || action.error.message;
        state.status.stage = 'error';
      });
  },
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