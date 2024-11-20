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
import { DEFAULT_GEOJSON, DEFAULT_VIEW, VISUALIZATION_MODES } from '../constants/index';
import { getDataPath } from '../utils/dataUtils';

export const initialState = {
  data: {
    geoData: null,
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
    geoJSON: DEFAULT_GEOJSON
  },
  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: 'idle',
    regressionLoading: false,
    regressionError: null,
    visualizationLoading: false,
    visualizationError: null
  },
  ui: {
    selectedCommodity: '',
    selectedDate: '',
    selectedRegimes: ['unified'],
    selectedRegion: null,
    view: DEFAULT_VIEW,
    activeLayers: []
  }
};

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
  async ({ selectedCommodity }, { getState, rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('redux-regression-fetch');
    try {
      // If no commodity provided, use the one from metadata
      const state = getState();
      const commodityToUse = selectedCommodity || state.spatial.data.metadata?.commodity;
      
      if (!commodityToUse) {
        throw new Error('No commodity selected for regression analysis');
      }

      const data = await spatialHandler.loadRegressionAnalysis(commodityToUse);
      metric.finish({ status: 'success' });
      return data;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

export const fetchVisualizationData = createAsyncThunk(
  'spatial/fetchVisualizationData',
  async ({ mode, filters }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const data = state.spatial.data;
      
      const visualizationData = await spatialHandler.processVisualizationData(
        data,
        mode,
        filters
      );

      return {
        mode,
        data: visualizationData
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

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
    syncUIWithData: (state) => {
      if (state.data.metadata) {
        state.ui.selectedCommodity = state.data.metadata.commodity || '';
        state.ui.selectedDate = state.data.metadata.processed_date || '';
      }
    }
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

        // Sync UI state with metadata
        if (preprocessedData.metadata?.commodity) {
          state.ui.selectedCommodity = preprocessedData.metadata.commodity;
        }
        if (preprocessedData.metadata?.processed_date) {
          state.ui.selectedDate = preprocessedData.metadata.processed_date;
        }

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
        state.status.regressionLoading = true;
        state.status.regressionError = null;
      })
      .addCase(fetchRegressionAnalysis.fulfilled, (state, action) => {
        state.status.regressionLoading = false;
        state.data.regressionAnalysis = action.payload;
        
        // Ensure UI state is synced
        if (!state.ui.selectedCommodity && state.data.metadata?.commodity) {
          state.ui.selectedCommodity = state.data.metadata.commodity;
        }
      })
      .addCase(fetchRegressionAnalysis.rejected, (state, action) => {
        state.status.regressionLoading = false;
        state.status.regressionError = action.payload;
        state.data.regressionAnalysis = DEFAULT_REGRESSION_DATA;
      })
      .addCase(fetchVisualizationData.pending, (state) => {
        state.status.visualizationLoading = true;
        state.status.visualizationError = null;
      })
      .addCase(fetchVisualizationData.fulfilled, (state, action) => {
        const { mode, data } = action.payload;
        state.data.visualizationData[mode] = data;
        state.status.visualizationLoading = false;
      })
      .addCase(fetchVisualizationData.rejected, (state, action) => {
        state.status.visualizationLoading = false;
        state.status.visualizationError = action.payload;
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
  syncUIWithData
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
export const selectResiduals = state => state.spatial.data.regressionAnalysis?.residuals;
export const selectModelStats = state => state.spatial.data.regressionAnalysis?.model;
export const selectSpatialStats = state => state.spatial.data.regressionAnalysis?.spatial;
export const selectVisualizationMode = (state) => state.spatial.ui.visualizationMode;
export const selectActiveLayers = (state) => state.spatial.ui.activeLayers;
export const selectAnalysisFilters = (state) => state.spatial.ui.analysisFilters;
export const selectVisualizationData = (state) => {
  const mode = selectVisualizationMode(state);
  return state.spatial.data.visualizationData[mode];
};
export const selectSelectedCommodity = (state) => state.spatial.ui.selectedCommodity;
export const selectSelectedDate = (state) => state.spatial.ui.selectedDate;
export const selectRegressionAnalysis = (state) => state.spatial.data.regressionAnalysis;
export const selectRegressionLoading = (state) => state.spatial.status.regressionLoading;
export const selectRegressionError = (state) => state.spatial.status.regressionError;




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
        moranI: regressionData.spatial.moran_i.I,
        pValue: regressionData.spatial.moran_i['p-value'],
        spatialLag: regressionData.model.coefficients.spatial_lag_price
      },
      modelFit: {
        rSquared: regressionData.model.r_squared,
        adjRSquared: regressionData.model.adj_r_squared,
        mse: regressionData.model.mse,
        observations: regressionData.model.observations
      }
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

export default spatialSlice.reducer;