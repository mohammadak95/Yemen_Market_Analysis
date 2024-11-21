// src/components/analysis/spatial-analysis/hooks/useConflictAnalysis.js

import { useMemo } from 'react';
import { 
  calculateConflictMetrics,
  analyzePriceImpacts,
  calculateRegionalCorrelations
} from '../utils/conflictAnalysis';

export const useConflictAnalysis = (timeSeriesData, spatialClusters, timeWindow) => {
  return useMemo(() => {
    const conflictMetrics = calculateConflictMetrics(timeSeriesData, timeWindow);
    const priceImpacts = analyzePriceImpacts(timeSeriesData, timeWindow);
    const regionalCorrelations = calculateRegionalCorrelations(
      timeSeriesData,
      spatialClusters
    );

    // Process time series for visualization
    const timeSeriesMetrics = processTimeSeriesData(
      timeSeriesData,
      timeWindow
    );

    return {
      conflictMetrics,
      priceImpacts,
      regionalCorrelations,
      timeSeriesMetrics
    };
  }, [timeSeriesData, spatialClusters, timeWindow]);
};

const processTimeSeriesData = (data, timeWindow) => {
  const windowSizes = {
    '1M': 1,
    '3M': 3,
    '6M': 6,
    '1Y': 12
  };

  const months = windowSizes[timeWindow] || 1;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  // Filter data within the time window
  const filteredData = data.filter(d => new Date(d.month) >= cutoffDate);

  // Calculate aggregated metrics
  return filteredData.map(d => ({
    month: d.month,
    avgUsdPrice: d.avgUsdPrice,
    conflict_intensity: d.conflict_intensity,
    volatility: d.volatility,
    // Add derived metrics
    priceChange: calculatePriceChange(d, data),
    conflictImpact: calculateConflictImpact(d, data),
    seasonalAdjustedPrice: adjustForSeasonality(d, data),
    rollingMetrics: calculateRollingMetrics(d, data, months)
  }));
};

// Helper functions for time series processing
const calculatePriceChange = (current, allData) => {
  const previousMonth = new Date(current.month);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  
  const previous = allData.find(d => d.month === previousMonth.toISOString().slice(0, 7));
  if (!previous) return 0;

  return ((current.avgUsdPrice - previous.avgUsdPrice) / previous.avgUsdPrice) * 100;
};

const calculateConflictImpact = (current, allData) => {
  const previousMonth = new Date(current.month);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  
  const previous = allData.find(d => d.month === previousMonth.toISOString().slice(0, 7));
  if (!previous) return 0;

  const conflictChange = current.conflict_intensity - previous.conflict_intensity;
  const priceChange = ((current.avgUsdPrice - previous.avgUsdPrice) / previous.avgUsdPrice);
  
  return conflictChange * priceChange;
};

const adjustForSeasonality = (current, allData) => {
  const currentMonth = new Date(current.month).getMonth();
  const sameMonthData = allData.filter(d => 
    new Date(d.month).getMonth() === currentMonth
  );

  if (sameMonthData.length < 2) return current.avgUsdPrice;

  const avgSeasonalPrice = sameMonthData.reduce((sum, d) => 
    sum + d.avgUsdPrice, 0) / sameMonthData.length;

  return current.avgUsdPrice / avgSeasonalPrice * 100;
};

const calculateRollingMetrics = (current, allData, windowSize) => {
  const currentDate = new Date(current.month);
  const windowStart = new Date(currentDate);
  windowStart.setMonth(windowStart.getMonth() - windowSize);

  const windowData = allData.filter(d => {
    const date = new Date(d.month);
    return date >= windowStart && date <= currentDate;
  });

  return {
    avgPrice: windowData.reduce((sum, d) => sum + d.avgUsdPrice, 0) / windowData.length,
    avgConflict: windowData.reduce((sum, d) => sum + d.conflict_intensity, 0) / windowData.length,
    volatility: calculateVolatility(windowData.map(d => d.avgUsdPrice)),
    trend: calculateTrend(windowData)
  };
};

const calculateVolatility = (prices) => {
  if (prices.length < 2) return 0;
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  return Math.sqrt(variance) / mean * 100;
};

const calculateTrend = (data) => {
  if (data.length < 2) return 0;
  const x = Array.from({ length: data.length }, (_, i) => i);
  const y = data.map(d => d.avgUsdPrice);
  
  const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  const numerator = x.reduce((sum, val, i) => sum + (val - xMean) * (y[i] - yMean), 0);
  const denominator = x.reduce((sum, val) => sum + Math.pow(val - xMean, 2), 0);
  
  return denominator === 0 ? 0 : numerator / denominator;
};