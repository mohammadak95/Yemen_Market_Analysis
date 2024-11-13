//src/hooks/usePrecomputedData.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { enhancedSpatialProcessor } from '../utils/spatialProcessors';
import { fetchSpatialData, selectTimeSeriesData, selectAnalysisMetrics } from '../slices/spatialSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';

export function usePrecomputedData(commodity, date) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [geometries, setGeometries] = useState(null);

  const timeSeriesData = useSelector(selectTimeSeriesData);
  const analysisMetrics = useSelector(selectAnalysisMetrics);

  // Load geometries
  const loadGeometries = useCallback(async () => {
    const metric = backgroundMonitor.startMetric('load-geometries');
    try {
      let geometryData;
      
      // Try loading from PrecomputedDataManager first
      try {
        geometryData = await precomputedDataManager.loadGeometries();
      } catch (e) {
        console.warn('Failed to load geometries from PrecomputedDataManager:', e);
      }

      // If that fails, try loading from local GeoJSON
      if (!geometryData) {
        try {
          const response = await fetch('/geoBoundaries-YEM-ADM1.geojson');
          if (!response.ok) throw new Error('Failed to fetch geometry data');
          geometryData = await response.json();
        } catch (e) {
          console.warn('Failed to load local geometry data:', e);
        }
      }

      if (geometryData) {
        metric.finish({ status: 'success' });
        return geometryData;
      } else {
        throw new Error('No geometry data available');
      }
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Error loading geometries:', error);
      return null;
    }
  }, []);

  // Load geometries on mount
  useEffect(() => {
    if (!geometries) {
      loadGeometries().then(setGeometries);
    }
  }, [geometries, loadGeometries]);

  // Main data loading function
  const loadData = useCallback(async () => {
    if (!commodity || !date) {
      setLoading(false);
      return;
    }

    const metric = backgroundMonitor.startMetric('load-spatial-data');
    setLoading(true);
    setError(null);

    try {
      // Load raw data
      const rawData = await precomputedDataManager.loadCommodityData(commodity, date);
      
      if (!rawData) {
        throw new Error('No data available for selected commodity and date');
      }

      // Process data using enhanced processor
      const processed = await enhancedSpatialProcessor.processSpatialData(rawData, {
        geometries,
        requireGeometry: false, // Don't require geometries to handle missing data gracefully
        transform: true
      });

      setProcessedData(processed);
      
      // Update Redux store
      dispatch(fetchSpatialData({
        selectedCommodity: commodity,
        selectedDate: date,
        processedData: processed
      }));

      metric.finish({ status: 'success' });
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
      metric.finish({ status: 'error', error: err.message });
    } finally {
      setLoading(false);
    }
  }, [commodity, date, geometries, dispatch]);

  // Load data when inputs change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Process map data
  const mapData = useMemo(() => {
    if (!processedData?.geoData) return null;

    const timeSeriesEntry = timeSeriesData?.find(d => d.month === date);

    return {
      ...processedData.geoData,
      features: processedData.geoData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          timeSeriesData: timeSeriesEntry,
          priceData: timeSeriesEntry
        }
      }))
    };
  }, [processedData, timeSeriesData, date]);

  return {
    data: processedData,
    mapData,
    loading,
    error,
    analysisMetrics,
    refresh: loadData
  };
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