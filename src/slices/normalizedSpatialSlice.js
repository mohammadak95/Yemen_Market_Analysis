import { createSlice, createEntityAdapter, createAsyncThunk } from '@reduxjs/toolkit';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor } from '../utils/backgroundMonitor';
import { DEFAULT_VIEW } from '../constants/index';

// Create entity adapters
const marketsAdapter = createEntityAdapter({
  selectId: (market) => market.region_id || market.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

const flowsAdapter = createEntityAdapter({
  selectId: (flow) => `${flow.source}_${flow.target}_${flow.date}`,
  sortComparer: (a, b) => b.flow_weight - a.flow_weight
});

const timeSeriesAdapter = createEntityAdapter({
  selectId: (entry) => `${entry.region}_${entry.month}`,
  sortComparer: (a, b) => new Date(b.month) - new Date(a.month)
});

// Initial state with normalized structure
const initialState = {
  entities: {
    markets: marketsAdapter.getInitialState(),
    flows: flowsAdapter.getInitialState(),
    timeSeries: timeSeriesAdapter.getInitialState()
  },
  metadata: {
    commodities: [],
    uniqueMonths: [],
    lastUpdated: null
  },
  geometry: {
    polygons: null,
    points: null,
    unified: null
  },
  analysis: {
    regression: {
      model: {},
      spatial: {},
      residuals: {},
      metadata: {}
    },
    clusters: [],
    shocks: [],
    spatialAutocorrelation: {}
  },
  status: {
    loading: false,
    error: null,
    progress: 0,
    stage: 'idle'
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
  },
  cache: {}
};

// Async thunk with optimized data processing
export const fetchSpatialData = createAsyncThunk(
  'spatial/fetchData',
  async ({ commodity, date }, { rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('spatial-data-fetch');
    
    try {
      const [geometryData, spatialData] = await Promise.all([
        spatialHandler.initializeGeometry(),
        spatialHandler.getSpatialData(commodity, date)
      ]);

      // Process and normalize the data
      const markets = spatialData.timeSeriesData?.reduce((acc, entry) => {
        if (!acc[entry.region]) {
          acc[entry.region] = {
            id: entry.region,
            name: entry.market_name || entry.region,
            coordinates: entry.coordinates,
            admin1: entry.admin1
          };
        }
        return acc;
      }, {});

      const normalizedData = {
        markets: Object.values(markets),
        flows: spatialData.flowMaps || [],
        timeSeries: spatialData.timeSeriesData || [],
        metadata: {
          commodities: spatialData.commodities || [],
          uniqueMonths: [...new Set(spatialData.timeSeriesData?.map(d => d.month) || [])].sort(),
          lastUpdated: new Date().toISOString()
        },
        geometry: {
          polygons: geometryData.polygons,
          points: geometryData.points,
          unified: await spatialHandler.createUnifiedGeoJSON([])
        },
        analysis: {
          clusters: spatialData.marketClusters || [],
          shocks: spatialData.marketShocks || [],
          spatialAutocorrelation: spatialData.spatialAutocorrelation || {}
        }
      };

      metric.finish({ status: 'success' });
      return normalizedData;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

// Create the slice with normalized entities
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
    updateUI: (state, action) => {
      state.ui = { ...state.ui, ...action.payload };
    },
    // Entity-specific reducers using adapter methods
    addMarket: marketsAdapter.addOne,
    addMarkets: marketsAdapter.addMany,
    updateMarket: marketsAdapter.updateOne,
    removeMarket: marketsAdapter.removeOne,
    addFlow: flowsAdapter.addOne,
    addFlows: flowsAdapter.addMany,
    updateFlow: flowsAdapter.updateOne,
    removeFlow: flowsAdapter.removeOne,
    addTimeSeries: timeSeriesAdapter.addOne,
    addTimeSeriesMany: timeSeriesAdapter.addMany,
    updateTimeSeries: timeSeriesAdapter.updateOne,
    removeTimeSeries: timeSeriesAdapter.removeOne,
    // Cache management
    updateCache: (state, action) => {
      const { key, data, timestamp } = action.payload;
      state.cache[key] = { data, timestamp };
    },
    clearCache: (state) => {
      state.cache = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpatialData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchSpatialData.fulfilled, (state, action) => {
        const { markets, flows, timeSeries, metadata, geometry, analysis } = action.payload;
        
        // Use adapter methods for normalized updates
        marketsAdapter.setAll(state.entities.markets, markets);
        flowsAdapter.setAll(state.entities.flows, flows);
        timeSeriesAdapter.setAll(state.entities.timeSeries, timeSeries);
        
        state.metadata = metadata;
        state.geometry = geometry;
        state.analysis = analysis;
        state.status = {
          loading: false,
          error: null,
          progress: 100,
          stage: 'complete'
        };
      })
      .addCase(fetchSpatialData.rejected, (state, action) => {
        state.status = {
          loading: false,
          error: action.payload,
          progress: 0,
          stage: 'error'
        };
      });
  }
});

// Export actions
export const {
  setProgress,
  setLoadingStage,
  updateUI,
  addMarket,
  addMarkets,
  updateMarket,
  removeMarket,
  addFlow,
  addFlows,
  updateFlow,
  removeFlow,
  addTimeSeries,
  addTimeSeriesMany,
  updateTimeSeries,
  removeTimeSeries,
  updateCache,
  clearCache
} = spatialSlice.actions;

// Export selectors
export const {
  selectAll: selectAllMarkets,
  selectById: selectMarketById,
  selectIds: selectMarketIds
} = marketsAdapter.getSelectors((state) => state.spatial.entities.markets);

export const {
  selectAll: selectAllFlows,
  selectById: selectFlowById,
  selectIds: selectFlowIds
} = flowsAdapter.getSelectors((state) => state.spatial.entities.flows);

export const {
  selectAll: selectAllTimeSeries,
  selectById: selectTimeSeriesById,
  selectIds: selectTimeSeriesIds
} = timeSeriesAdapter.getSelectors((state) => state.spatial.entities.timeSeries);

export default spatialSlice.reducer;
