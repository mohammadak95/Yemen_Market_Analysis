// src/utils/dataLoaderUtils.js

import Papa from 'papaparse';
import _ from 'lodash';
import { backgroundMonitor } from './backgroundMonitor';

/**
 * Processes raw CSV data with robust error handling and progress tracking
 */
export const processCSVData = async (csvContent, options = {}) => {
  const metric = backgroundMonitor.startMetric('process-csv');
  
  try {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        transformHeader: (header) => header.trim().toLowerCase(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          metric.finish({ status: 'success', rowCount: results.data.length });
          resolve(results.data);
        },
        error: (error) => {
          metric.finish({ status: 'error', error: error.message });
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
        ...options
      });
    });
  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    throw error;
  }
};

/**
 * Normalizes region names for consistent matching
 */
export const normalizeRegionName = (name) => {
  if (!name) return '';
  
  const normalized = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .trim()
    .replace(/_+$/g, '');

  // Special case mappings
  const specialCases = {
    'sanaa': ['sana_a', 'sanʿaʾ', "san'a'", 'san_a__governorate'],
    'aden': ['_adan', 'adan'],
    'lahj': ['lahij', 'lahij_governorate'],
    'taizz': ['ta_izz', 'taiz'],
    'hadramaut': ['hadhramaut', 'hadramawt']
  };

  for (const [standard, variants] of Object.entries(specialCases)) {
    if (variants.includes(normalized)) {
      return standard;
    }
  }

  return normalized;
};

/**
 * Filters and validates time series data
 */
export const processTimeSeriesData = (data, targetDate) => {
  if (!Array.isArray(data)) {
    console.warn('Invalid time series data structure');
    return [];
  }

  return data
    .filter(entry => {
      const isValidDate = entry.date && !isNaN(new Date(entry.date).getTime());
      const hasRequiredFields = entry.price !== undefined || 
                               entry.usdprice !== undefined ||
                               entry.conflict_intensity !== undefined;
      return isValidDate && hasRequiredFields;
    })
    .map(entry => ({
      date: new Date(entry.date).toISOString(),
      price: parseFloat(entry.price) || 0,
      usdprice: parseFloat(entry.usdprice) || 0,
      conflict_intensity: parseFloat(entry.conflict_intensity) || 0,
      region: normalizeRegionName(entry.region || entry.admin1)
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Processes market shocks data with validation
 */
export const processMarketShocks = (shocks, targetDate) => {
  if (!Array.isArray(shocks)) return [];

  return shocks
    .filter(shock => {
      const isValidDate = shock.date && shock.date.startsWith(targetDate);
      const hasRequiredFields = shock.region && 
                               shock.magnitude !== undefined &&
                               shock.type;
      return isValidDate && hasRequiredFields;
    })
    .map(shock => ({
      region: normalizeRegionName(shock.region),
      date: shock.date,
      magnitude: parseFloat(shock.magnitude) || 0,
      type: shock.type,
      severity: shock.severity || 'medium',
      previous_price: parseFloat(shock.previous_price) || 0,
      current_price: parseFloat(shock.current_price) || 0
    }));
};

/**
 * Processes market clusters with validation
 */
export const processMarketClusters = (clusters) => {
  if (!Array.isArray(clusters)) return [];

  return clusters
    .filter(cluster => {
      const hasRequiredFields = cluster.main_market && 
                               Array.isArray(cluster.connected_markets) &&
                               cluster.market_count;
      return hasRequiredFields;
    })
    .map(cluster => ({
      cluster_id: cluster.cluster_id || _.uniqueId('cluster_'),
      main_market: normalizeRegionName(cluster.main_market),
      connected_markets: cluster.connected_markets.map(market => 
        normalizeRegionName(market)
      ),
      market_count: parseInt(cluster.market_count) || 0,
      metrics: {
        totalFlow: parseFloat(cluster.metrics?.totalFlow) || 0,
        avgFlow: parseFloat(cluster.metrics?.avgFlow) || 0,
        flowDensity: parseFloat(cluster.metrics?.flowDensity) || 0
      }
    }));
};

/**
 * Validates the overall data structure
 */
export const validateDataStructure = (data) => {
  const requiredFields = [
    'time_series_data',
    'market_shocks',
    'market_clusters',
    'flow_analysis',
    'spatial_autocorrelation',
    'metadata'
  ];

  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  const hasValidTimeSeries = Array.isArray(data.time_series_data) && 
                            data.time_series_data.length > 0;
  const hasValidClusters = Array.isArray(data.market_clusters) && 
                          data.market_clusters.length > 0;
  
  if (!hasValidTimeSeries || !hasValidClusters) {
    throw new Error('Invalid data structure: missing required arrays');
  }

  return true;
};