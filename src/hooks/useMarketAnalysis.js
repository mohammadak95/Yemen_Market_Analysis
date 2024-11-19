// src/hooks/useMarketAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  calculateVolatility,
  calculateIntegration,
  calculateShockFrequency,
  calculateClusterEfficiency,
  calculatePriceTrend,
  detectSeasonality,
  detectOutliers,
  summarizeClusters,
} from '../utils/marketAnalysisUtils';

export function useMarketAnalysis() {
  // Access data from Redux store
  const data = useSelector((state) => state.spatial.data);

  const marketMetrics = useMemo(() => {
    if (!data?.timeSeriesData) return null;

    return {
      priceVolatility: calculateVolatility(data.timeSeriesData),
      marketIntegration: calculateIntegration(data.spatialAutocorrelation),
      shockFrequency: calculateShockFrequency(data.detectedShocks),
      clusterEfficiency: calculateClusterEfficiency(data.marketClusters),
    };
  }, [data]);

  const timeSeriesAnalysis = useMemo(() => {
    if (!data?.timeSeriesData) return null;

    return {
      trend: calculatePriceTrend(data.timeSeriesData),
      seasonality: detectSeasonality(data.timeSeriesData),
      outliers: detectOutliers(data.timeSeriesData),
    };
  }, [data]);

  const spatialAnalysis = useMemo(() => {
    if (!data?.spatialAutocorrelation) return null;

    return {
      moranI: data.spatialAutocorrelation.moran_i,
      significance: data.spatialAutocorrelation.p_value,
      clusters: summarizeClusters(data.marketClusters),
    };
  }, [data]);

  return {
    marketMetrics,
    timeSeriesAnalysis,
    spatialAnalysis,
  };
}