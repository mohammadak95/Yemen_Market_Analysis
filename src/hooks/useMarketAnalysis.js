// src/hooks/useMarketAnalysis.js

import { useMemo } from 'react';

export function useMarketAnalysis(data) {
  const marketMetrics = useMemo(() => {
    if (!data?.timeSeriesData) return null;

    return {
      priceVolatility: calculateVolatility(data.timeSeriesData),
      marketIntegration: data.analysisResults?.spatialAutocorrelation?.global?.moran_i || 0,
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
    if (!data?.analysisResults?.spatialAutocorrelation) return null;

    return {
      moranI: data.analysisResults.spatialAutocorrelation.global.moran_i || 0,
      significance: data.analysisResults.spatialAutocorrelation.global.significance || false,
      clusters: summarizeClusters(data.marketClusters),
    };
  }, [data]);

  return {
    marketMetrics,
    timeSeriesAnalysis,
    spatialAnalysis,
  };
}

// Helper functions

function calculateVolatility(timeSeriesData) {
  if (!timeSeriesData?.length) return 0;
  const prices = timeSeriesData.map(d => d.avgUsdPrice).filter(p => p != null && !isNaN(p));
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  return mean !== 0 ? Math.sqrt(variance) / mean : 0;
}

function calculateShockFrequency(shocks) {
  if (!shocks?.length) return 0;
  const monthsWithShocks = new Set(shocks.map(s => s.date.substring(0, 7)));
  return shocks.length / monthsWithShocks.size;
}

function calculateClusterEfficiency(clusters) {
  if (!clusters?.length) return 0;
  return clusters.reduce((acc, cluster) => acc + cluster.market_count, 0) / clusters.length;
}

function calculatePriceTrend(timeSeriesData) {
  if (!timeSeriesData?.length) return 0;
  const sortedData = [...timeSeriesData].sort((a, b) => new Date(a.month) - new Date(b.month));
  const firstPrice = sortedData[0]?.avgUsdPrice || 0;
  const lastPrice = sortedData[sortedData.length - 1]?.avgUsdPrice || 0;
  return firstPrice !== 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
}

function detectSeasonality(timeSeriesData) {
  // Placeholder implementation for seasonality detection
  return {
    seasonal: false,
    period: null,
    strength: 0,
  };
}

function detectOutliers(timeSeriesData) {
  if (!timeSeriesData?.length) return [];
  const prices = timeSeriesData.map(d => d.avgUsdPrice).filter(p => p != null && !isNaN(p));
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);
  return timeSeriesData.filter(d => {
    const price = d.avgUsdPrice;
    return price != null && !isNaN(price) && Math.abs(price - mean) > 2 * stdDev;
  });
}

function summarizeClusters(clusters) {
  if (!clusters?.length) return null;

  return {
    count: clusters.length,
    averageSize: clusters.reduce((acc, c) => acc + c.market_count, 0) / clusters.length,
    largest: Math.max(...clusters.map(c => c.market_count)),
    smallest: Math.min(...clusters.map(c => c.market_count)),
  };
}