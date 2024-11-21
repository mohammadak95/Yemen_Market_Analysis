// src/utils/marketAnalysisUtils.js

import { ANALYSIS_THRESHOLDS } from '../constants/index';
import _ from 'lodash';

/**
 * Calculate the center of mass for a GeoJSON geometry
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Object} Center coordinates {lat, lng}
 */
export const calculateCenterOfMass = (geometry) => {
  if (!geometry?.coordinates) return null;

  let points = [];
  if (geometry.type === 'Polygon') {
    points = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    points = geometry.coordinates.flatMap(poly => poly[0]);
  } else {
    return null;
  }

  const total = points.reduce((acc, [lng, lat]) => ({
    lat: acc.lat + lat,
    lng: acc.lng + lng
  }), { lat: 0, lng: 0 });

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length
  };
};

/**
 * Calculate bounding box for a GeoJSON geometry
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Object} Bounding box coordinates
 */
export const calculateBoundingBox = (geometry) => {
  if (!geometry?.coordinates) return null;

  let points = [];
  if (geometry.type === 'Polygon') {
    points = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    points = geometry.coordinates.flatMap(poly => poly[0]);
  } else {
    return null;
  }

  const bounds = points.reduce((acc, [lng, lat]) => ({
    minLat: Math.min(acc.minLat, lat),
    maxLat: Math.max(acc.maxLat, lat),
    minLng: Math.min(acc.minLng, lng),
    maxLng: Math.max(acc.maxLng, lng)
  }), {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity
  });

  return {
    southWest: { lat: bounds.minLat, lng: bounds.minLng },
    northEast: { lat: bounds.maxLat, lng: bounds.maxLng }
  };
};

/**
 * Find neighboring regions based on shared boundaries
 * @param {Object} geometry - GeoJSON geometry object
 * @param {string} regionId - Current region ID
 * @param {Object} allGeometries - All region geometries
 * @returns {Array} Array of neighboring region IDs
 */
export const findNeighboringRegions = (geometry, regionId, allGeometries) => {
  if (!geometry || !allGeometries) return [];

  const currentBounds = calculateBoundingBox(geometry);
  if (!currentBounds) return [];

  const neighbors = [];
  const buffer = 0.001; // ~100m buffer for boundary intersection

  Object.entries(allGeometries).forEach(([id, geo]) => {
    if (id === regionId) return;

    const otherBounds = calculateBoundingBox(geo);
    if (!otherBounds) return;

    // Check if bounding boxes overlap with buffer
    const overlaps = !(
      otherBounds.northEast.lat + buffer < currentBounds.southWest.lat ||
      otherBounds.southWest.lat - buffer > currentBounds.northEast.lat ||
      otherBounds.northEast.lng + buffer < currentBounds.southWest.lng ||
      otherBounds.southWest.lng - buffer > currentBounds.northEast.lng
    );

    if (overlaps) {
      neighbors.push(id);
    }
  });

  return neighbors;
};

/**
 * Calculate distance between two points
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Convert degrees to radians
const toRad = (degrees) => degrees * Math.PI / 180;

/**
 * Calculate market volatility metrics
 * @param {Array} timeSeriesData - Array of time series data points
 * @returns {Object} Volatility metrics
 */
export function calculateVolatility(timeSeriesData) {
  if (!timeSeriesData.length) return {
    garch: 0,
    traditional: 0,
    stability: 0
  };

  const latestEntry = timeSeriesData[timeSeriesData.length - 1];
  
  // Use precomputed metrics when available
  const garchVolatility = latestEntry.garch_volatility ?? 0;
  const priceStability = latestEntry.price_stability ?? 0;

  // Calculate traditional volatility as backup
  const prices = timeSeriesData.reduce((acc, d) => {
    if (d.avgUsdPrice != null) acc.push(d.avgUsdPrice);
    return acc;
  }, []);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const traditional = Math.sqrt(
    prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length
  ) / mean;

  return {
    garch: garchVolatility,
    traditional: traditional,
    stability: priceStability
  };
}

/**
 * Calculate market integration metrics
 * @param {Object} data - Spatial data object
 * @returns {Object} Integration metrics
 */
