// src/selectors/shockSelectors.js
import { createSelector } from '@reduxjs/toolkit';

// Base selector for spatial data
const selectSpatialData = (state) => state.spatial?.data || {};

// Individual data selectors with proper typing and validation
export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      return Array.isArray(data.timeSeriesData) ? data.timeSeriesData : [];
    } catch (error) {
      console.error('Error selecting time series data:', error);
      return [];
    }
  }
);

export const selectSpatialAutocorrelation = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      const autocorrelation = data.spatialAutocorrelation || {};
      return {
        global: autocorrelation.global || { I: 0, 'p-value': 1 },
        local: autocorrelation.local || {}
      };
    } catch (error) {
      console.error('Error selecting spatial autocorrelation:', error);
      return { global: { I: 0, 'p-value': 1 }, local: {} };
    }
  }
);

export const selectMarketShocks = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      return Array.isArray(data.marketShocks) ? data.marketShocks : [];
    } catch (error) {
      console.error('Error selecting market shocks:', error);
      return [];
    }
  }
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

export const selectVisualizationState = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      return data.visualizationData || {
        prices: null,
        integration: null,
        clusters: null,
        shocks: null
      };
    } catch (error) {
      console.error('Error selecting visualization state:', error);
      return {
        prices: null,
        integration: null,
        clusters: null,
        shocks: null
      };
    }
  }
);

// Memoized selector for filtered shock data with proper validation
export const selectFilteredShocks = createSelector(
  [
    selectMarketShocks,
    (_, filters) => filters?.date,
    (_, filters) => filters?.shockType,
    (_, filters) => filters?.threshold
  ],
  (shocks, date, shockType, threshold) => {
    try {
      if (!Array.isArray(shocks)) return [];

      return shocks.filter(shock => {
        if (!shock?.region || typeof shock.magnitude !== 'number') return false;
        if (date && shock.date !== date) return false;
        if (shockType && shockType !== 'all' && shock.shock_type !== shockType) return false;
        if (typeof threshold === 'number' && shock.magnitude < threshold) return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtering shocks:', error);
      return [];
    }
  }
);

// Additional selectors with proper data structure handling
export const selectShocksByRegion = createSelector(
  [selectMarketShocks],
  (shocks) => {
    try {
      if (!Array.isArray(shocks)) return {};

      return shocks.reduce((acc, shock) => {
        if (shock?.region) {
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

export const selectShockStatistics = createSelector(
  [selectMarketShocks],
  (shocks) => {
    try {
      if (!Array.isArray(shocks)) return { maxMagnitude: 0, totalShocks: 0, averageMagnitude: 0 };

      const validShocks = shocks.filter(shock => 
        shock?.region && typeof shock.magnitude === 'number'
      );

      if (validShocks.length === 0) {
        return { maxMagnitude: 0, totalShocks: 0, averageMagnitude: 0 };
      }

      const magnitudes = validShocks.map(s => s.magnitude);
      return {
        maxMagnitude: Math.max(...magnitudes),
        totalShocks: validShocks.length,
        averageMagnitude: magnitudes.reduce((a, b) => a + b, 0) / validShocks.length
      };
    } catch (error) {
      console.error('Error calculating shock statistics:', error);
      return { maxMagnitude: 0, totalShocks: 0, averageMagnitude: 0 };
    }
  }
);

// Selector for shock propagation patterns with proper data structure
export const selectShockPropagation = createSelector(
  [selectMarketShocks, selectSpatialAutocorrelation],
  (shocks, autocorrelation) => {
    try {
      if (!Array.isArray(shocks)) return { patterns: [], metrics: {} };

      const patterns = shocks
        .filter(shock => shock?.region && shock?.propagation)
        .map(shock => ({
          sourceRegion: shock.region,
          magnitude: shock.magnitude,
          date: shock.date,
          ...shock.propagation
        }));

      const metrics = {
        averagePropagationTime: patterns.length > 0
          ? patterns.reduce((sum, p) => sum + (p.duration || 0), 0) / patterns.length
          : 0,
        spatialCorrelation: autocorrelation.global?.I || 0,
        patternCount: patterns.length
      };

      return { patterns, metrics };
    } catch (error) {
      console.error('Error analyzing shock propagation:', error);
      return { patterns: [], metrics: {} };
    }
  }
);
