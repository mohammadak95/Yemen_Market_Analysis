// src/utils/spatialUtils.js

import proj4 from 'proj4';

// Cache for transformed coordinates
const coordinateCache = new Map();
const CACHE_SIZE_LIMIT = 1000;

// Define projections
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs';

// Initialize proj4 with the required projection
proj4.defs('UTM38N', UTM_ZONE_38N);

// Memoized coordinate transformation
export const transformCoordinates = (coordinates) => {
  const cacheKey = JSON.stringify(coordinates);
  
  if (coordinateCache.has(cacheKey)) {
    return coordinateCache.get(cacheKey);
  }

  let result;
  if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
    result = coordinates.map(ring => ring.map(coord => transformCoordinates(coord)));
  } else if (Array.isArray(coordinates[0])) {
    result = coordinates.map(coord => transformCoordinates(coord));
  } else {
    try {
      const [x, y] = coordinates;
      const [lon, lat] = proj4('UTM38N', 'EPSG:4326', [x, y]);
      result = [lat, lon];
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      result = coordinates;
    }
  }

  // Manage cache size
  if (coordinateCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = coordinateCache.keys().next().value;
    coordinateCache.delete(firstKey);
  }
  
  coordinateCache.set(cacheKey, result);
  return result;
};

// Use WeakMap for cluster caching to avoid memory leaks
const clusterCache = new WeakMap();

/**
 * Compute market clusters based on flow data and spatial weights
 */
export const memoizedComputeClusters = (flows, weights) => {
  if (!flows || !weights) return [];
  
  const cacheKey = { flows, weights };
  if (clusterCache.has(cacheKey)) {
    return clusterCache.get(cacheKey);
  }

  const clusters = new Map();
  const visited = new Set();

  const addToCluster = (region, cluster) => {
    if (visited.has(region)) return;
    visited.add(region);
    cluster.connectedMarkets.add(region);

    const neighbors = weights[region]?.neighbors || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        addToCluster(neighbor, cluster);
      }
    });
  };

  Object.keys(weights).forEach(region => {
    if (!visited.has(region)) {
      const cluster = {
        mainMarket: region,
        connectedMarkets: new Set(),
        avgFlow: 0,
        totalFlow: 0
      };

      addToCluster(region, cluster);
      clusters.set(region, cluster);
    }
  });

  clusterCache.set(cacheKey, clusters);
  return Array.from(clusters.values());
};

/**
 * Detect market shocks based on price changes and volatility
 */
export const detectMarketShocks = (features, selectedDate) => {
  if (!features) return [];

  const shocks = [];
  const volatilityThreshold = 0.05;
  const priceChangeThreshold = 0.15;

  const regionData = features.reduce((acc, feature) => {
    const region = feature.properties.region_id || feature.properties.region;
    if (!acc[region]) acc[region] = [];
    acc[region].push(feature);
    return acc;
  }, {});

  Object.entries(regionData).forEach(([region, features]) => {
    const sortedFeatures = features.sort(
      (a, b) => new Date(a.properties.date) - new Date(b.properties.date)
    );

    for (let i = 1; i < sortedFeatures.length; i++) {
      const current = sortedFeatures[i];
      const previous = sortedFeatures[i - 1];
      const currentPrice = parseFloat(current.properties.price);
      const previousPrice = parseFloat(previous.properties.price);

      if (!currentPrice || !previousPrice) continue;

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
          volatility
        });
      }
    }
  });

  return shocks;
};

/**
 * Calculate spatial weights matrix
 */
export const calculateSpatialWeights = (features) => {
  if (!features) return {};

  const weights = {};
  
  // Initialize weights object with features
  features.forEach(feature => {
    const regionId = feature.properties.region_id;
    if (!weights[regionId]) {
      weights[regionId] = {
        neighbors: [],
        geometry: feature.geometry,
        properties: feature.properties
      };
    }
  });

  // Calculate neighbors based on shared boundaries
  features.forEach(feature1 => {
    const region1 = feature1.properties.region_id;
    features.forEach(feature2 => {
      const region2 = feature2.properties.region_id;
      if (region1 !== region2 && sharesBoundary(feature1, feature2)) {
        if (!weights[region1].neighbors.includes(region2)) {
          weights[region1].neighbors.push(region2);
        }
      }
    });
  });

  return weights;
};

// Helper function to check if two regions share a boundary
const sharesBoundary = (feature1, feature2) => {
  // Simple implementation - can be enhanced with more sophisticated spatial analysis
  const coords1 = feature1.geometry.coordinates[0];
  const coords2 = feature2.geometry.coordinates[0];

  for (let i = 0; i < coords1.length; i++) {
    for (let j = 0; j < coords2.length; j++) {
      if (
        Math.abs(coords1[i][0] - coords2[j][0]) < 0.001 &&
        Math.abs(coords1[i][1] - coords2[j][1]) < 0.001
      ) {
        return true;
      }
    }
  }
  return false;
};