export function calculateMarketIntegration(data) {
  if (!data.market_integration) return null;

  const {
    price_correlation,
    flow_density,
    integration_score,
    accessibility
  } = data.market_integration;

  const spatialMetrics = data.spatial_autocorrelation?.global ?? {};

  return {
    correlationMatrix: price_correlation ?? {},
    flowDensity: flow_density ?? 0,
    integrationScore: integration_score ?? 0,
    spatialDependence: spatialMetrics.moran_i ?? 0,
    accessibility: accessibility ?? {},
    significance: spatialMetrics.significance ?? false
  };
}

/**
 * Calculate shock frequency
 * @param {Array} shocks - Array of shock events
 * @param {Object} timeRange - Time range object { start, end }
 * @returns {Object} Shock frequency metrics
 */
export function calculateShockFrequency(shocks, timeRange) {
  if (!Array.isArray(shocks) || shocks.length === 0) return {
    frequency: 0,
    patterns: [],
    average_magnitude: 0
  };

  const uniqueMonths = new Set(shocks.map(s => s.date.substring(0, 7)));
  const frequency = shocks.length / uniqueMonths.size;

  const patterns = {
    price_surge: shocks.filter(s => s.shock_type === 'price_surge').length,
    price_drop: shocks.filter(s => s.shock_type === 'price_drop').length,
    average_magnitude: shocks.reduce((acc, s) => acc + s.magnitude, 0) / shocks.length
  };

  return {
    frequency,
    patterns,
    average_magnitude: patterns.average_magnitude
  };
}

/**
 * Calculate cluster efficiency metrics
 * @param {Array} clusters - Array of market clusters
 * @returns {Object} Cluster efficiency metrics
 */
export function calculateClusterEfficiency(clusters) {
  if (!Array.isArray(clusters) || !clusters.length) return {
    efficiency: 0,
    coverage: 0,
    stability: 0
  };

  const metrics = clusters.reduce((acc, cluster) => ({
    efficiency: acc.efficiency + (cluster.efficiency_score ?? 0),
    coverage: acc.coverage + (cluster.market_coverage ?? 0),
    stability: acc.stability + (cluster.stability ?? 0)
  }), { efficiency: 0, coverage: 0, stability: 0 });

  const count = clusters.length;
  return {
    efficiency: metrics.efficiency / count,
    coverage: metrics.coverage / count,
    stability: metrics.stability / count
  };
}

/**
 * Summarize clusters
 * @param {Array} clusters - Array of clusters
 * @returns {Object} Cluster summary
 */
export function summarizeClusters(clusters) {
  if (!clusters.length) return null;

  return {
    count: clusters.length,
    averageSize: clusters.reduce((acc, c) => acc + c.market_count, 0) / clusters.length,
    largest: Math.max(...clusters.map((c) => c.market_count)),
    smallest: Math.min(...clusters.map((c) => c.market_count)),
  };
}

/**
 * Calculate overall market metrics
 * @param {Object} data - Spatial data object
 * @returns {Object} Market metrics
 */
export function calculateMarketMetrics(data) {
  return {
    marketCoverage: calculateCoverage(data.marketClusters),
    flowDensity: calculateFlowDensity(data.flowMaps),
    priceCorrelation: calculatePriceCorrelation(data.timeSeriesData),
    overallVolatility: calculateVolatility(data.timeSeriesData),
    overallIntegration: calculateIntegration(data.spatialAutocorrelation),
    overallShockFrequency: calculateShockFrequency(data.marketShocks, null),
    overallClusterEfficiency: calculateClusterEfficiency(data.marketClusters),
  };
}

/**
 * Validate coordinates
 * @param {Array} coordinates - [lat, lng]
 * @returns {boolean} Validation result
 */
