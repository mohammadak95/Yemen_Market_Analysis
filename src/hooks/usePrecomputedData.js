// src/hooks/usePrecomputedData.js

import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { calculateMarketMetrics } from '../utils/dataTransformers';

export function usePrecomputedData(commodity, date) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!commodity || !date) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await precomputedDataManager.loadCommodityData(commodity, date);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error loading commodity data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [commodity, date]);

  const metrics = useMemo(() => {
    if (!data) return null;
    return calculateMarketMetrics(data);
  }, [data]);

  return { data, loading, error, metrics };
}

// src/hooks/useMarketAnalysis.js

export function useMarketAnalysis(data) {
  const marketMetrics = useMemo(() => {
    if (!data?.timeSeriesData) return null;

    return {
      priceVolatility: calculateVolatility(data.timeSeriesData),
      marketIntegration: calculateIntegration(data.spatialAnalysis),
      shockFrequency: calculateShockFrequency(data.marketShocks),
      clusterEfficiency: calculateClusterEfficiency(data.marketClusters)
    };
  }, [data]);

  const timeSeriesAnalysis = useMemo(() => {
    if (!data?.timeSeriesData) return null;

    return {
      trend: calculatePriceTrend(data.timeSeriesData),
      seasonality: detectSeasonality(data.timeSeriesData),
      outliers: detectOutliers(data.timeSeriesData)
    };
  }, [data]);

  const spatialAnalysis = useMemo(() => {
    if (!data?.spatialAnalysis) return null;

    return {
      moranI: data.spatialAnalysis.autocorrelation.moran_i,
      significance: data.spatialAnalysis.autocorrelation.significance,
      clusters: summarizeClusters(data.marketClusters)
    };
  }, [data]);

  return {
    marketMetrics,
    timeSeriesAnalysis,
    spatialAnalysis
  };
}

// Helper functions for useMarketAnalysis
function calculateVolatility(timeSeriesData) {
  if (!timeSeriesData?.length) return 0;
  const prices = timeSeriesData.map(d => d.avgUsdPrice);
  const mean = prices.reduce((a, b) => a + b) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  return Math.sqrt(variance) / mean;
}

function calculateIntegration(spatialAnalysis) {
  if (!spatialAnalysis?.autocorrelation) return 0;
  return spatialAnalysis.autocorrelation.moran_i;
}

function calculateShockFrequency(shocks) {
  if (!shocks?.length) return 0;
  const timeRange = new Set(shocks.map(s => s.date.substring(0, 7))).size;
  return shocks.length / timeRange;
}

function calculateClusterEfficiency(clusters) {
  if (!clusters?.length) return 0;
  return clusters.reduce((acc, cluster) => 
    acc + (cluster.market_count / cluster.connected_markets.length), 0) / clusters.length;
}

function detectSeasonality(timeSeriesData) {
  // Implement seasonality detection logic
  return {
    seasonal: false,
    period: null,
    strength: 0
  };
}

function detectOutliers(timeSeriesData) {
  if (!timeSeriesData?.length) return [];
  
  const prices = timeSeriesData.map(d => d.avgUsdPrice);
  const mean = prices.reduce((a, b) => a + b) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);
  
  return timeSeriesData.filter(d => 
    Math.abs(d.avgUsdPrice - mean) > 2 * stdDev
  );
}

function summarizeClusters(clusters) {
  if (!clusters?.length) return null;

  return {
    count: clusters.length,
    averageSize: clusters.reduce((acc, c) => acc + c.market_count, 0) / clusters.length,
    largest: Math.max(...clusters.map(c => c.market_count)),
    smallest: Math.min(...clusters.map(c => c.market_count))
  };
}