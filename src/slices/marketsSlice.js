// src/slices/marketsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';
import { spatialSystem } from '../utils/SpatialSystem';
import { createSelector } from 'reselect';
import Papa from 'papaparse';


export const fetchMarketsData = createAsyncThunk(
  'markets/fetchData',
  async ({ commodity, date }, { rejectWithValue }) => {
    const metric = monitoringSystem.startMetric('fetch-markets-data');

    try {
      // Ensure systems are initialized
      if (!unifiedDataManager._isInitialized) {
        await unifiedDataManager.init();
      }
      if (!spatialSystem._isInitialized) {
        await spatialSystem.initialize();
      }

      // Load required data files
      const [flowsResponse, weightsResponse] = await Promise.all([
        fetch('path/to/time_varying_flows.csv'),
        fetch('path/to/transformed_spatial_weights.json')
      ]);

      const flowsText = await flowsResponse.text();
      const weightsText = await weightsResponse.text();

      // Parse CSV data
      const flowsData = await new Promise((resolve, reject) => {
        Papa.parse(flowsText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: results => resolve(results.data),
          error: error => reject(error)
        });
      });

      const spatialWeights = JSON.parse(weightsText);

      // Filter flows for selected commodity
      const commodityFlows = flowsData.filter(
        flow => flow.commodity.toLowerCase() === commodity.toLowerCase()
      );

      // Process market data
      const marketsMap = new Map();
      
      // Process flows to build market data
      commodityFlows.forEach(flow => {
        const { source, target, date: flowDate, price, flow_weight, conflict_intensity } = flow;

        // Process source market
        if (!marketsMap.has(source)) {
          marketsMap.set(source, createMarketEntry(source));
        }
        updateMarketData(marketsMap.get(source), {
          price,
          date: flowDate,
          conflict_intensity,
          isSource: true,
          flow_weight
        });

        // Process target market
        if (!marketsMap.has(target)) {
          marketsMap.set(target, createMarketEntry(target));
        }
        updateMarketData(marketsMap.get(target), {
          price,
          date: flowDate,
          conflict_intensity,
          isSource: false,
          flow_weight
        });
      });

      // Process spatial relationships
      const processedMarkets = Array.from(marketsMap.values()).map(market => {
        const neighbors = spatialWeights[market.id]?.neighbors || [];
        return {
          ...market,
          spatial: {
            neighbors,
            neighborCount: neighbors.length,
            connectivity: calculateConnectivity(market.id, spatialWeights)
          }
        };
      });

      // Calculate network metrics
      const networkMetrics = calculateNetworkMetrics(processedMarkets, commodityFlows);

      // Transform data for time series analysis
      const timeSeriesData = await dataTransformationSystem.transformTimeSeriesStream(
        commodityFlows,
        {
          applySeasonalAdj: true,
          applySmooth: true,
          includePriceStability: true,
          includeConflict: true
        }
      );

      const result = {
        markets: processedMarkets,
        networkMetrics,
        timeSeriesData,
        metadata: {
          commodity,
          date,
          processedAt: new Date().toISOString()
        }
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Failed to fetch markets data:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Helper functions
const createMarketEntry = (id) => ({
  id,
  prices: [],
  flows: {
    outgoing: [],
    incoming: []
  },
  conflict: {
    intensity: [],
    dates: []
  },
  metrics: {
    averagePrice: 0,
    priceVolatility: 0,
    flowVolume: 0,
    conflictIndex: 0
  }
});

const updateMarketData = (market, { price, date, conflict_intensity, isSource, flow_weight }) => {
  market.prices.push({ price, date });
  
  if (conflict_intensity !== undefined) {
    market.conflict.intensity.push(conflict_intensity);
    market.conflict.dates.push(date);
  }

  if (isSource) {
    market.flows.outgoing.push({ weight: flow_weight, date });
  } else {
    market.flows.incoming.push({ weight: flow_weight, date });
  }

  // Update metrics
  market.metrics = {
    averagePrice: calculateAverage(market.prices.map(p => p.price)),
    priceVolatility: calculateVolatility(market.prices.map(p => p.price)),
    flowVolume: calculateAverage([
      ...market.flows.outgoing.map(f => f.weight),
      ...market.flows.incoming.map(f => f.weight)
    ]),
    conflictIndex: market.conflict.intensity.length > 0 
      ? calculateAverage(market.conflict.intensity)
      : null
  };
};

const calculateConnectivity = (marketId, weights) => {
  const marketWeights = weights[marketId];
  if (!marketWeights) return 0;

  const directConnections = marketWeights.neighbors.length;
  const secondaryConnections = marketWeights.neighbors.reduce((acc, neighbor) => {
    return acc + (weights[neighbor]?.neighbors.length || 0);
  }, 0);

  return {
    direct: directConnections,
    secondary: secondaryConnections,
    score: (directConnections + secondaryConnections * 0.5) / Object.keys(weights).length
  };
};

const calculateNetworkMetrics = (markets, flows) => {
  const metrics = {
    density: 0,
    centralization: 0,
    clustering: 0,
    marketCount: markets.length,
    flowCount: flows.length,
    averageConnectivity: 0
  };

  // Calculate network density
  const maxPossibleConnections = markets.length * (markets.length - 1);
  const actualConnections = flows.length;
  metrics.density = actualConnections / maxPossibleConnections;

  // Calculate average connectivity
  metrics.averageConnectivity = markets.reduce(
    (acc, market) => acc + market.spatial.connectivity.score, 0
  ) / markets.length;

  // Calculate network centralization
  const maxDegree = Math.max(...markets.map(m => m.spatial.neighborCount));
  const sumDegrees = markets.reduce((acc, m) => acc + m.spatial.neighborCount, 0);
  metrics.centralization = (maxDegree * markets.length - sumDegrees) / 
    ((markets.length - 1) * (markets.length - 2));

  return metrics;
};

const calculateAverage = (values) => {
  if (!values.length) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
};

const calculateVolatility = (prices) => {
  if (prices.length < 2) return 0;
  const mean = calculateAverage(prices);
  const variance = prices.reduce((acc, price) => 
    acc + Math.pow(price - mean, 2), 0) / (prices.length - 1);
  return Math.sqrt(variance) / mean * 100;
};

const initialState = {
  markets: [],
  networkMetrics: null,
  timeSeriesData: [],
  metadata: null,
  status: {
    loading: false,
    error: null,
    lastUpdated: null
  },
  ui: {
    selectedMarkets: [],
    highlightedMarket: null,
    filters: {
      minConnectivity: 0,
      minFlowVolume: 0,
      showConflictZones: true
    },
    visualization: {
      mode: 'network',
      showLabels: true,
      showFlows: true,
      flowThreshold: 0.1
    }
  }
};

const marketsSlice = createSlice({
  name: 'markets',
  initialState,
  reducers: {
    setSelectedMarkets: (state, action) => {
      state.ui.selectedMarkets = action.payload;
    },
    setHighlightedMarket: (state, action) => {
      state.ui.highlightedMarket = action.payload;
    },
    updateFilters: (state, action) => {
      state.ui.filters = {
        ...state.ui.filters,
        ...action.payload
      };
    },
    updateVisualization: (state, action) => {
      state.ui.visualization = {
        ...state.ui.visualization,
        ...action.payload
      };
    },
    clearMarketsData: (state) => {
      state.markets = [];
      state.networkMetrics = null;
      state.timeSeriesData = [];
      state.metadata = null;
      state.status.lastUpdated = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarketsData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchMarketsData.fulfilled, (state, action) => {
        state.status.loading = false;
        state.markets = action.payload.markets;
        state.networkMetrics = action.payload.networkMetrics;
        state.timeSeriesData = action.payload.timeSeriesData;
        state.metadata = action.payload.metadata;
        state.status.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchMarketsData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload || 'Failed to fetch markets data';
      });
  }
});

export const {
  setSelectedMarkets,
  setHighlightedMarket,
  updateFilters,
  updateVisualization,
  clearMarketsData
} = marketsSlice.actions;

// Selectors
export const selectAllMarkets = state => state.markets.markets;
export const selectMarketsStatus = state => state.markets.status;
export const selectNetworkMetrics = state => state.markets.networkMetrics;
export const selectTimeSeriesData = state => state.markets.timeSeriesData;
export const selectMarketsMetadata = state => state.markets.metadata;
export const selectMarketsUI = state => state.markets.ui;

// Memoized selectors
export const selectFilteredMarkets = createSelector(
  [selectAllMarkets, selectMarketsUI],
  (markets, ui) => {
    return markets.filter(market => {
      const passesConnectivity = market.spatial.connectivity.score >= ui.filters.minConnectivity;
      const passesFlowVolume = market.metrics.flowVolume >= ui.filters.minFlowVolume;
      const passesConflict = !ui.filters.showConflictZones || market.metrics.conflictIndex !== null;

      return passesConnectivity && passesFlowVolume && passesConflict;
    });
  }
);

export default marketsSlice.reducer;