export function validateCoordinates(coordinates) {
  if (!coordinates || !Array.isArray(coordinates)) return false;
  const [lat, lng] = coordinates;
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Calculate flow coverage
 * @param {Array} flows - Array of flow data
 * @returns {number} Number of unique markets
 */
export function calculateFlowCoverage(flows) {
  const uniqueMarkets = new Set();
  flows.forEach(flow => {
    uniqueMarkets.add(flow.source);
    uniqueMarkets.add(flow.target);
  });
  return uniqueMarkets.size;
}

/**
 * Calculate network efficiency
 * @param {Array} flows - Array of flow data
 * @returns {Object} Network efficiency metrics
 */
export function calculateNetworkEfficiency(flows) {
  const totalFlow = flows.reduce((sum, flow) => sum + flow.flow_weight, 0);
  const avgFlow = totalFlow / flows.length;
  return {
    totalFlow,
    avgFlow,
    flowCount: flows.length
  };
}

/**
 * Calculate moving average
 * @param {Array} data - Array of data points
 * @param {number} window - Window size for moving average
 * @returns {Array} Moving average data
 */
export function calculateMovingAverage(data, window) {
  return data.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const values = data.slice(start, index + 1);
    return {
      date: data[index].date,
      value: _.meanBy(values, 'value')
    };
  });
}

/**
 * Calculate trend slope using linear regression
 * @param {Array} data - Array of data points with {date, value}
 * @returns {number} Slope of the trend
 */
export function calculateTrendSlope(data) {
  const n = data.length;
  if (n < 2) return 0;

  const xMean = _.meanBy(data, (_, i) => i);
  const yMean = _.meanBy(data, 'value');

  const numerator = _.sum(data.map((point, i) => 
    (i - xMean) * (point.value - yMean)
  ));

  const denominator = _.sum(data.map((_, i) => 
    Math.pow(i - xMean, 2)
  ));

  return denominator !== 0 ? numerator / denominator : 0;
}

/**
 * Detect seasonal patterns in time series data
 * @param {Array} data - Array of data points with {date, value}
 * @returns {Object} Seasonal pattern metrics
 */
export function detectSeasonalPattern(data) {
  // Simple seasonal detection: compare averages by month
  const monthlyData = _.groupBy(data, d => d.date.getMonth());

  const monthlyAverages = _.mapValues(monthlyData, monthData => _.meanBy(monthData, 'value'));

  // Calculate standard deviation of monthly averages
  const mean = _.mean(Object.values(monthlyAverages));
  const stdDev = Math.sqrt(_.mean(Object.values(monthlyAverages).map(avg => Math.pow(avg - mean, 2))));

  // Determine if seasonality is present based on variance
  const seasonal = stdDev > 0.05 * mean; // Threshold can be adjusted

  return {
    seasonal,
    monthlyAverages,
    stdDev
  };
}

/**
 * Process correlation matrix for integration analysis
 * @param {Object} matrix - Price correlation matrix
 * @returns {Object} Processed correlation metrics
 */
export function processCorrelationMatrix(matrix) {
  const markets = Object.keys(matrix);

  // Calculate average correlation
  const averageCorrelation = _.mean(
    markets.flatMap(market => Object.values(matrix[market]))
  );

  // Count strong and weak connections
  const strongConnections = countConnections(matrix, ANALYSIS_THRESHOLDS.MARKET_INTEGRATION.HIGH);
  const weakConnections = countConnections(matrix, ANALYSIS_THRESHOLDS.MARKET_INTEGRATION.LOW);

  // Identify market clusters using threshold
  const clusters = identifyMarketClusters(matrix, ANALYSIS_THRESHOLDS.MARKET_INTEGRATION.MODERATE);

  return {
    averageCorrelation,
    strongConnections,
    weakConnections,
    clusters
  };
}

/**
 * Count connections above a certain threshold
 * @param {Object} matrix - Correlation matrix
 * @param {number} threshold - Correlation threshold
 * @returns {number} Number of connections above threshold
 */
function countConnections(matrix, threshold) {
  const markets = Object.keys(matrix);
  let count = 0;

  markets.forEach(market => {
    Object.values(matrix[market]).forEach(correlation => {
      if (correlation >= threshold) count++;
    });
  });

  // Since the matrix is symmetric, divide by 2 to get unique connections
  return count / 2;
}

/**
 * Identify market clusters based on correlation threshold
 * @param {Object} matrix - Correlation matrix
 * @param {number} threshold - Correlation threshold
 * @returns {Array} Array of clusters
 */
