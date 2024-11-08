// src/utils/spatialUtils.js

import proj4 from 'proj4';
import * as turf from '@turf/turf';

// Define projections
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs';

// Initialize proj4 with the required projection
proj4.defs('UTM38N', UTM_ZONE_38N);

// Cache for transformed coordinates
const coordinateCache = new Map();
const CACHE_SIZE_LIMIT = 1000;

/**
 * Memoized coordinate transformation function.
 * Transforms coordinates from WGS84 to UTM Zone 38N.
 * Utilizes a cache to store and retrieve previously transformed coordinates.
 * 
 * @param {Array<number>} coordinates - [longitude, latitude] to transform.
 * @returns {Array<number>} Transformed [x, y] coordinates.
 */
export const transformCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new Error('Invalid coordinates format. Expected [longitude, latitude].');
  }

  const key = coordinates.join(',');

  if (coordinateCache.has(key)) {
    return coordinateCache.get(key);
  }

  const transformed = proj4(WGS84, 'UTM38N', coordinates);

  // Manage cache size
  if (coordinateCache.size >= CACHE_SIZE_LIMIT) {
    // Remove the first inserted key (FIFO)
    const firstKey = coordinateCache.keys().next().value;
    coordinateCache.delete(firstKey);
  }

  coordinateCache.set(key, transformed);

  return transformed;
};

/**
 * Compute market clusters based on flow data and spatial weights.
 * @param {Array<Object>} flows - Array of flow data. Each flow should have `source`, `target`, and `flow_weight`.
 * @param {Object} weights - Spatial weights object. Each key is a region ID, and its value is an array of neighboring region IDs.
 * @returns {Array<Object>} Array of market clusters.
 */
export const memoizedComputeClusters = (flows, weights) => {
  if (!flows?.length || !weights) return [];

  const clusters = [];
  const visited = new Set();

  /**
   * Recursive function to perform Depth-First Search (DFS) for clustering.
   * @param {string} region - Current region ID.
   * @param {Set<string>} clusterMarkets - Set of connected markets in the current cluster.
   */
  const dfs = (region, clusterMarkets) => {
    if (visited.has(region)) return;
    visited.add(region);
    clusterMarkets.add(region);

    const neighbors = weights[region] || [];
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

      // Calculate flow metrics for the cluster
      const relevantFlows = flows.filter(flow => 
        clusterMarkets.has(flow.source) || 
        clusterMarkets.has(flow.target)
      );

      const totalFlow = relevantFlows.reduce((sum, flow) => sum + (flow.flow_weight || 0), 0);
      const marketCount = clusterMarkets.size;
      const avgFlow = marketCount > 0 ? totalFlow / marketCount : 0;

      // Identify the main market (could be based on criteria, here we choose the first one)
      const mainMarket = clusterMarkets.values().next().value || '';

      clusters.push({
        mainMarket,
        connectedMarkets: clusterMarkets,
        marketCount,
        avgFlow,
        totalFlow
      });
    }
  });

  return clusters;
};

/**
 * Detect market shocks based on significant price changes.
 * @param {Array<Object>} features - Array of GeoJSON features.
 * @param {string} selectedDate - Selected date in 'YYYY-MM' format.
 * @returns {Array<Object>} Array of market shocks.
 */
export const detectMarketShocks = (features, selectedDate) => {
  if (!features) return [];

  const shocks = [];
  const volatilityThreshold = 0.05; // 5%
  const priceChangeThreshold = 0.15; // 15%

  // Group features by region
  const regionData = features.reduce((acc, feature) => {
    const region = feature.properties.region_id || feature.properties.region;
    if (!acc[region]) acc[region] = [];
    acc[region].push(feature);
    return acc;
  }, {});

  Object.entries(regionData).forEach(([region, regionFeatures]) => {
    // Sort features by date
    const sortedFeatures = regionFeatures.sort(
      (a, b) => new Date(a.properties.date) - new Date(b.properties.date)
    );

    for (let i = 1; i < sortedFeatures.length; i++) {
      const current = sortedFeatures[i];
      const previous = sortedFeatures[i - 1];
      const currentPrice = parseFloat(current.properties.price);
      const previousPrice = parseFloat(previous.properties.price);

      if (isNaN(currentPrice) || isNaN(previousPrice)) continue;

      const priceChange = (currentPrice - previousPrice) / previousPrice;
      const volatility = Math.abs(priceChange);

      if (volatility > volatilityThreshold || Math.abs(priceChange) > priceChangeThreshold) {
        shocks.push({
          region,
          date: current.properties.date,
          magnitude: volatility,
          type: priceChange > 0 ? 'surge' : 'drop',
          severity: volatility > volatilityThreshold ? 'high' : 'medium',
          coordinates: current.geometry.coordinates,
          price_change: priceChange,
          volatility,
        });
      }
    }
  });

  return shocks;
};

/**
 * Calculate spatial weights matrix by analyzing shared boundaries.
 * @param {Array<Object>} features - Array of GeoJSON features.
 * @returns {Object} Spatial weights object. Each key is a region ID, and its value is an array of neighboring region IDs.
 */
export const calculateSpatialWeights = (features) => {
  const weights = {};

  // Initialize weights with empty arrays
  features.forEach(feature => {
    const regionId = feature.properties.region_id;
    if (!regionId) return; // Skip if no region_id
    if (!weights[regionId]) {
      weights[regionId] = [];
    }
  });

  // Compare each pair of features to determine shared boundaries
  for (let i = 0; i < features.length; i++) {
    const feature1 = features[i];
    const region1 = feature1.properties.region_id;
    if (!region1) continue;

    for (let j = i + 1; j < features.length; j++) {
      const feature2 = features[j];
      const region2 = feature2.properties.region_id;
      if (!region2 || region1 === region2) continue;

      if (sharesBoundary(feature1, feature2)) {
        if (!weights[region1].includes(region2)) {
          weights[region1].push(region2);
        }
        if (!weights[region2].includes(region1)) {
          weights[region2].push(region1);
        }
      }
    }
  }

  return weights;
};

/**
 * Check if two regions share a boundary using Turf.js.
 * @param {Object} feature1 - First GeoJSON feature.
 * @param {Object} feature2 - Second GeoJSON feature.
 * @returns {boolean} True if they share a boundary, false otherwise.
 */
const sharesBoundary = (feature1, feature2) => {
  try {
    const intersection = turf.intersect(feature1, feature2);
    return !!intersection;
  } catch (error) {
    console.error('Error checking shared boundary:', error);
    return false;
  }
};
