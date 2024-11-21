// src/components/analysis/spatial-analysis/hooks/useSeasonalAnalysis.js

import { useMemo } from 'react';
import { 
  calculateRegionalPatterns,
  analyzeSeasonalStrength 
} from '../utils/seasonalAnalysis';

export const useSeasonalAnalysis = (seasonalAnalysis, timeSeriesData) => {
  return useMemo(() => {
    const seasonalPatterns = seasonalAnalysis.seasonal_pattern || [];
    const regionalPatterns = calculateRegionalPatterns(timeSeriesData);
    const seasonalStrength = analyzeSeasonalStrength(timeSeriesData);

    const monthlyAverages = seasonalPatterns.map((effect, index) => ({
      month: index,
      effect: effect * 100 // Convert to percentage
    }));

    return {
      seasonalPatterns,
      regionalPatterns,
      seasonalStrength,
      monthlyAverages
    };
  }, [seasonalAnalysis, timeSeriesData]);
};