export function identifyMarketClusters(matrix, threshold) {
  const markets = Object.keys(matrix);
  const visited = new Set();
  const clusters = [];

  markets.forEach(market => {
    if (!visited.has(market)) {
      const cluster = [];
      const stack = [market];

      while (stack.length > 0) {
        const current = stack.pop();
        if (!visited.has(current)) {
          visited.add(current);
          cluster.push(current);

          Object.entries(matrix[current]).forEach(([neighbor, correlation]) => {
            if (correlation >= threshold && !visited.has(neighbor)) {
              stack.push(neighbor);
            }
          });
        }
      }

      if (cluster.length > 1) clusters.push(cluster);
    }
  });

  return clusters;
}

/**
 * Calculate flow-based metrics
 * @param {Array} flows - Array of flow data
 * @returns {Object} Flow metrics
 */
export function calculateFlowMetrics(flows) {
  const metrics = {
    totalFlow: _.sumBy(flows, 'total_flow'),
    averageFlow: _.meanBy(flows, 'avg_flow'),
    flowDensity: calculateFlowDensity(flows),
    directionality: analyzeFlowDirectionality(flows)
  };

  const patterns = {
    seasonal: detectFlowSeasonality(flows),
    structural: identifyStructuralPatterns(flows),
    anomalies: detectFlowAnomalies(flows)
  };

  return {
    metrics,
    patterns
  };
}

/**
 * Calculate flow density
 * @param {Array} flows - Array of flow data
 * @returns {number} Flow density metric
 */
export function calculateFlowDensity(flows) {
  if (!flows.length) return 0;
  const totalFlow = _.sumBy(flows, 'flow_weight');
  const uniqueConnections = flows.length;
  return totalFlow / uniqueConnections;
}

/**
 * Analyze flow directionality
 * @param {Array} flows - Array of flow data
 * @returns {Object} Directionality metrics
 */
export function analyzeFlowDirectionality(flows) {
  const totalFlows = flows.length;
  const directionalFlows = flows.filter(flow => flow.direction === 'uni-directional').length;
  const biDirectionalFlows = flows.filter(flow => flow.direction === 'bi-directional').length;

  return {
    totalFlows,
    directionalFlows,
    biDirectionalFlows,
    directionalPercentage: totalFlows ? (directionalFlows / totalFlows) * 100 : 0,
    biDirectionalPercentage: totalFlows ? (biDirectionalFlows / totalFlows) * 100 : 0
  };
}

/**
 * Identify structural patterns in flows
 * @param {Array} flows - Array of flow data
 * @returns {Object} Structural patterns metrics
 */
export function identifyStructuralPatterns(flows) {
  // Placeholder implementation
  // Implement actual pattern identification logic as needed
  return {
    patterns: [],
    count: 0
  };
}

/**
 * Detect anomalies in flows
 * @param {Array} flows - Array of flow data
 * @returns {Array} Array of anomalous flows
 */
export function detectFlowAnomalies(flows) {
  // Simple anomaly detection based on flow weight thresholds
  return flows.filter(flow => flow.flow_weight > ANALYSIS_THRESHOLDS.FLOW.ANOMALY_THRESHOLD);
}

/**
 * Calculate spatial metrics
 * @param {Object} spatialAutocorrelation - Spatial autocorrelation data
 * @returns {Object} Spatial metrics
 */
export function calculateSpatialMetrics(spatialAutocorrelation) {
  return {
    moranI: spatialAutocorrelation.moran_i ?? 0,
    pValue: spatialAutocorrelation['p-value'] ?? 1,
    zScore: spatialAutocorrelation.z_score ?? 0
  };
}

/**
 * Analyze internal connectivity within a cluster
 * @param {Object} cluster - Cluster data
 * @param {Array} flows - Array of flow data
 * @returns {number} Internal connectivity score
 */
export function calculateInternalConnectivity(cluster, flows) {
  const clusterFlows = flows.filter(flow => 
    cluster.markets.includes(flow.source) && 
    cluster.markets.includes(flow.target)
  );
  const totalFlow = _.sumBy(clusterFlows, 'flow_weight');
  const possibleFlows = cluster.markets.length * (cluster.markets.length - 1) / 2;
  return possibleFlows ? (totalFlow / possibleFlows) : 0;
}

/**
 * Calculate price convergence within a cluster
 * @param {Object} cluster - Cluster data
 * @param {Array} flows - Array of flow data
 * @returns {number} Price convergence score
 */
