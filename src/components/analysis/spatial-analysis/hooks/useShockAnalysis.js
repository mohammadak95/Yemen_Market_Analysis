// src/components/analysis/spatial-analysis/hooks/useShockAnalysis.js

import { useMemo } from 'react';
import { analyzeMarketShocks, calculateShockStatistics, analyzeShockPropagation } from '../utils/shockAnalysis';

/**
 * Hook to process shock data and compute shock statistics.
 * @param {Array} timeSeriesData - Array of time series data for markets.
 * @param {Object} spatialAutocorrelation - Spatial autocorrelation data.
 * @param {number} threshold - Threshold for detecting shocks.
 * @returns {Object} Processed shocks and statistics.
 */
export const useShockAnalysis = (timeSeriesData, spatialAutocorrelation, threshold = 0.1) => {
  return useMemo(() => {
    // Analyze market shocks
    const shocks = analyzeMarketShocks(timeSeriesData, threshold);

    // Calculate shock statistics
    const shockStats = calculateShockStatistics(shocks);

    // Analyze shock propagation patterns
    const propagationPatterns = analyzeShockPropagation(shocks, spatialAutocorrelation);

    return {
      shocks,
      shockStats,
      propagationPatterns,
    };
  }, [timeSeriesData, spatialAutocorrelation, threshold]);
};
