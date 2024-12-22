// src/slices/ecmSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createDeepEqualSelector } from '../selectors/selectorUtils'; // <-- Import your custom deepMemo selector
import _ from 'lodash';
import { getDataPath } from '../utils/dataUtils';
import { backgroundMonitor } from '../utils/backgroundMonitor';

/**
 * The initial state for the ECM slice, preserving its structure.
 */
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

/**
 * Thunk to fetch ECM data from multiple JSON files concurrently.
 *
 * @param {Object} params - The parameter object with commodity info.
 * @returns {Object} - Data for unified, northToSouth, and southToNorth flows.
 */
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
        fetch(paths.unified).then((r) => r.json()),
        fetch(paths.northToSouth).then((r) => r.json()),
        fetch(paths.southToNorth).then((r) => r.json())
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

/**
 * The ECM slice definition, retaining the original structure and action creators.
 */
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
        // Keep the logic that updates unified and directional data
        state.data.unified = action.payload.unified;
        state.data.directional.northToSouth = action.payload.directional.northToSouth;
        state.data.directional.southToNorth = action.payload.directional.southToNorth;

        // Update loading status and timestamps
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

// =============== Base Selectors ===============
/**
 * Returns the ECM slice from state or the initialState if undefined.
 */
const selectECMState = (state) => state?.ecm || initialState;

/**
 * Returns the data portion of the ECM slice.
 */
const selectECMData = (state) => selectECMState(state).data;

/**
 * Returns the status portion of the ECM slice.
 */
const selectECMStatus = (state) => selectECMState(state).status;

/**
 * Returns the UI portion of the ECM slice.
 */
const selectECMUI = (state) => selectECMState(state).ui;

// =============== Memoized Selectors ===============

/**
 * Selects the loading status with deep equality for consistency.
 */
export const selectLoadingStatus = createDeepEqualSelector(
  [selectECMStatus],
  (status) => status.loading
);

/**
 * Selects any error messages with deep equality.
 */
export const selectError = createDeepEqualSelector(
  [selectECMStatus],
  (status) => status.error
);

/**
 * Selects unified ECM data array, defaulting to an empty array.
 */
export const selectUnifiedData = createDeepEqualSelector(
  [selectECMData],
  (data) => data.unified || []
);

/**
 * Selects directional ECM data arrays, defaulting to empty arrays.
 */
export const selectDirectionalData = createDeepEqualSelector(
  [selectECMData],
  (data) => ({
    northToSouth: data.directional?.northToSouth || [],
    southToNorth: data.directional?.southToNorth || []
  })
);

/**
 * Selects ECM metrics based on user-selected regime and direction,
 * ensuring backward-compatible structure.
 */
export const selectECMMetrics = createDeepEqualSelector(
  [selectUnifiedData, selectDirectionalData, selectECMUI],
  (unifiedData, directionalData, ui) => {
    // If the user selected the unified regime, use unified data; otherwise, pick a direction.
    let dataArray;
    if (ui.selectedRegime === 'unified') {
      dataArray = unifiedData;
    } else {
      dataArray = directionalData[ui.selectedDirection];
    }

    // If no data or no commodity is selected, return null
    if (!dataArray?.length || !ui.selectedCommodity) return null;

    // Attempt to match the selected commodity by name
    const selectedData = dataArray.find(
      (item) => item.commodity?.toLowerCase() === ui.selectedCommodity?.toLowerCase()
    );

    if (!selectedData) return null;

    // Preserve original structure and keys (backward compatibility)
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

// =============== Aggregated Selectors ===============

/**
 * Aggregated ECM selectors object for easy imports (optional).
 * 
 * If you prefer named imports, you can export each selector individually above.
 * This object is just a convenience, fully backward-compatible with any 
 * existing references to these selectors.
 */
export const ecmSelectors = {
  selectLoadingStatus,
  selectError,
  selectUnifiedData,
  selectDirectionalData,
  selectECMMetrics
};

// =============== Slice Exports ===============

/**
 * Slice action creators.
 */
export const {
  setSelectedCommodity,
  setSelectedRegime,
  setSelectedDirection,
  clearCache
} = ecmSlice.actions;

/**
 * Slice reducer export for store integration.
 */
export default ecmSlice.reducer;