export function calculatePriceConvergence(cluster, flows) {
  const clusterFlows = flows.filter(flow => 
    cluster.markets.includes(flow.source) && 
    cluster.markets.includes(flow.target)
  );

  const priceDifferences = clusterFlows.map(flow => Math.abs(flow.source_price - flow.target_price));
  const averageDifference = priceDifferences.length ? _.mean(priceDifferences) : 0;

  return 1 / (1 + averageDifference); // Higher score for lower differences
}

/**
 * Calculate cluster stability
 * @param {Object} cluster - Cluster data
 * @returns {number} Stability score
 */
export function calculateClusterStability(cluster) {
  return cluster.stability ?? 0;
}

/**
 * Analyze spatial distribution within a cluster
 * @param {Object} cluster - Cluster data
 * @param {Array} flows - Array of flow data
 * @returns {Object} Spatial distribution metrics
 */
export function analyzeSpatialDistribution(cluster, flows) {
  const clusterFlows = flows.filter(flow => 
    cluster.markets.includes(flow.source) && 
    cluster.markets.includes(flow.target)
  );

  const distances = clusterFlows.map(flow => 
    calculateDistance(flow.source_coordinates, flow.target_coordinates)
  );

  const averageDistance = distances.length ? _.mean(distances) : 0;

  return {
    averageDistance,
    maxDistance: distances.length ? _.max(distances) : 0,
    minDistance: distances.length ? _.min(distances) : 0
  };
}

/**
 * Assess cluster stability over time
 * @param {Object} cluster - Cluster data
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {number} Stability score
 */
export function assessClusterStability(cluster, timeSeriesData) {
  // Placeholder implementation
  // Implement actual stability assessment logic as needed
  return cluster.stability ?? 0;
}

/**
 * Measure cluster resilience
 * @param {Object} cluster - Cluster data
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {number} Resilience score
 */
export function measureClusterResilience(cluster, timeSeriesData) {
  // Placeholder implementation
  // Implement actual resilience measurement logic as needed
  return cluster.resilience ?? 0;
}

/**
 * Calculate coverage based on market clusters
 * @param {Array} marketClusters - Array of market clusters
 * @returns {number} Coverage score
 */
export function calculateCoverage(marketClusters) {
  // Placeholder implementation
  // Implement actual coverage calculation logic as needed
  return marketClusters.length;
}

/**
 * Calculate system-wide volatility
 * @param {Array} shocks - Array of shock events
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {number} System-wide volatility metric
 */
export function calculateSystemVolatility(shocks, timeSeriesData) {
  if (!timeSeriesData.length) return 0;

  const volatilityMetrics = calculateVolatility(timeSeriesData);
  return volatilityMetrics.traditional;
}

/**
 * Assess market vulnerability based on shocks
 * @param {Array} shocks - Array of shock events
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {number} Market vulnerability metric
 */
export function assessMarketVulnerability(shocks, timeSeriesData) {
  if (!shocks.length) return 0;

  const impactScores = shocks.map(shock => Math.abs(shock.magnitude));
  const averageImpact = _.mean(impactScores);

  // Normalize vulnerability score (higher impact -> higher vulnerability)
  return averageImpact / 100; // Adjust denominator as needed
}

/**
 * Analyze system recovery after shocks
 * @param {Array} shocks - Array of shock events
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Object} System recovery metrics
 */
export function analyzeSystemRecovery(shocks, timeSeriesData) {
  if (!shocks.length || !timeSeriesData.length) return {
    recoveryTime: 0,
    recoveryRate: 0
  };

  // Placeholder implementation
  // Implement actual recovery analysis logic as needed
  return {
    recoveryTime: 0, // e.g., average time to recover from shocks
    recoveryRate: 0  // e.g., rate at which markets recover
  };
}

/**
 * Analyze recovery patterns after shocks
 * @param {Array} shocks - Array of shock events
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Object} Recovery patterns metrics
 */
export function analyzeRecoveryPatterns(shocks, timeSeriesData) {
  // Placeholder implementation
  // Implement actual recovery patterns analysis logic as needed
  return {
    patternType: null,
    effectiveness: 0
  };
}

/**
 * Analyze shock propagation across regions
 * @param {Array} shocks - Array of shock events
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Object} Shock propagation metrics
 */
