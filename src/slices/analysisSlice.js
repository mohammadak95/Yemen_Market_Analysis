// src/slices/analysisSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { spatialSystem } from '../utils/SpatialSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';

export const generateAnalysis = createAsyncThunk(
  'analysis/generate',
  async ({ commodity, date, options = {} }, { getState, rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('generate-analysis');

    try {
      // Get relevant data from other slices
      const state = getState();
      const marketData = state.markets.markets;
      const spatialData = state.spatial.data;
      const priceDiffData = state.priceDiff.data;
      const ecmData = state.ecm.data;
      const tvmiiData = state.tvmii.data;

      // Validate data availability
      if (!marketData?.length || !spatialData) {
        throw new Error('Required data not available');
      }

      // Generate market integration analysis
      const integrationAnalysis = await analyzeMarketIntegration({
        marketData,
        tvmiiData,
        priceDiffData
      });

      // Generate spatial dependency analysis
      const spatialAnalysis = await analyzeSpatialDependencies({
        spatialData,
        marketData,
        ecmData
      });

      // Generate conflict impact analysis
      const conflictAnalysis = await analyzeConflictImpact({
        marketData,
        spatialData,
        timeframe: options.timeframe
      });

      // Generate composite indices
      const indices = calculateCompositeIndices({
        integrationAnalysis,
        spatialAnalysis,
        conflictAnalysis
      });

      const result = {
        marketIntegration: integrationAnalysis,
        spatialDependencies: spatialAnalysis,
        conflictImpact: conflictAnalysis,
        compositeIndices: indices,
        metadata: {
          commodity,
          date,
          processedAt: new Date().toISOString(),
          options
        }
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to generate analysis:', error);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk to fetch and process market analysis data.
 */
export const fetchAnalysisData = createAsyncThunk(
  'analysis/fetchAnalysisData',
  async (_, { rejectWithValue }) => {
    try {
      // Start performance monitoring
      const metric = monitoringSystem.startMetric('fetchAnalysisData');

      // Fetch data using UnifiedDataManager
      const data = await unifiedDataManager.loadAnalysisData();

      // Finish performance monitoring
      metric.finish({ status: 'success' });

      return data;
    } catch (err) {
      // Log error using MonitoringSystem
      monitoringSystem.error('Error fetching analysis data:', err);

      // Reject with error message
      return rejectWithValue(err.message);
    }
  }
);

// Analysis helper functions
const analyzeMarketIntegration = async ({ marketData, tvmiiData, priceDiffData }) => {
  const analysis = {
    overall: {
      integrationScore: 0,
      volatilityIndex: 0,
      marketCoverage: 0
    },
    temporal: {
      trends: [],
      seasonality: null,
      structuralBreaks: []
    },
    spatial: {
      clusters: [],
      hotspots: [],
      correlations: {}
    }
  };

  try {
    // Calculate overall metrics
    analysis.overall = {
      integrationScore: calculateIntegrationScore(marketData, tvmiiData),
      volatilityIndex: calculateVolatilityIndex(marketData),
      marketCoverage: calculateMarketCoverage(marketData)
    };

    // Analyze temporal patterns
    analysis.temporal = {
      trends: identifyTemporalTrends(marketData),
      seasonality: analyzeSeasonality(marketData),
      structuralBreaks: identifyStructuralBreaks(marketData)
    };

    // Analyze spatial patterns
    analysis.spatial = {
      clusters: identifyMarketClusters(marketData),
      hotspots: identifySpatialHotspots(marketData),
      correlations: calculateSpatialCorrelations(marketData)
    };

    return analysis;
  } catch (error) {
    monitoringSystem.error('Error in market integration analysis:', error);
    return analysis;
  }
};

const analyzeSpatialDependencies = async ({ spatialData, marketData, ecmData }) => {
  return {
    moranI: calculateMoranI(spatialData),
    spatialLag: calculateSpatialLag(spatialData),
    marketConnectivity: analyzeMarketConnectivity(marketData),
    priceTransmission: analyzePriceTransmission(ecmData)
  };
};

const analyzeConflictImpact = async ({ marketData, spatialData, timeframe }) => {
  return {
    directEffects: analyzeDirectConflictEffects(marketData, timeframe),
    spilloverEffects: analyzeConflictSpillovers(marketData, spatialData),
    resilience: calculateMarketResilience(marketData)
  };
};

const calculateCompositeIndices = ({ integrationAnalysis, spatialAnalysis, conflictAnalysis }) => {
  return {
    marketEfficiency: calculateEfficiencyIndex(integrationAnalysis, spatialAnalysis),
    marketResilience: calculateResilienceIndex(integrationAnalysis, conflictAnalysis),
    marketVulnerability: calculateVulnerabilityIndex(spatialAnalysis, conflictAnalysis)
  };
};

const initialState = {
  results: {
    marketIntegration: null,
    spatialDependencies: null,
    conflictImpact: null,
    compositeIndices: null
  },
  insights: [],
  recommendations: [],
  metadata: null,
  status: {
    loading: false,
    error: null,
    lastUpdated: null
  },
  ui: {
    selectedMetrics: [],
    timeframe: 'monthly',
    visualizationOptions: {
      showConfidence: true,
      showTrends: true,
      highlightHotspots: true
    }
  },
  data: null,
  status: 'idle', // Possible values: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setSelectedMetrics: (state, action) => {
      state.ui.selectedMetrics = action.payload;
    },
    setTimeframe: (state, action) => {
      state.ui.timeframe = action.payload;
    },
    updateVisualizationOptions: (state, action) => {
      state.ui.visualizationOptions = {
        ...state.ui.visualizationOptions,
        ...action.payload
      };
    },
    clearAnalysis: (state) => {
      state.results = {
        marketIntegration: null,
        spatialDependencies: null,
        conflictImpact: null,
        compositeIndices: null
      };
      state.insights = [];
      state.recommendations = [];
      state.metadata = null;
      state.status.lastUpdated = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateAnalysis.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(generateAnalysis.fulfilled, (state, action) => {
        state.status.loading = false;
        state.results = {
          marketIntegration: action.payload.marketIntegration,
          spatialDependencies: action.payload.spatialDependencies,
          conflictImpact: action.payload.conflictImpact,
          compositeIndices: action.payload.compositeIndices
        };
        state.metadata = action.payload.metadata;
        state.status.lastUpdated = new Date().toISOString();
      })
      .addCase(generateAnalysis.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'Failed to generate analysis';
      })
      .addCase(fetchAnalysisData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAnalysisData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchAnalysisData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  }
});

export const {
  setSelectedMetrics,
  setTimeframe,
  updateVisualizationOptions,
  clearAnalysis
} = analysisSlice.actions;

// Selectors
export const selectAnalysisResults = state => state.analysis.results;
export const selectAnalysisStatus = state => state.analysis.status;
export const selectAnalysisMetadata = state => state.analysis.metadata;
export const selectAnalysisUI = state => state.analysis.ui;
export const selectAnalysisData = (state) => state.analysis.data;
export const selectAnalysisError = (state) => state.analysis.error;

export default analysisSlice.reducer;