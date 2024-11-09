import proj4 from 'proj4';
import * as turf from '@turf/turf';

// Constants
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs';
const CACHE_SIZE_LIMIT = 1000;
const THRESHOLDS = {
  VOLATILITY: 0.05,  // 5%
  PRICE_CHANGE: 0.15, // 15%
  MIN_DATA_POINTS: 3,
  MAX_OUTLIER_STDDEV: 3,
  MIN_CLUSTER_SIZE: 2
};

// Initialize projections
proj4.defs('UTM38N', UTM_ZONE_38N);
const coordinateCache = new Map();

/**
 * Validate and sanitize GeoJSON features
 * @param {Array<Object>} features - Array of GeoJSON features
 * @returns {Array<Object>} Cleaned features
 */
const validateFeatures = (features) => {
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

/**
 * Process time series data from GeoJSON features
 * @param {Array<Object>} features - Array of GeoJSON features
 * @param {string} commodity - Selected commodity
 * @returns {Array<Object>} Processed time series data
 */
export const processTimeSeriesData = (features, commodity) => {
  if (!features || !Array.isArray(features) || !commodity) {
    return [];
  }

  const validFeatures = validateFeatures(features);
  if (validFeatures.length === 0) return [];

  try {
    // Group features by month
    const monthlyData = validFeatures.reduce((acc, feature) => {
      const { properties } = feature;
      if (!properties?.date) return acc;

      const date = new Date(properties.date);
      if (isNaN(date.getTime())) return acc;

      const month = date.toISOString().slice(0, 7);
      
      if (!acc[month]) {
        acc[month] = {
          prices: [],
          conflictIntensity: [],
          usdPrices: [],
          count: 0
        };
      }

      // Validate and add numerical values
      if (!isNaN(properties.price)) {
        acc[month].prices.push(properties.price);
      }
      if (!isNaN(properties.conflict_intensity)) {
        acc[month].conflictIntensity.push(properties.conflict_intensity);
      }
      if (!isNaN(properties.usdprice)) {
        acc[month].usdPrices.push(properties.usdprice);
      }
      
      acc[month].count++;
      return acc;
    }, {});

    // Calculate statistics for each month
    return Object.entries(monthlyData)
      .filter(([_, data]) => data.count >= THRESHOLDS.MIN_DATA_POINTS)
      .map(([month, data]) => {
        const stats = calculateMonthlyStatistics(data);
        return {
          month,
          ...stats,
          sampleSize: data.count
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

  } catch (error) {
    console.error('Error processing time series data:', error);
    return [];
  }
};

/**
 * Calculate statistics for monthly data
 * @param {Object} data - Monthly data object
 * @returns {Object} Calculated statistics
 */
const calculateMonthlyStatistics = (data) => {
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
 * Enhanced coordinate transformation with validation and error handling
 */
export const transformCoordinates = (coordinates) => {
  try {
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || 
        coordinates.some(coord => typeof coord !== 'number')) {
      throw new Error('Invalid coordinates format');
    }

    const key = coordinates.join(',');
    if (coordinateCache.has(key)) {
      return coordinateCache.get(key);
    }

    const transformed = proj4(WGS84, 'UTM38N', coordinates);
    
    if (coordinateCache.size >= CACHE_SIZE_LIMIT) {
      const firstKey = coordinateCache.keys().next().value;
      coordinateCache.delete(firstKey);
    }

    coordinateCache.set(key, transformed);
    return transformed;

  } catch (error) {
    console.error('Coordinate transformation error:', error);
    return coordinates; // Return original coordinates as fallback
  }
};

/**
 * Enhanced market cluster computation with validation and error handling
 */
export const memoizedComputeClusters = (flows, weights) => {
  if (!flows?.length || !weights || typeof weights !== 'object') {
    return [];
  }

  try {
    const clusters = [];
    const visited = new Set();

    const dfs = (region, clusterMarkets) => {
      if (!region || visited.has(region)) return;
      
      visited.add(region);
      clusterMarkets.add(region);

      const neighbors = weights[region]?.filter(Boolean) || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, clusterMarkets);
        }
      });
    };

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

  } catch (error) {
    console.error('Error computing clusters:', error);
    return [];
  }
};

/**
 * Enhanced market shock detection with improved statistical analysis
 */
export const detectMarketShocks = (features, selectedDate) => {
  if (!features?.length || !selectedDate) return [];

  try {
    const validFeatures = validateFeatures(features);
    const shocks = [];

    // Group and analyze by region
    const regionData = groupFeaturesByRegion(validFeatures);

    Object.entries(regionData).forEach(([region, regionFeatures]) => {
      const sortedFeatures = sortFeaturesByDate(regionFeatures);
      const shocksForRegion = analyzeRegionShocks(region, sortedFeatures);
      shocks.push(...shocksForRegion);
    });

    return shocks;

  } catch (error) {
    console.error('Error detecting market shocks:', error);
    return [];
  }
};

/**
 * Enhanced spatial weights calculation with validation
 */
export const calculateSpatialWeights = (features) => {
  if (!features?.length) return {};

  try {
    const validFeatures = validateFeatures(features);
    const weights = initializeWeights(validFeatures);

    // Calculate weights using parallel processing for large datasets
    if (validFeatures.length > 1000) {
      return calculateWeightsParallel(validFeatures);
    }

    return calculateWeightsSequential(validFeatures);

  } catch (error) {
    console.error('Error calculating spatial weights:', error);
    return {};
  }
};

// Utility Functions

const calculateMean = (values) => {
  if (!values?.length) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateStandardDeviation = (values) => {
  if (!values?.length) return null;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
};

const removeOutliers = (values) => {
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

export {
  THRESHOLDS,
  validateFeatures,
  calculateMean,
  calculateStandardDeviation,
  removeOutliers
};