export function analyzeShockPropagation(shocks, timeSeriesData) {
  // Placeholder implementation
  // Implement actual shock propagation analysis logic as needed
  return {
    propagationSpeed: 0,
    affectedRegions: []
  };
}

/**
 * Detect flow seasonality
 * @param {Array} flows - Array of flow data
 * @returns {Object} Flow seasonality metrics
 */
export function detectFlowSeasonality(flows) {
  // Placeholder implementation
  // Implement actual seasonality detection logic as needed
  return {
    seasonal: false,
    pattern: null,
    strength: 0
  };
}

/**
 * Calculate overall integration score
 * @param {Object} metrics - Integration metrics
 * @returns {number} Overall integration score
 */
export function calculateOverallIntegration(metrics) {
  const { correlationMatrix, flowMetrics, spatialMetrics } = metrics;

  const correlationScore = metrics.averageCorrelation || 0;
  const flowDensity = flowMetrics.flowDensity || 0;
  const spatialDependence = spatialMetrics.moranI || 0;

  // Weighted sum of metrics
  const weights = {
    correlation: 0.4,
    flowDensity: 0.3,
    spatialDependence: 0.3
  };

  return (correlationScore * weights.correlation) +
         (flowDensity * weights.flowDensity) +
         (spatialDependence * weights.spatialDependence);
}

/**
 * Analyze efficiency within market clusters
 * @param {Array} clusters - Array of market clusters
 * @param {Array} flows - Array of flow data
 * @returns {Array} Clusters with efficiency metrics
 */
export function analyzeEfficiency(clusters, flows) {
  return clusters.map(cluster => ({
    ...cluster,
    metrics: {
      internalConnectivity: calculateInternalConnectivity(cluster, flows),
      marketCoverage: calculateClusterCoverage(cluster),
      priceConvergence: calculatePriceConvergence(cluster, flows),
      stability: calculateClusterStability(cluster)
    },
    spatialMetrics: analyzeSpatialDistribution(cluster, flows)
  }));
}

/**
 * Analyze cluster dynamics over time
 * @param {Array} clusters - Array of market clusters
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Array} Clusters with dynamics metrics
 */
export function calculateClusterDynamics(clusters, timeSeriesData) {
  return clusters.map(cluster => ({
    ...cluster,
    dynamics: {
      stability: assessClusterStability(cluster, timeSeriesData),
      evolution: trackClusterEvolution(cluster, timeSeriesData),
      resilience: measureClusterResilience(cluster, timeSeriesData)
    }
  }));
}

/**
 * Track cluster evolution over time
 * @param {Object} cluster - Cluster data
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Object} Evolution metrics
 */
export function trackClusterEvolution(cluster, timeSeriesData) {
  // Placeholder implementation
  // Implement actual evolution tracking logic as needed
  return {
    growthRate: 0,
    contractionRate: 0,
    expansionAreas: []
  };
}

/**
 * Calculate market coverage based on clusters
 * @param {Object} cluster - Cluster data
 * @returns {number} Coverage score
 */
export function calculateClusterCoverage(cluster) {
  return cluster.market_coverage ?? 0;
}

/**
 * Calculate price correlation metrics
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Object} Price correlation metrics
 */
export function calculatePriceCorrelation(timeSeriesData) {
  // Placeholder implementation
  // Implement actual correlation calculation logic as needed
  return {
    averageCorrelation: 0,
    highCorrelationPairs: []
  };
}

/**
 * Calculate overall system integration score
 * @param {Object} metrics - Integration metrics
 * @returns {number} System integration score
 */
export function calculateSystemIntegrationScore(metrics) {
  const { averageCorrelation, flowDensity, spatialDependence } = metrics;

  // Assign weights to each metric
  const weights = {
    averageCorrelation: 0.4,
    flowDensity: 0.3,
    spatialDependence: 0.3
  };

  return (averageCorrelation * weights.averageCorrelation) +
         (flowDensity * weights.flowDensity) +
         (spatialDependence * weights.spatialDependence);
}

/**
 * Main function to calculate visualization metrics based on the mode
 * @param {Object} data - Spatial data object
 * @param {string} visualizationMode - Current visualization mode
 * @param {string} selectedCommodity - Selected commodity
 * @param {string} selectedDate - Selected date
 * @returns {Object} Visualization metrics
 */
