// src/selectors/spatialSelectors.js

import { createSelector } from 'reselect';

const selectSpatialState = (state) => state.spatial;

export const selectSpatialStatus = createSelector(
  [selectSpatialState],
  (spatial) => spatial.status
);

export const selectSpatialData = createSelector(
  [selectSpatialState],
  (spatial) => spatial.data
);

export const selectSpatialUI = createSelector(
  [selectSpatialState],
  (spatial) => spatial.ui
);

export const selectSelectedCommodity = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedCommodity
);

export const selectSelectedDate = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedDate
);

export const selectSelectedAnalysis = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedAnalysis
);

export const selectSelectedRegimes = createSelector(
  [selectSpatialUI],
  (ui) => ui.selectedRegimes
);

// src/selectors/spatialSelectors.js

export const selectCommodities = (state) => state.spatial?.data?.commodities || [];
export const selectRegimes = (state) => state.spatial?.data?.regimes || [];
