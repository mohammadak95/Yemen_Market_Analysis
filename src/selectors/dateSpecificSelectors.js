// src/selectors/dateSpecificSelectors.js

import { createDeepEqualSelector } from './selectorUtils';
import _ from 'lodash';
import { flowValidation } from '../components/spatialAnalysis/features/flows/types';

// Base selectors
const selectMarketShocks = (state) => state.spatial?.data?.marketShocks || [];
const selectTimeSeriesData = (state) => state.spatial?.data?.timeSeriesData || [];
const selectSelectedDate = (state) => state.spatial?.ui?.selectedDate;
const selectGeometry = (state) => state.spatial?.data?.geometry;
const selectFlowData = (state) => state.spatial?.data?.flowData;
const selectFlowMaps = (state) => state.spatial?.data?.flowMaps || [];

/**
 * Selector to filter time series data based on the selected date.
 */
export const selectDateFilteredData = createDeepEqualSelector(
  [selectTimeSeriesData, selectSelectedDate],
  (timeSeriesData, selectedDate) => {
    if (!timeSeriesData.length || !selectedDate) return [];
    return flowValidation.filterFlowsByDate(timeSeriesData, selectedDate);
  }
);

/**
 * Selector to filter and validate flows based on the selected date.
 */
export const selectDateFilteredFlows = createDeepEqualSelector(
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

/**
 * Selector to calculate flow metrics for the selected date.
 */
export const selectDateFilteredMetrics = createDeepEqualSelector(
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

/**
 * Selector to determine the status of flow data based on flows and selected date.
 */
export const selectFlowDataStatus = createDeepEqualSelector(
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
    const dates = [...new Set(validFlows.map((f) => f.date?.substring(0, 7)))].sort();

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

/**
 * Selector to filter market shocks based on the selected date.
 */
export const selectDateFilteredShocks = createDeepEqualSelector(
  [selectMarketShocks, selectSelectedDate],
  (shocks, selectedDate) => {
    if (!shocks.length || !selectedDate) return [];
    return flowValidation.filterFlowsByDate(shocks, selectedDate);
  }
);

/**
 * Selector to calculate metrics related to market shocks.
 */
export const selectShockMetrics = createDeepEqualSelector(
  [selectDateFilteredShocks],
  (shocks) => {
    if (!shocks.length) {
      return {
        totalShocks: 0,
        priceDrops: 0,
        priceSurges: 0,
        avgMagnitude: 0,
        maxMagnitude: 0,
        affectedRegions: []
      };
    }

    const priceDrops = shocks.filter((s) => s.shock_type === 'price_drop');
    const priceSurges = shocks.filter((s) => s.shock_type === 'price_surge');
    const totalMagnitude = shocks.reduce((sum, s) => sum + s.magnitude, 0);
    const avgMagnitude = totalMagnitude / shocks.length;
    const maxMagnitude = Math.max(...shocks.map((s) => s.magnitude));
    const affectedRegions = _.uniq(shocks.map((s) => s.region));

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

/**
 * Selector to aggregate shock analysis data, including regional breakdowns.
 */
export const selectShockAnalysisData = createDeepEqualSelector(
  [selectDateFilteredShocks, selectGeometry, selectShockMetrics],
  (shocks, geometry, metrics) => {
    if (!shocks.length || !geometry) return null;

    // Group shocks by region
    const shocksByRegion = shocks.reduce((acc, shock) => {
      if (!acc[shock.region]) acc[shock.region] = [];
      acc[shock.region].push(shock);
      return acc;
    }, {});

    // Calculate regional metrics
    const regionalMetrics = Object.entries(shocksByRegion).map(
      ([region, regionShocks]) => {
        const totalShocks = regionShocks.length;
        const totalMagnitude = regionShocks.reduce((sum, s) => sum + s.magnitude, 0);
        const avgMagnitude = totalMagnitude / totalShocks;
        const maxMagnitude = Math.max(...regionShocks.map((s) => s.magnitude));
        const priceDrops = regionShocks.filter((s) => s.shock_type === 'price_drop').length;
        const priceSurges = regionShocks.filter((s) => s.shock_type === 'price_surge').length;

        return {
          region,
          shockCount: totalShocks,
          avgMagnitude,
          maxMagnitude,
          priceDrops,
          priceSurges
        };
      }
    );

    return {
      shocks,
      geometry,
      metrics,
      regionalMetrics,
      shocksByRegion
    };
  }
);

/**
 * Selector to calculate metrics from date-filtered time series data.
 */
export const selectTimeSeriesMetrics = createDeepEqualSelector(
  [selectDateFilteredData],
  (timeData) => {
    if (!timeData.length) {
      return {
        avgPrice: 0,
        maxPrice: 0,
        minPrice: 0,
        priceRange: 0,
        avgConflict: 0,
        maxConflict: 0
      };
    }

    const prices = timeData.map((d) => d.usdPrice || 0);
    const conflicts = timeData.map((d) => d.conflictIntensity || 0);

    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const avgConflict = conflicts.reduce((sum, c) => sum + c, 0) / conflicts.length;
    const maxConflict = Math.max(...conflicts);

    return {
      avgPrice,
      maxPrice,
      minPrice,
      priceRange,
      avgConflict,
      maxConflict
    };
  }
);

/**
 * Selector to perform comprehensive shock analysis, including regional and summary data.
 */
export const selectComprehensiveShockAnalysis = createDeepEqualSelector(
  [selectShockAnalysisData, selectGeometry],
  (shockAnalysis, geometry) => {
    if (!shockAnalysis || !geometry) return null;

    // Additional processing can be done here if needed

    return {
      ...shockAnalysis,
      geometry
    };
  }
);

/**
 * Selector to summarize all date-specific selectors into a single object.
 */
export const selectDateSpecificSummary = createDeepEqualSelector(
  [
    selectDateFilteredData,
    selectDateFilteredFlows,
    selectDateFilteredMetrics,
    selectFlowDataStatus,
    selectShockAnalysisData,
    selectTimeSeriesMetrics,
    selectComprehensiveShockAnalysis
  ],
  (
    dateFilteredData,
    dateFilteredFlows,
    dateFilteredMetrics,
    flowDataStatus,
    shockAnalysisData,
    timeSeriesMetrics,
    comprehensiveShockAnalysis
  ) => ({
    dateFilteredData,
    dateFilteredFlows,
    dateFilteredMetrics,
    flowDataStatus,
    shockAnalysisData,
    timeSeriesMetrics,
    comprehensiveShockAnalysis
  })
);