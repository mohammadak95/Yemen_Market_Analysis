// src/utils/dataTransformations.js

import _ from 'lodash';
import { validateCoordinates } from './spatialUtils';

/**
 * Transform price data for visualization
 * @param {Array} timeSeriesData - Raw time series data
 * @returns {Object} Transformed price data
 */
export const transformPriceData = (timeSeriesData) => {
  if (!Array.isArray(timeSeriesData)) return null;

  try {
    const byRegion = _.groupBy(timeSeriesData, 'region');
    
    return Object.entries(byRegion).reduce((acc, [region, data]) => {
      const prices = data.map(d => ({
        date: d.month,
        price: validateNumber(d.usdPrice),
        conflict: validateNumber(d.conflictIntensity)
      }));

      acc[region] = {
        prices,
        trend: calculateTrend(prices),
        statistics: calculatePriceStatistics(prices)
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error transforming price data:', error);
    return null;
  }
};

/**
 * Calculate integration metrics
 * @param {Object} marketIntegration - Raw market integration data
 * @returns {Object} Calculated integration metrics
 */
export const calculateIntegrationMetrics = (marketIntegration) => {
  if (!marketIntegration) return null;

  try {
    const { price_correlation, flow_density, accessibility } = marketIntegration;

    return {
      correlationMatrix: normalizeCorrelationMatrix(price_correlation),
      flowDensity: validateNumber(flow_density),
      accessibility: validateAccessibility(accessibility),
      summary: {
        averageCorrelation: calculateAverageCorrelation(price_correlation),
        marketCoverage: calculateMarketCoverage(accessibility),
        integrationScore: calculateIntegrationScore(price_correlation, flow_density)
      }
    };
  } catch (error) {
    console.error('Error calculating integration metrics:', error);
    return null;
  }
};

/**
 * Process cluster data for visualization
 * @param {Array} clusters - Raw cluster data
 * @returns {Object} Processed cluster data
 */
export const processClusterData = (clusters) => {
  if (!Array.isArray(clusters)) return null;

  try {
    return clusters.map(cluster => ({
      id: cluster.cluster_id,
      mainMarket: cluster.main_market,
      markets: cluster.connected_markets || [],
      metrics: {
        efficiency: validateNumber(cluster.metrics?.efficiency),
        connectivity: validateNumber(cluster.metrics?.internal_connectivity),
        coverage: validateNumber(cluster.metrics?.market_coverage),
        stability: validateNumber(cluster.metrics?.stability)
      },
      spatialProperties: calculateSpatialProperties(cluster)
    }));
  } catch (error) {
    console.error('Error processing cluster data:', error);
    return null;
  }
};

/**
 * Analyze shock data for visualization
 * @param {Array} shocks - Raw shock data
 * @returns {Object} Analyzed shock data
 */
export const analyzeShockData = (shocks) => {
  if (!Array.isArray(shocks)) return null;

  try {
    const byRegion = _.groupBy(shocks, 'region');
    
    return Object.entries(byRegion).reduce((acc, [region, data]) => {
      acc[region] = {
        shocks: data.map(transformShock),
        analysis: analyzeShockPatterns(data),
        summary: calculateShockSummary(data)
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error analyzing shock data:', error);
    return null;
  }
};

/**
 * Transform geometry data
 * @param {Object} geometry - Raw geometry data
 * @returns {Object} Transformed geometry data
 */
export const transformGeometryData = (geometry) => {
  if (!geometry) return null;

  try {
    return {
      points: (geometry.points || []).map(transformPoint),
      polygons: (geometry.polygons || []).map(transformPolygon),
      unified: transformUnifiedGeometry(geometry.unified)
    };
  } catch (error) {
    console.error('Error transforming geometry data:', error);
    return null;
  }
};

// Helper functions

const validateNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && isFinite(num) ? num : 0;
};

const calculateTrend = (prices) => {
  if (!prices?.length) return null;
  
  const xValues = Array.from({ length: prices.length }, (_, i) => i);
  const yValues = prices.map(p => p.price);
  
  const { slope, intercept } = linearRegression(xValues, yValues);
  
  return {
    slope,
    intercept,
    direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
  };
};

const calculatePriceStatistics = (prices) => {
  if (!prices?.length) return null;
  
  const values = prices.map(p => p.price).filter(p => !isNaN(p));
  
  return {
    mean: _.mean(values),
    median: _.sortBy(values)[Math.floor(values.length / 2)],
    std: calculateStandardDeviation(values),
    min: _.min(values),
    max: _.max(values)
  };
};

const normalizeCorrelationMatrix = (matrix) => {
  if (!matrix) return {};
  
  return Object.entries(matrix).reduce((acc, [region, correlations]) => {
    acc[region] = Object.entries(correlations).reduce((inner, [target, value]) => {
      inner[target] = validateNumber(value);
      return inner;
    }, {});
    return acc;
  }, {});
};

const validateAccessibility = (accessibility) => {
  if (!accessibility) return {};
  
  return Object.entries(accessibility).reduce((acc, [region, value]) => {
    acc[region] = validateNumber(value);
    return acc;
  }, {});
};

const calculateAverageCorrelation = (correlations) => {
  if (!correlations) return 0;
  
  const values = Object.values(correlations).flatMap(c => 
    Object.values(c).filter(v => !isNaN(v))
  );
  
  return values.length ? _.mean(values) : 0;
};

const calculateMarketCoverage = (accessibility) => {
  if (!accessibility) return 0;
  
  const values = Object.values(accessibility).filter(v => !isNaN(v));
  return values.length ? _.mean(values) : 0;
};

const calculateIntegrationScore = (correlations, flowDensity) => {
  const avgCorrelation = calculateAverageCorrelation(correlations);
  return (avgCorrelation + validateNumber(flowDensity)) / 2;
};

const calculateSpatialProperties = (cluster) => {
  if (!cluster?.connected_markets?.length) return null;
  
  const coordinates = cluster.connected_markets
    .map(market => validateCoordinates(market))
    .filter(Boolean);
  
  return {
    center: calculateCentroid(coordinates),
    boundingBox: calculateBoundingBox(coordinates),
    dispersion: calculateDispersion(coordinates)
  };
};

const transformShock = (shock) => ({
  date: shock.date,
  type: shock.shock_type,
  magnitude: validateNumber(shock.magnitude),
  priceChange: {
    previous: validateNumber(shock.previous_price),
    current: validateNumber(shock.current_price)
  }
});

const analyzeShockPatterns = (shocks) => {
  const byType = _.groupBy(shocks, 'shock_type');
  
  return Object.entries(byType).reduce((acc, [type, data]) => {
    acc[type] = {
      count: data.length,
      averageMagnitude: _.meanBy(data, 'magnitude'),
      frequency: data.length / shocks.length
    };
    return acc;
  }, {});
};

const calculateShockSummary = (shocks) => ({
  totalShocks: shocks.length,
  averageMagnitude: _.meanBy(shocks, 'magnitude'),
  maxMagnitude: _.maxBy(shocks, 'magnitude')?.magnitude || 0,
  types: _.uniq(shocks.map(s => s.shock_type))
});

const transformPoint = (point) => ({
  ...point,
  coordinates: validateCoordinates(point.coordinates),
  properties: {
    ...point.properties,
    normalizedName: point.properties?.normalizedName || '',
    region_id: point.properties?.region_id || ''
  }
});

const transformPolygon = (polygon) => ({
  ...polygon,
  geometry: {
    ...polygon.geometry,
    coordinates: validatePolygonCoordinates(polygon.geometry?.coordinates)
  },
  properties: {
    ...polygon.properties,
    normalizedName: polygon.properties?.normalizedName || '',
    region_id: polygon.properties?.region_id || ''
  }
});

const transformUnifiedGeometry = (unified) => {
  if (!unified) return null;
  
  return {
    type: unified.type || 'FeatureCollection',
    features: (unified.features || []).map(transformPolygon),
    properties: unified.properties || {}
  };
};

const validatePolygonCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) return [];
  return coordinates.map(ring => 
    Array.isArray(ring) ? ring.map(coord => 
      validateCoordinates(coord)
    ) : []
  );
};

const calculateCentroid = (coordinates) => {
  if (!coordinates?.length) return null;
  
  const sum = coordinates.reduce((acc, coord) => ({
    x: acc.x + coord[0],
    y: acc.y + coord[1]
  }), { x: 0, y: 0 });
  
  return [sum.x / coordinates.length, sum.y / coordinates.length];
};

const calculateBoundingBox = (coordinates) => {
  if (!coordinates?.length) return null;
  
  return coordinates.reduce((box, coord) => ({
    minX: Math.min(box.minX, coord[0]),
    maxX: Math.max(box.maxX, coord[0]),
    minY: Math.min(box.minY, coord[1]),
    maxY: Math.max(box.maxY, coord[1])
  }), {
    minX: coordinates[0][0],
    maxX: coordinates[0][0],
    minY: coordinates[0][1],
    maxY: coordinates[0][1]
  });
};

const calculateDispersion = (coordinates) => {
  if (!coordinates?.length) return 0;
  
  const centroid = calculateCentroid(coordinates);
  const distances = coordinates.map(coord => 
    Math.sqrt(
      Math.pow(coord[0] - centroid[0], 2) + 
      Math.pow(coord[1] - centroid[1], 2)
    )
  );
  
  return _.mean(distances);
};

const calculateStandardDeviation = (values) => {
  const mean = _.mean(values);
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  return Math.sqrt(_.mean(squareDiffs));
};

const linearRegression = (x, y) => {
  const n = x.length;
  const sumX = _.sum(x);
  const sumY = _.sum(y);
  const sumXY = _.sum(x.map((xi, i) => xi * y[i]));
  const sumXX = _.sum(x.map(xi => xi * xi));
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
};

// Export helper functions for testing
export const utils = {
  validateNumber,
  calculateTrend,
  calculatePriceStatistics,
  normalizeCorrelationMatrix,
  validateAccessibility,
  calculateAverageCorrelation,
  calculateMarketCoverage,
  calculateIntegrationScore,
  calculateSpatialProperties,
  transformShock,
  analyzeShockPatterns,
  calculateShockSummary,
  transformPoint,
  transformPolygon,
  transformUnifiedGeometry,
  validatePolygonCoordinates,
  calculateCentroid,
  calculateBoundingBox,
  calculateDispersion,
  calculateStandardDeviation,
  linearRegression
};
