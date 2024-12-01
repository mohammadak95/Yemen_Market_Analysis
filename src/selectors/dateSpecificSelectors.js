// src/selectors/dateSpecificSelectors.js

import { createSelector } from '@reduxjs/toolkit';

// Base selectors
const selectMarketShocks = state => state.spatial.data.marketShocks || [];
const selectTimeSeriesData = state => state.spatial.data.timeSeriesData || [];
const selectSelectedDate = state => state.spatial.ui.selectedDate;
const selectGeometry = state => state.spatial.data.geometry;
const selectFlowMaps = state => state.spatial.data.flowMaps || [];

// Date-specific Time Series Selector
export const selectDateFilteredData = createSelector(
  [selectTimeSeriesData, selectSelectedDate],
  (timeSeriesData, selectedDate) => {
    if (!timeSeriesData?.length || !selectedDate) return [];
    return timeSeriesData.filter(d => d.month === selectedDate);
  }
);

// Flow Selector - Returns all flows since they're pre-filtered
export const selectDateFilteredFlows = createSelector(
  [selectFlowMaps],
  (flows) => flows || []
);

// Date-specific Shocks Selector
export const selectDateFilteredShocks = createSelector(
  [selectMarketShocks, selectSelectedDate],
  (shocks, selectedDate) => {
    if (!shocks?.length || !selectedDate) return [];
    return shocks.filter(shock => {
      // Convert shock date to YYYY-MM format to match selectedDate
      const shockMonth = shock.date.substring(0, 7);
      return shockMonth === selectedDate;
    });
  }
);

// Date-filtered Metrics Selector
export const selectDateFilteredMetrics = createSelector(
  [selectDateFilteredData, selectDateFilteredFlows, selectDateFilteredShocks],
  (timeData, flows, shocks) => {
    // Price metrics
    const prices = timeData.map(d => d.usdPrice || 0);
    const avgPrice = prices.length ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;

    // Flow metrics
    const totalFlow = flows.reduce((sum, f) => sum + (f.total_flow || 0), 0);
    const avgFlow = flows.length ? totalFlow / flows.length : 0;

    // Shock metrics
    const priceDrops = shocks.filter(s => s.shock_type === 'price_drop');
    const priceSurges = shocks.filter(s => s.shock_type === 'price_surge');
    const avgMagnitude = shocks.length ? 
      shocks.reduce((sum, s) => sum + s.magnitude, 0) / shocks.length : 0;

    return {
      prices: {
        average: avgPrice,
        maximum: maxPrice,
        minimum: minPrice,
        range: maxPrice - minPrice
      },
      flows: {
        total: totalFlow,
        average: avgFlow,
        count: flows.length
      },
      shocks: {
        total: shocks.length,
        priceDrops: priceDrops.length,
        priceSurges: priceSurges.length,
        averageMagnitude: avgMagnitude
      }
    };
  }
);

// Shock Metrics Selector
export const selectShockMetrics = createSelector(
  [selectDateFilteredShocks],
  (shocks) => {
    if (!shocks?.length) return {
      totalShocks: 0,
      priceDrops: 0,
      priceSurges: 0,
      avgMagnitude: 0,
      maxMagnitude: 0,
      affectedRegions: new Set()
    };

    const priceDrops = shocks.filter(s => s.shock_type === 'price_drop');
    const priceSurges = shocks.filter(s => s.shock_type === 'price_surge');
    const avgMagnitude = shocks.reduce((sum, s) => sum + s.magnitude, 0) / shocks.length;
    const maxMagnitude = Math.max(...shocks.map(s => s.magnitude));
    const affectedRegions = new Set(shocks.map(s => s.region));

    return {
      totalShocks: shocks.length,
      priceDrops: priceDrops.length,
      priceSurges: priceSurges.length,
      avgMagnitude,
      maxMagnitude,
      affectedRegions
    };
  }
);

// Shock Analysis Data Selector
export const selectShockAnalysisData = createSelector(
  [selectDateFilteredShocks, selectGeometry, selectShockMetrics],
  (shocks, geometry, metrics) => {
    if (!shocks?.length || !geometry) return null;

    // Group shocks by region
    const shocksByRegion = shocks.reduce((acc, shock) => {
      if (!acc[shock.region]) acc[shock.region] = [];
      acc[shock.region].push(shock);
      return acc;
    }, {});

    // Calculate regional metrics
    const regionalMetrics = Object.entries(shocksByRegion).map(([region, regionShocks]) => {
      const avgMagnitude = regionShocks.reduce((sum, s) => sum + s.magnitude, 0) / regionShocks.length;
      const maxMagnitude = Math.max(...regionShocks.map(s => s.magnitude));
      
      return {
        region,
        shockCount: regionShocks.length,
        avgMagnitude,
        maxMagnitude,
        priceDrops: regionShocks.filter(s => s.shock_type === 'price_drop').length,
        priceSurges: regionShocks.filter(s => s.shock_type === 'price_surge').length
      };
    });

    return {
      shocks,
      geometry,
      metrics,
      regionalMetrics,
      shocksByRegion
    };
  }
);

// Time Series Metrics Selector
export const selectTimeSeriesMetrics = createSelector(
  [selectDateFilteredData],
  (timeData) => {
    if (!timeData?.length) return {
      avgPrice: 0,
      maxPrice: 0,
      minPrice: 0,
      priceRange: 0,
      avgConflict: 0,
      maxConflict: 0
    };

    const prices = timeData.map(d => d.usdPrice || 0);
    const conflicts = timeData.map(d => d.conflictIntensity || 0);

    return {
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      priceRange: Math.max(...prices) - Math.min(...prices),
      avgConflict: conflicts.reduce((sum, c) => sum + c, 0) / conflicts.length,
      maxConflict: Math.max(...conflicts)
    };
  }
);

export default {
  selectDateFilteredData,
  selectDateFilteredFlows,
  selectDateFilteredShocks,
  selectDateFilteredMetrics,
  selectShockMetrics,
  selectShockAnalysisData,
  selectTimeSeriesMetrics
};
