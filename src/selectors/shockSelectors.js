// src/selectors/shockSelectors.js

import { createSelector } from '@reduxjs/toolkit';

// Base selector for spatial data
const selectSpatialData = (state) => state.spatial?.data || {};

// Selector for time series data
export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      // Ensure data includes region
      return Array.isArray(data.timeSeriesData)
        ? data.timeSeriesData.filter((entry) => entry.region)
        : [];
    } catch (error) {
      console.error('Error selecting time series data:', error);
      return [];
    }
  }
);

// Selector for spatial autocorrelation
export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => data.spatialAutocorrelation || {}
);

// Selector for market shocks
export const selectMarketShocks = createSelector(
  [selectSpatialData],
  (data) => data.marketShocks || []
);

// Enhanced geometry selector with proper structure handling
export const selectGeometryData = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      const geometry = data.geometry;
      if (!geometry) return null;

      // Return the geometry object with its subcomponents
      return {
        points: Array.isArray(geometry.points) ? geometry.points : [],
        polygons: Array.isArray(geometry.polygons) ? geometry.polygons : [],
        unified: geometry.unified || null,
        type: geometry.type || 'unified'
      };
    } catch (error) {
      console.error('Error selecting geometry data:', error);
      return null;
    }
  }
);

// Selector for visualization state
export const selectVisualizationState = createSelector(
  [selectSpatialData],
  (data) => data.visualizationData || {}
);

// Memoized selector for filtered shocks
export const selectFilteredShocks = createSelector(
  [
    selectMarketShocks,
    (_, filters) => filters?.date,
    (_, filters) => filters?.shockType,
    (_, filters) => filters?.threshold,
  ],
  (shocks, date, shockType, threshold) => {
    try {
      if (!Array.isArray(shocks)) return [];

      return shocks.filter((shock) => {
        if (!shock.region || typeof shock.magnitude !== 'number') return false;
        if (date && shock.date !== date) return false;
        if (shockType && shockType !== 'all' && shock.shock_type !== shockType)
          return false;
        if (typeof threshold === 'number' && shock.magnitude < threshold)
          return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtering shocks:', error);
      return [];
    }
  }
);

// Selector for shocks grouped by region
export const selectShocksByRegion = createSelector(
  [selectMarketShocks],
  (shocks) => {
    try {
      if (!Array.isArray(shocks)) return {};

      return shocks.reduce((acc, shock) => {
        if (shock.region) {
          if (!acc[shock.region]) {
            acc[shock.region] = [];
          }
          acc[shock.region].push(shock);
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Error grouping shocks by region:', error);
      return {};
    }
  }
);

// Selector for shock statistics
export const selectShockStatistics = createSelector(
  [selectMarketShocks],
  (shocks) => {
    try {
      const validShocks = shocks.filter(
        (shock) => shock.region && typeof shock.magnitude === 'number'
      );

      if (validShocks.length === 0) {
        return { maxMagnitude: 0, totalShocks: 0, averageMagnitude: 0 };
      }

      const magnitudes = validShocks.map((s) => s.magnitude);
      const totalMagnitude = magnitudes.reduce((a, b) => a + b, 0);

      return {
        maxMagnitude: Math.max(...magnitudes),
        totalShocks: validShocks.length,
        averageMagnitude: totalMagnitude / validShocks.length,
      };
    } catch (error) {
      console.error('Error calculating shock statistics:', error);
      return { maxMagnitude: 0, totalShocks: 0, averageMagnitude: 0 };
    }
  }
);

// Selector for shock propagation patterns
export const selectShockPropagation = createSelector(
  [selectMarketShocks, selectSpatialAutocorrelation],
  (shocks, autocorrelation) => {
    try {
      // Implement your logic for shock propagation analysis here
      // For example, you can analyze how shocks spread over time and space
      return { patterns: [], metrics: {} };
    } catch (error) {
      console.error('Error analyzing shock propagation:', error);
      return { patterns: [], metrics: {} };
    }
  }
);