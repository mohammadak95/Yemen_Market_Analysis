// src/components/analysis/spatial-analysis/hooks/useShockAnalysis.js

import { useMemo } from 'react';
import { analyzeShockPropagation, calculateShockStatistics } from '../utils/shockAnalysis';

export const useShockAnalysis = (shocks, spatialAutocorrelation, selectedDate) => {
  return useMemo(() => {
    const processedShocks = shocks.map(shock => ({
      ...shock,
      clusterType: spatialAutocorrelation[shock.region]?.cluster_type,
      localMoranI: spatialAutocorrelation[shock.region]?.local_i
    }));

    const stats = calculateShockStatistics(processedShocks);
    const patterns = analyzeShockPropagation(processedShocks, selectedDate);

    return {
      processedShocks,
      shockStats: stats,
      propagationPatterns: patterns
    };
  }, [shocks, spatialAutocorrelation, selectedDate]);
};