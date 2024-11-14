// src/utils/PrecomputedDataManager.js

import { spatialDataMerger } from './spatialDataMerger';
import { getDataPath } from './dataUtils';
import { backgroundMonitor } from './backgroundMonitor';
import JSON5 from 'json5';

class PrecomputedDataManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this._isInitialized = false;
    this.cacheTimeout = 30 * 60 * 1000;
    this.rawData = null; // Add this line
  }

  async initialize() {
    if (this._isInitialized) return;
    
    try {
      // Load the base GeoJSON data
      const response = await fetch('/results/unified_data.geojson');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const text = await response.text();
      this.rawData = JSON.parse(text);
      this._isInitialized = true;
      
      console.log('PrecomputedDataManager initialized with features:', this.rawData.features.length);
    } catch (error) {
      console.error('Failed to initialize PrecomputedDataManager:', error);
      throw error;
    }
  }

  async processSpatialData(selectedCommodity, selectedDate) {
    if (!this._isInitialized || !this.rawData) {
      await this.initialize();
    }

    const metric = backgroundMonitor.startMetric('precomputed-process-spatial-data', {
      commodity: selectedCommodity,
      date: selectedDate,
    });

    try {
      // Filter features by commodity
      const relevantFeatures = this.rawData.features.filter(
        feature => feature.properties.commodity === selectedCommodity
      );

      // Get unique months
      const availableMonths = [...new Set(
        relevantFeatures.map(f => f.properties.date)
      )].sort();

      // Create time series data
      const timeSeriesData = this.processTimeSeries(relevantFeatures);

      // Create processed data structure
      const processedData = {
        timeSeriesData,
        geoData: {
          type: 'FeatureCollection',
          features: selectedDate ? 
            relevantFeatures.filter(f => f.properties.date === selectedDate) :
            relevantFeatures
        },
        marketClusters: this.createMarketClustersFromFeatures(relevantFeatures),
        availableMonths,
        metadata: {
          commodity: selectedCommodity,
          dateRange: {
            min: availableMonths[0],
            max: availableMonths[availableMonths.length - 1]
          }
        }
      };

      metric.finish({ status: 'success', source: 'processed' });
      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  processTimeSeries(features) {
    const timeSeriesMap = new Map();
    
    features.forEach(feature => {
      const { date, price, usdprice, conflict_intensity } = feature.properties;
      if (!date) return;
      
      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, {
          month: date,
          avgUsdPrice: usdprice || 0,
          price: price || 0,
          volatility: 0,
          conflict_intensity: conflict_intensity || 0,
          sampleSize: 1
        });
      } else {
        const existing = timeSeriesMap.get(date);
        existing.avgUsdPrice += (usdprice || 0);
        existing.price += (price || 0);
        existing.conflict_intensity += (conflict_intensity || 0);
        existing.sampleSize++;
      }
    });

    return Array.from(timeSeriesMap.values())
      .map(entry => ({
        ...entry,
        avgUsdPrice: entry.avgUsdPrice / entry.sampleSize,
        price: entry.price / entry.sampleSize,
        conflict_intensity: entry.conflict_intensity / entry.sampleSize
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }

  createMarketClustersFromFeatures(features) {
    // Group features by region to identify clusters
    const regionGroups = new Map();
    features.forEach(feature => {
      const { admin1, date } = feature.properties;
      if (!regionGroups.has(admin1)) {
        regionGroups.set(admin1, new Set());
      }
      regionGroups.get(admin1).add(date);
    });

    // Create cluster objects
    return Array.from(regionGroups.entries()).map(([region, dates]) => ({
      cluster_id: region,
      main_market: region,
      market_count: dates.size,
      connected_markets: []
    }));
  }
}

export const precomputedDataManager = new PrecomputedDataManager();