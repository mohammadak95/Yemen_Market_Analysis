// src/utils/spatialUtils.js

import * as turf from '@turf/turf';
import proj4 from 'proj4';

// Constants for analysis thresholds
export const THRESHOLDS = {
  VOLATILITY: 0.05,  // 5% threshold for price volatility
  PRICE_CHANGE: 0.15, // 15% threshold for significant price changes
  MIN_DATA_POINTS: 3,  // Minimum data points needed for analysis
  MAX_OUTLIER_STDDEV: 3, // Maximum standard deviations for outlier detection
  MIN_CLUSTER_SIZE: 2,   // Minimum size for market clusters
  NEIGHBOR_THRESHOLD_KM: 200 // Maximum distance for market connectivity
};

// Initialize projections
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs';
proj4.defs('UTM38N', UTM_ZONE_38N);

/**
 * Process time series data from GeoJSON features
 */
export const processTimeSeriesData = (features, selectedDate) => {
  if (!features?.length || !selectedDate) return [];

  const validFeatures = validateFeatures(features);
  const monthlyData = {};

  validFeatures.forEach(feature => {
    const { properties } = feature;
    if (!properties?.date) return;

    const date = new Date(properties.date);
    if (isNaN(date.getTime())) return;

    const month = date.toISOString().slice(0, 7);
    
    if (!monthlyData[month]) {
      monthlyData[month] = {
        prices: [],
        conflictIntensity: [],
        usdPrices: [],
        count: 0
      };
    }

    if (!isNaN(properties.price)) {
      monthlyData[month].prices.push(properties.price);
    }
    if (!isNaN(properties.conflict_intensity)) {
      monthlyData[month].conflictIntensity.push(properties.conflict_intensity);
    }
    if (!isNaN(properties.usdprice)) {
      monthlyData[month].usdPrices.push(properties.usdprice);
    }
    
    monthlyData[month].count++;
  });

  return Object.entries(monthlyData)
    .filter(([_, data]) => data.count >= THRESHOLDS.MIN_DATA_POINTS)
    .map(([month, data]) => ({
      month,
      ...calculateMonthlyStatistics(data),
      sampleSize: data.count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Calculate monthly statistics for time series data
 */
export const calculateMonthlyStatistics = (data) => {
  const stats = {
    avgPrice: null,
    volatility: null,
    avgConflictIntensity: null,
    avgUsdPrice: null,
    priceRange: { min: null, max: null }
  };

  try {
    if (data.prices.length > 0) {
      const cleanPrices = removeOutliers(data.prices);
      stats.avgPrice = calculateMean(cleanPrices);
      const stdDev = calculateStandardDeviation(cleanPrices);
      stats.volatility = (stdDev / stats.avgPrice) * 100;
      stats.priceRange = {
        min: Math.min(...cleanPrices),
        max: Math.max(...cleanPrices)
      };
    }

    if (data.conflictIntensity.length > 0) {
      stats.avgConflictIntensity = calculateMean(data.conflictIntensity);
    }

    if (data.usdPrices.length > 0) {
      const cleanUsdPrices = removeOutliers(data.usdPrices);
      stats.avgUsdPrice = calculateMean(cleanUsdPrices);
    }

    return stats;
  } catch (error) {
    console.error('Error calculating monthly statistics:', error);
    return stats;
  }
};

/**
 * Compute market clusters based on spatial weights and flows
 */
export const computeClusters = (features, weights, flows) => {
  if (!features?.length || !weights || !flows?.length) return [];

  const clusters = [];
  const visited = new Set();

  const dfs = (region, clusterMarkets) => {
    if (!region || visited.has(region)) return;
    
    visited.add(region);
    clusterMarkets.add(region);

    const neighbors = weights[region]?.neighbors || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, clusterMarkets);
      }
    });
  };

  // Process each region
  Object.keys(weights).forEach(region => {
    if (!visited.has(region)) {
      const clusterMarkets = new Set();
      dfs(region, clusterMarkets);

      if (clusterMarkets.size >= THRESHOLDS.MIN_CLUSTER_SIZE) {
        const clusterMetrics = calculateClusterMetrics(flows, clusterMarkets);
        clusters.push({
          mainMarket: determineMainMarket(flows, clusterMarkets),
          connectedMarkets: clusterMarkets,
          marketCount: clusterMarkets.size,
          ...clusterMetrics
        });
      }
    }
  });

  return clusters;
};

/**
 * Detect market shocks based on price changes and volatility
 */
export const detectMarketShocks = (features, selectedDate) => {
  if (!features?.length || !selectedDate) return [];

  const validFeatures = validateFeatures(features);
  const groupedFeatures = groupFeaturesByRegion(validFeatures);
  const shocks = [];

  Object.entries(groupedFeatures).forEach(([region, regionFeatures]) => {
    const sortedFeatures = regionFeatures.sort((a, b) => 
      new Date(a.properties.date) - new Date(b.properties.date)
    );

    const priceChanges = calculatePriceChanges(sortedFeatures);
    const volatility = calculateVolatility(sortedFeatures);

    if (Math.abs(priceChanges.percentChange) > THRESHOLDS.PRICE_CHANGE) {
      shocks.push({
        region,
        date: selectedDate,
        type: priceChanges.percentChange > 0 ? 'price_surge' : 'price_drop',
        magnitude: Math.abs(priceChanges.percentChange),
        severity: Math.abs(priceChanges.percentChange) > THRESHOLDS.PRICE_CHANGE * 2 ? 'high' : 'medium',
        price_change: priceChanges.percentChange,
        volatility: volatility,
        coordinates: sortedFeatures[0]?.geometry?.coordinates || null
      });
    }
  });

  return shocks;
};

