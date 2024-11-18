// src/selectors/rootSelectors.js
import { createSelector } from '@reduxjs/toolkit';

// Base selectors
const selectCommoditiesState = state => state.commodities;
const selectSpatialState = state => state.spatial;
const selectGeometriesState = state => state.geometries;
const selectThemeState = state => state.theme;

// Memoized compound selector
export const selectAppState = createSelector(
  [
    selectThemeState,
    selectSpatialState,
    selectCommoditiesState,
    selectGeometriesState
  ],
  (theme, spatial, commodities, geometries) => ({
    isDarkMode: theme.isDarkMode,
    selectedCommodity: spatial.ui?.selectedCommodity || null,
    selectedDate: spatial.ui?.selectedDate || null,
    selectedRegimes: spatial.ui?.selectedRegimes || [],
    spatialStatus: {
      loading: spatial.status?.loading || false,
      error: spatial.status?.error || null,
      isInitialized: spatial.status?.isInitialized || false,
      lastUpdated: spatial.status?.lastUpdated || null
    },
    commoditiesStatus: commodities.status || 'idle',
    geometriesStatus: {
      loading: geometries.status?.loading || false,
      error: geometries.status?.error || null,
      isInitialized: geometries.status?.isInitialized || false
    }
  })
);

// Individual memoized selectors
export const selectIsDarkMode = createSelector(
  [selectThemeState],
  theme => theme.isDarkMode
);

export const selectSpatialUI = createSelector(
  [selectSpatialState],
  spatial => spatial.ui || {}
);

export const selectCommoditiesStatus = createSelector(
  [selectCommoditiesState],
  commodities => commodities.status || 'idle'
);

export const selectGeometriesStatus = createSelector(
  [selectGeometriesState],
  geometries => ({
    loading: geometries.status?.loading || false,
    error: geometries.status?.error || null,
    isInitialized: geometries.status?.isInitialized || false
  })
);