export function calculateVisualizationMetrics(data, visualizationMode, selectedCommodity, selectedDate) {
  switch (visualizationMode.toLowerCase()) {
    case 'prices':
      return calculatePricesMetrics(data, selectedCommodity, selectedDate);
    case 'integration':
      return calculateIntegrationMetrics(data);
    case 'clusters':
      return calculateClustersMetrics(data, selectedDate);
    case 'shocks':
      return calculateShocksMetrics(data, selectedDate);
    default:
      throw new Error(`Unsupported visualization mode: ${visualizationMode}`);
  }
}

/**
 * Calculate metrics for 'prices' visualization mode
 * @param {Object} data - Spatial data object
 * @param {string} selectedCommodity - Selected commodity
 * @param {string} selectedDate - Selected date
 * @returns {Object} Prices visualization metrics
 */
export function calculatePricesMetrics(data, selectedCommodity, selectedDate) {
  const filteredTimeSeries = data.timeSeriesData.filter(d => 
    d.commodity === selectedCommodity && d.month === selectedDate
  );

  const processedData = processTimeSeries(data.timeSeriesData, [new Date(selectedDate)]);

  const trends = calculateTrends(processedData.timeSeriesData);
  const volatility = calculateVolatility(processedData.timeSeriesData);
  const seasonality = detectSeasonalPattern(processedData.timeSeriesData);

  return {
    mode: 'prices',
    trends,
    volatility,
    seasonality
  };
}

/**
 * Process time series data based on time range
 * @param {Array} timeSeriesData - Array of time series data
 * @param {Array} timeRange - Array of Date objects [start, end]
 * @returns {Object} Processed time series data
 */
export function processTimeSeries(timeSeriesData, timeRange = null) {
  let processedData = timeSeriesData.map(d => ({
    date: new Date(d.month),
    value: d.avgUsdPrice,
    volatility: d.volatility,
    conflictIntensity: d.conflict_intensity
  }));

  if (timeRange) {
    const [start, end] = timeRange;
    processedData = processedData.filter(d => 
      d.date >= start && d.date <= end
    );
  }

  return { timeSeriesData: processedData };
}

/**
 * Calculate trends in time series data
 * @param {Array} timeSeriesData - Array of processed time series data
 * @returns {Object} Trend metrics
 */
export function calculateTrends(timeSeriesData) {
  if (!timeSeriesData.length) return null;

  const prices = timeSeriesData.map(d => ({
    date: d.date,
    value: d.value
  }));

  // Sort by date
  prices.sort((a, b) => a.date - b.date);

  // Calculate moving averages
  const shortTermMA = calculateMovingAverage(prices, 3);
  const longTermMA = calculateMovingAverage(prices, 12);

  // Calculate trend slopes
  const shortTermSlope = calculateTrendSlope(shortTermMA);
  const longTermSlope = calculateTrendSlope(longTermMA);

  // Calculate volatility
  const volatilityMetrics = calculateVolatility(timeSeriesData);

  // Detect seasonality
  const seasonalityMetrics = detectSeasonalPattern(timeSeriesData);

  return {
    shortTermSlope,
    longTermSlope,
    volatility: volatilityMetrics,
    seasonality: seasonalityMetrics
  };
}

/**
 * Calculate metrics for 'integration' visualization mode
 * @param {Object} data - Spatial data object
 * @returns {Object} Integration visualization metrics
 */
export function calculateIntegrationMetrics(data) {
  const integrationMetrics = calculateMarketIntegration(data);
  const flowMetrics = calculateFlowMetrics(data.flowMaps);
  const spatialMetrics = calculateSpatialMetrics(data.spatialAutocorrelation);

  const overallIntegration = calculateOverallIntegration({
    correlationMatrix: integrationMetrics.correlationMatrix,
    flowMetrics,
    spatialMetrics
  });

  const enhancedIntegrationScore = calculateEnhancedIntegrationScore(integrationMetrics);

  return {
    mode: 'integration',
    integrationMetrics,
    flowMetrics,
    spatialMetrics,
    overallIntegration,
    enhancedIntegrationScore
  };
}

