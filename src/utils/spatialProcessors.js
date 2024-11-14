// src/utils/spatialProcessors.js

import proj4 from 'proj4';
import JSON5 from 'json5';
// Ensure backgroundMonitor is correctly implemented or remove if unused
// import { backgroundMonitor } from './backgroundMonitor';

// Define Yemen local projection
const YEMEN_TM =
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs';
const WGS84 = 'EPSG:4326';

import { scaleSequential, scaleQuantile } from 'd3-scale';
import {
  interpolateRdYlGn,
  interpolateBlues,
} from 'd3-scale-chromatic';

class EnhancedSpatialProcessor {
  constructor() {
    this.cache = new Map();
    this.processedData = null;
    this.rawData = null; // Add this line
  }

  process(rawData, { selectedDate, selectedCommodity }) {
    this.rawData = rawData;
  
    if (!rawData?.features) {
      console.warn('No raw data provided to processor');
      return this.getEmptyProcessedData();
    }
  
    try {
      // Filter by commodity first
      const commodityFeatures = this.filterFeaturesByCommodity(
        rawData.features,
        selectedCommodity
      );
  
      // Get available months from filtered features
      const availableMonths = [...new Set(
        commodityFeatures
          .map(f => f.properties.date)
          .filter(Boolean)
      )].sort();
  
      // Get relevant features for date
      const relevantFeatures = selectedDate ? 
        commodityFeatures.filter(f => f.properties.date === selectedDate) :
        commodityFeatures;
  
      this.processedData = {
        timeSeriesData: this.processTimeSeries(commodityFeatures),
        geoData: {
          type: 'FeatureCollection',
          features: relevantFeatures,
          metadata: {
            date: selectedDate,
            commodity: selectedCommodity,
            total_features: relevantFeatures.length,
          }
        },
        marketClusters: this.createMarketClustersFromFeatures(relevantFeatures),
        flowMaps: this.processFlows(relevantFeatures),
        spatialMetrics: this.processSpatialMetrics(relevantFeatures),
        analysisMetrics: {
          coverage: relevantFeatures.length / rawData.features.length,
          temporalRange: availableMonths.length,
          spatialCoverage: new Set(relevantFeatures.map(f => f.properties.admin1)).size
        },
        metadata: {
          date: selectedDate,
          commodity: selectedCommodity,
          total_features: relevantFeatures.length,
        },
        availableMonths
      };
  
      return this.processedData;
    } catch (error) {
      console.error('Error processing spatial data:', error);
      return this.getEmptyProcessedData();
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
    // Group features by region
    const regionGroups = new Map();
    features.forEach(feature => {
      const { admin1: region } = feature.properties;
      if (!region) return;
      
      if (!regionGroups.has(region)) {
        regionGroups.set(region, {
          markets: new Set(),
          dates: new Set(),
        });
      }
      
      regionGroups.get(region).markets.add(region);
      regionGroups.get(region).dates.add(feature.properties.date);
    });

    // Convert to cluster format
    return Array.from(regionGroups.entries()).map(([region, data]) => ({
      cluster_id: region,
      main_market: region,
      market_count: data.dates.size,
      connected_markets: [],
      metrics: {
        temporal_coverage: data.dates.size,
        spatial_coverage: data.markets.size,
      }
    }));
  }

  processSpatialMetrics(features) {
    const regionMetrics = new Map();
    
    features.forEach(feature => {
      const { admin1: region, price, conflict_intensity } = feature.properties;
      if (!region) return;

      if (!regionMetrics.has(region)) {
        regionMetrics.set(region, {
          prices: [],
          conflict: [],
        });
      }

      if (price) regionMetrics.get(region).prices.push(price);
      if (conflict_intensity) regionMetrics.get(region).conflict.push(conflict_intensity);
    });

    // Convert to metrics format
    const metrics = {
      global: {
        regions: regionMetrics.size,
        total_observations: features.length,
      },
      local: {}
    };

    regionMetrics.forEach((data, region) => {
      metrics.local[region] = {
        observations: data.prices.length,
        mean_price: data.prices.length ? 
          data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 
          0,
        mean_conflict: data.conflict.length ? 
          data.conflict.reduce((a, b) => a + b, 0) / data.conflict.length :
          0
      };
    });

    return metrics;
  }

  getEmptyProcessedData() {
    return {
      timeSeriesData: [],
      geoData: { type: 'FeatureCollection', features: [] },
      marketClusters: [],
      flowMaps: [],
      spatialMetrics: { global: {}, local: {} },
      analysisMetrics: {},
      metadata: {},
      availableMonths: []
    };
  }

  getPriceDataForDate(timeSeriesData, targetDate) {
    if (!timeSeriesData || !targetDate) return null;

    const entry = timeSeriesData.find((d) => d.month.startsWith(targetDate));
    if (!entry) return null;

    return {
      avgUsdPrice: entry.avgUsdPrice,
      volatility: entry.volatility,
      garchVolatility: entry.garch_volatility,
      stability: entry.price_stability,
    };
  }

  getColorScales(mode, data) {
    if (!data?.features?.length) {
      return { getColor: () => '#cccccc', domain: [], format: () => 'N/A' };
    }
  
    const getValidValue = (feature) => {
      switch (mode) {
        case 'prices':
          // Get price directly from properties
          return feature.properties?.usdprice;
        case 'integration':
          // Calculate integration score from conflict intensity
          return feature.properties?.conflict_intensity;
        case 'clusters':
          // Use temporal coverage as cluster size
          return feature.properties?.market_count || 1;
        case 'shocks':
          // Calculate shock score from conflict intensity change
          return feature.properties?.conflict_intensity_weighted;
        default:
          return null;
      }
    };
  
    const values = data.features
      .map((feature) => getValidValue(feature))
      .filter((value) => value != null && !isNaN(value));

    if (!values.length) {
      return { getColor: () => '#cccccc', domain: [], format: () => 'N/A' };
    }

    const domain = [Math.min(...values), Math.max(...values)];

    let scale;
    if (mode === 'prices') {
      scale = scaleSequential(interpolateRdYlGn).domain(domain.reverse());
    } else if (mode === 'clusters') {
      scale = scaleQuantile()
        .domain(values)
        .range(['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']);
    } else if (mode === 'integration' || mode === 'shocks') {
      scale = scaleSequential(interpolateBlues).domain(domain);
    } else {
      scale = () => '#cccccc';
    }

    const format = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return 'N/A';
      switch (mode) {
        case 'prices':
          return `$${value.toFixed(2)}`;
        case 'integration':
          return (value * 100).toFixed(1) + '%';
        case 'clusters':
          return value.toFixed(1);
        case 'shocks':
          return value.toFixed(1);
        default:
          return value.toFixed(1);
      }
    };

    return {
      getColor: (feature) => {
        const value = getValidValue(feature);
        return value != null ? scale(value) : '#cccccc';
      },
      domain,
      format,
    };
  }