/**
 * Calculate spatial weights for market connectivity
 */
export const calculateSpatialWeights = (features) => {
  if (!features?.length) return {};

  try {
    const validFeatures = validateFeatures(features);
    const weights = {};

    // Initialize weights structure
    validFeatures.forEach(feature => {
      const regionId = feature.properties.region_id;
      if (regionId) {
        weights[regionId] = {
          neighbors: [],
          weight: 0
        };
      }
    });

    // Calculate distances and determine neighbors
    validFeatures.forEach(feature1 => {
      const region1 = feature1.properties.region_id;
      if (!region1) return;

      validFeatures.forEach(feature2 => {
        const region2 = feature2.properties.region_id;
        if (!region2 || region1 === region2) return;

        const distance = turf.distance(
          turf.point(feature1.geometry.coordinates),
          turf.point(feature2.geometry.coordinates),
          { units: 'kilometers' }
        );

        if (distance <= THRESHOLDS.NEIGHBOR_THRESHOLD_KM) {
          weights[region1].neighbors.push(region2);
          weights[region1].weight += 1 / distance;
        }
      });
    });

    // Normalize weights
    Object.values(weights).forEach(regionWeights => {
      if (regionWeights.weight > 0) {
        regionWeights.weight = 1 / regionWeights.weight;
      }
    });

    return weights;
  } catch (error) {
    console.error('Error calculating spatial weights:', error);
    return {};
  }
};

// Helper Functions

export const validateFeatures = (features) => {
  if (!Array.isArray(features)) {
    throw new Error('Features must be an array');
  }

  return features.filter(feature => {
    try {
      return (
        feature &&
        feature.properties &&
        feature.geometry &&
        Array.isArray(feature.geometry.coordinates) &&
        feature.properties.region_id &&
        !isNaN(parseFloat(feature.properties.price))
      );
    } catch (error) {
      console.warn('Invalid feature detected:', error);
      return false;
    }
  });
};

export const calculateMean = (values) => {
  if (!values?.length) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

export const calculateStandardDeviation = (values) => {
  if (!values?.length) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
};

export const removeOutliers = (values) => {
  if (!values?.length) return [];
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  return values.filter(value => 
    Math.abs(value - mean) <= THRESHOLDS.MAX_OUTLIER_STDDEV * stdDev
  );
};

const calculateClusterMetrics = (flows, clusterMarkets) => {
  const relevantFlows = flows.filter(flow => 
    clusterMarkets.has(flow.source) || clusterMarkets.has(flow.target)
  );

  const totalFlow = relevantFlows.reduce((sum, flow) => 
    sum + (parseFloat(flow.flow_weight) || 0), 0
  );

  return {
    totalFlow,
    avgFlow: clusterMarkets.size ? totalFlow / clusterMarkets.size : 0,
    flowDensity: relevantFlows.length / (clusterMarkets.size * (clusterMarkets.size - 1))
  };
};

const determineMainMarket = (flows, clusterMarkets) => {
  const marketScores = new Map();
  
  flows.forEach(flow => {
    if (clusterMarkets.has(flow.source)) {
      marketScores.set(flow.source, 
        (marketScores.get(flow.source) || 0) + (flow.flow_weight || 0)
      );
    }
  });

  return Array.from(marketScores.entries())
    .sort(([, a], [, b]) => b - a)[0]?.[0] || Array.from(clusterMarkets)[0];
};

const calculatePriceChanges = (features) => {
  if (features.length < 2) return { absoluteChange: 0, percentChange: 0 };

  const latestPrice = features[features.length - 1].properties.price;
  const previousPrice = features[features.length - 2].properties.price;

  return {
    absoluteChange: latestPrice - previousPrice,
    percentChange: ((latestPrice - previousPrice) / previousPrice) * 100
  };
};

const calculateVolatility = (features) => {
  const prices = features.map(f => f.properties.price);
  return calculateStandardDeviation(prices) / calculateMean(prices) * 100;
};

const groupFeaturesByRegion = (features) => {
  const grouped = {};
  features.forEach(feature => {
    const regionId = feature.properties?.region_id;
    if (!regionId) return;
    
    if (!grouped[regionId]) {
      grouped[regionId] = [];
    }
    grouped[regionId].push(feature);
  });
  return grouped;
};

export default {
  THRESHOLDS,
  processTimeSeriesData,
  calculateMonthlyStatistics,
  computeClusters,
  detectMarketShocks,
  calculateSpatialWeights,
  validateFeatures,
  calculateMean,
  calculateStandardDeviation,
  removeOutliers
};