/**
 * Calculate metrics for 'clusters' visualization mode
 * @param {Object} data - Spatial data object
 * @param {string} selectedDate - Selected date
 * @returns {Object} Clusters visualization metrics
 */
export function calculateClustersMetrics(data, selectedDate) {
  const filteredClusters = data.marketClusters.filter(cluster => cluster.date === selectedDate);
  const analyzedClusters = analyzeEfficiency(filteredClusters, data.flowMaps);
  const dynamics = calculateClusterDynamics(analyzedClusters, data.timeSeriesData);

  return {
    mode: 'clusters',
    clusters: dynamics
  };
}

/**
 * Calculate metrics for 'shocks' visualization mode
 * @param {Object} data - Spatial data object
 * @param {string} selectedDate - Selected date
 * @returns {Object} Shocks visualization metrics
 */
export function calculateShocksMetrics(data, selectedDate) {
  const filteredShocks = data.marketShocks.filter(shock => shock.date === selectedDate);
  const patterns = analyzePatterns(filteredShocks, data.timeSeriesData);
  const systemImpact = calculateSystemwideImpact(filteredShocks, data.timeSeriesData);

  return {
    mode: 'shocks',
    patterns,
    systemImpact
  };
}

/**
 * Analyze patterns in shocks data
 * @param {Array} shocks - Array of shock events
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Object} Shocks patterns metrics
 */
export function analyzePatterns(shocks, timeSeriesData) {
  const groupedShocks = _.groupBy(shocks, 'region');

  const patterns = _.mapValues(groupedShocks, regionShocks => ({
    frequency: calculateShockFrequency(regionShocks, null),
    magnitude: calculateAverageMagnitude(regionShocks),
    recovery: analyzeRecoveryPatterns(regionShocks, timeSeriesData),
    propagation: analyzeShockPropagation(regionShocks, timeSeriesData)
  }));

  return patterns;
}

/**
 * Calculate average magnitude of shocks
 * @param {Array} shocks - Array of shock events
 * @returns {number} Average magnitude
 */
export function calculateAverageMagnitude(shocks) {
  if (!shocks.length) return 0;
  const totalMagnitude = _.sumBy(shocks, 'magnitude');
  return totalMagnitude / shocks.length;
}

/**
 * Calculate system-wide impact based on shocks
 * @param {Array} shocks - Array of shock events
 * @param {Array} timeSeriesData - Array of time series data
 * @returns {Object} System-wide impact metrics
 */
export function calculateSystemwideImpact(shocks, timeSeriesData) {
  const overallVolatility = calculateSystemVolatility(shocks, timeSeriesData);
  const marketVulnerability = assessMarketVulnerability(shocks, timeSeriesData);
  const recoveryMetrics = analyzeSystemRecovery(shocks, timeSeriesData);

  return {
    overallVolatility,
    marketVulnerability,
    recoveryMetrics
  };
}

export function calculatePriceTrend(timeSeriesData) {
  const prices = timeSeriesData.map(d => d.usdprice).filter(p => p != null);
  const dates = timeSeriesData.map(d => new Date(d.date).getTime());
  if (prices.length !== dates.length || prices.length === 0) return null;

  const n = prices.length;
  const sumX = dates.reduce((a, b) => a + b, 0);
  const sumY = prices.reduce((a, b) => a + b, 0);
  const sumXY = dates.reduce((sum, x, i) => sum + x * prices[i], 0);
  const sumXX = dates.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function detectSeasonality(timeSeriesData) {
  const monthlyData = _.groupBy(timeSeriesData, d => new Date(d.date).getMonth());
  const monthlyAverages = _.mapValues(monthlyData, data => _.meanBy(data, 'usdprice'));

  const mean = _.mean(Object.values(monthlyAverages));
  const stdDev = Math.sqrt(_.mean(Object.values(monthlyAverages).map(avg => Math.pow(avg - mean, 2))));

  return { seasonal: stdDev > 0.05 * mean, monthlyAverages, stdDev };
}

export function detectOutliers(timeSeriesData) {
  const prices = timeSeriesData.map(d => d.usdprice).filter(p => p != null);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length);

  return timeSeriesData.filter(d => Math.abs(d.usdprice - mean) > 2 * stdDev);
}