  getAvailableMonths(timeSeriesData) {
    if (!Array.isArray(timeSeriesData)) return [];
    
    return timeSeriesData
      .map(entry => entry?.month)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b));
  }

  processFlows(features) {
    const flowMap = new Map();
    
    features.forEach(feature => {
      const { admin1: region, price, date } = feature.properties;
      if (!region || !price || !date) return;
      
      const key = `${region}_${date}`;
      if (!flowMap.has(key)) {
        flowMap.set(key, {
          source: region,
          date,
          prices: [price],
          count: 1
        });
      } else {
        const existing = flowMap.get(key);
        existing.prices.push(price);
        existing.count++;
      }
    });
  
    // Convert to flow objects
    return Array.from(flowMap.values())
      .map(flow => ({
        source: flow.source,
        target: flow.source, // Self-loop for now
        date: flow.date,
        flow_weight: flow.count,
        avg_price: flow.prices.reduce((a, b) => a + b, 0) / flow.count
      }));
  }

  filterFeaturesByCommodity(features, commodity) {
    if (!commodity) return features;
    return features.filter(f => 
      f.properties.commodity?.toLowerCase() === commodity.toLowerCase()
    );
  }
}

// Export a singleton instance to ensure a single processor across the app
export const spatialProcessor = new EnhancedSpatialProcessor();
