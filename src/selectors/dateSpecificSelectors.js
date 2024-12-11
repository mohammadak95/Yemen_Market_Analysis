import { createSelector } from '@reduxjs/toolkit';
import { flowValidation } from '../components/spatialAnalysis/features/flows/types';

// Base selectors
const selectMarketShocks = state => state.spatial.data.marketShocks || [];
const selectTimeSeriesData = state => state.spatial.data.timeSeriesData || [];
const selectSelectedDate = state => state.spatial.ui.selectedDate;
const selectGeometry = state => state.spatial.data.geometry;
const selectFlowData = state => state.spatial.data.flowData;
const selectFlowMaps = state => state.spatial.data.flowMaps || [];

// Date-specific Time Series Selector
export const selectDateFilteredData = createSelector(
  [selectTimeSeriesData, selectSelectedDate],
  (timeSeriesData, selectedDate) => {
    if (!timeSeriesData?.length || !selectedDate) return [];
    return flowValidation.filterFlowsByDate(timeSeriesData, selectedDate);
  }
);

// Enhanced flow selectors with validation
export const selectDateFilteredFlows = createSelector(
  [selectFlowMaps, selectSelectedDate],
  (flows, selectedDate) => {
    // Early return if no flows or date
    if (!Array.isArray(flows) || !selectedDate) {
      console.debug('Missing flow data or date:', {
        hasFlows: Boolean(flows),
        selectedDate
      });
      return [];
    }

    // Use flowValidation helper to filter and validate flows
    const validatedFlows = flowValidation.filterFlowsByDate(flows, selectedDate);

    console.debug('Flow filtering results:', {
      totalFlows: flows.length,
      validatedFlows: validatedFlows.length,
      selectedDate
    });

    return validatedFlows;
  }
);

// Calculate flow metrics for selected date
export const selectDateFilteredMetrics = createSelector(
  [selectDateFilteredFlows],
  (flows) => {
    if (!Array.isArray(flows) || !flows.length) {
      console.debug('No flows available for metrics calculation');
      return {
        flows: {
          total: 0,
          average: 0,
          count: 0,
          maxFlow: 0,
          minFlow: 0,
          stdDev: 0
        }
      };
    }

    const metrics = flowValidation.calculateFlowMetrics(flows);
    if (!metrics) return null;

    return {
      flows: {
        total: metrics.totalFlow,
        average: metrics.avgFlow,
        count: metrics.count,
        maxFlow: metrics.maxFlow,
        minFlow: metrics.minFlow,
        stdDev: metrics.stdDev
      }
    };
  }
);

// Additional helper selector for flow validation
export const selectFlowDataStatus = createSelector(
  [selectFlowMaps, selectSelectedDate],
  (flows, selectedDate) => {
    if (!Array.isArray(flows)) {
      console.debug('Invalid flows array');
      return {
        hasData: false,
        dateRange: { start: null, end: null },
        lastUpdated: new Date().toISOString(),
        totalFlows: 0,
        dateFlows: 0,
        uniqueDates: 0
      };
    }

    // Get valid flows using flowValidation helper
    const validFlows = flows.filter(flowValidation.isValidFlow);
    const dateFlows = flowValidation.filterFlowsByDate(validFlows, selectedDate);

    // Get unique dates
    const dates = [...new Set(validFlows.map(f => f.date?.substring(0, 7)))].sort();

    return {
      hasData: validFlows.length > 0,
      dateRange: {
        start: dates[0] || null,
        end: dates[dates.length - 1] || null
      },
      lastUpdated: new Date().toISOString(),
      totalFlows: validFlows.length,
      dateFlows: dateFlows.length,
      uniqueDates: dates.length
    };
  }
);

// Date-specific Shocks Selector
export const selectDateFilteredShocks = createSelector(
  [selectMarketShocks, selectSelectedDate],
  (shocks, selectedDate) => {
    if (!shocks?.length || !selectedDate) return [];
    return flowValidation.filterFlowsByDate(shocks, selectedDate);
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
  selectTimeSeriesMetrics,
  selectFlowDataStatus
};
