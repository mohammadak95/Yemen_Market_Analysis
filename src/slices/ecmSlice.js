import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createSelectorCreator, lruMemoize } from 'reselect';
import _ from 'lodash';
import { getDataPath } from '../utils/dataUtils';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const createDeepEqualSelector = createSelectorCreator(
  lruMemoize,
  _.isEqual
);

export const initialState = {
  data: {
    unified: [],
    directional: {
      northToSouth: [],
      southToNorth: []
    },
    residuals: null,
    commodities: [],
    cache: {}
  },
  status: {
    loading: false,
    error: null,
    lastUpdated: null,
    retryCount: 0
  },
  ui: {
    selectedCommodity: null,
    selectedRegime: 'unified',
    selectedDirection: 'northToSouth'
  }
};

export const fetchECMData = createAsyncThunk(
  'ecm/fetchData',
  async ({ commodity }, { rejectWithValue }) => {
    const metric = backgroundMonitor.startMetric('ecm-data-fetch');
    try {
      const paths = {
        unified: getDataPath('ecm/ecm_analysis_results.json'),
        northToSouth: getDataPath('ecm/ecm_results_north_to_south.json'),
        southToNorth: getDataPath('ecm/ecm_results_south_to_north.json')
      };

      const [unifiedData, northToSouthData, southToNorthData] = await Promise.all([
        fetch(paths.unified).then(r => r.json()),
        fetch(paths.northToSouth).then(r => r.json()),
        fetch(paths.southToNorth).then(r => r.json())
      ]);

      metric.finish({ status: 'success' });

      return {
        unified: unifiedData,
        directional: {
          northToSouth: northToSouthData,
          southToNorth: southToNorthData
        }
      };
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return rejectWithValue(error.message);
    }
  }
);

const ecmSlice = createSlice({
  name: 'ecm',
  initialState,
  reducers: {
    setSelectedCommodity(state, action) {
      state.ui.selectedCommodity = action.payload;
    },
    setSelectedRegime(state, action) {
      state.ui.selectedRegime = action.payload;
    },
    setSelectedDirection(state, action) {
      state.ui.selectedDirection = action.payload;
    },
    clearCache(state) {
      state.data.cache = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchECMData.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(fetchECMData.fulfilled, (state, action) => {
        state.data.unified = action.payload.unified;
        state.data.directional.northToSouth = action.payload.directional.northToSouth;
        state.data.directional.southToNorth = action.payload.directional.southToNorth;
        state.status.loading = false;
        state.status.error = null;
        state.status.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchECMData.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
      });
  }
});

const selectECMState = state => state?.ecm || initialState;
const selectECMData = state => state?.ecm?.data || initialState.data;
const selectECMStatus = state => state?.ecm?.status || initialState.status;
const selectECMUI = state => state?.ecm?.ui || initialState.ui;

export const selectLoadingStatus = createSelector(
  [selectECMStatus],
  status => status.loading
);

export const selectError = createSelector(
  [selectECMStatus],
  status => status.error
);

export const selectUnifiedData = createDeepEqualSelector(
  [selectECMData],
  data => data.unified || []
);

export const selectDirectionalData = createDeepEqualSelector(
  [selectECMData],
  data => ({
    northToSouth: data.directional.northToSouth || [],
    southToNorth: data.directional.southToNorth || []
  })
);

export const selectECMMetrics = createDeepEqualSelector(
  [selectUnifiedData, selectDirectionalData, selectECMUI],
  (unifiedData, directionalData, ui) => {
    let data;
    if (ui.selectedRegime === 'unified') {
      data = unifiedData;
    } else {
      data = directionalData[ui.selectedDirection];
    }

    if (!data?.length || !ui.selectedCommodity) return null;

    const selectedData = data.find(item => 
      item.commodity?.toLowerCase() === ui.selectedCommodity?.toLowerCase()
    );
    
    if (!selectedData) return null;

    return {
      alpha: selectedData.alpha,
      beta: selectedData.beta,
      gamma: selectedData.gamma,
      diagnostics: selectedData.diagnostics,
      spatialAutocorrelation: selectedData.spatial_autocorrelation,
      aic: selectedData.aic,
      bic: selectedData.bic,
      hqic: selectedData.hqic
    };
  }
);

export const {
  setSelectedCommodity,
  setSelectedRegime,
  setSelectedDirection,
  clearCache
} = ecmSlice.actions;

export default ecmSlice.reducer;