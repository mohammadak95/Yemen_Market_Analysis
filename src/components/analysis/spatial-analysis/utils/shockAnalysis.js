// src/components/analysis/spatial-analysis/utils/shockAnalysis.js

import { backgroundMonitor } from '../../../../utils/backgroundMonitor';
import { DEBUG_SHOCK_ANALYSIS } from '../../../../utils/shockAnalysisDebug';

/**
 * Analyze market shocks from time series data
 * @param {Array} timeSeriesData - Array of time series data points
 * @param {number} threshold - Shock detection threshold
 * @returns {Array} Array of detected shocks
 */
export const analyzeMarketShocks = (timeSeriesData, threshold = 0.1) => {
  const metric = backgroundMonitor.startMetric('market-shock-analysis');

  try {
    if (!Array.isArray(timeSeriesData)) {
      throw new Error('Invalid time series data');
    }

    // Group data by region
    const dataByRegion = timeSeriesData.reduce((acc, data) => {
      if (!data.region || typeof data.usdPrice !== 'number' || !data.month) return acc;
      
      if (!acc[data.region]) {
        acc[data.region] = {
          timeSeries: [],
          meanPrice: 0,
          stdDev: 0
        };
      }
      
      acc[data.region].timeSeries.push({
        date: data.month,
        price: data.usdPrice,
        conflictIntensity: data.conflictIntensity || 0
      });
      return acc;
    }, {});

    // Calculate regional statistics
    Object.values(dataByRegion).forEach(region => {
      const prices = region.timeSeries.map(d => d.price);
      region.meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      region.stdDev = calculateStandardDeviation(prices);
    });

    const shocks = [];

    // Analyze each region's time series
    Object.entries(dataByRegion).forEach(([region, data]) => {
      const sortedData = data.timeSeries.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Use fixed window size for consistency
      const WINDOW_SIZE = 3;
      
      for (let i = WINDOW_SIZE; i < sortedData.length; i++) {
        const currentPrice = sortedData[i].price;
        const windowPrices = sortedData.slice(i - WINDOW_SIZE, i).map(d => d.price);
        const baselinePrice = calculateRobustBaseline(windowPrices);
        
        // Calculate price change
        const priceChange = (currentPrice - baselinePrice) / baselinePrice;
        
        // Detect shocks
        if (Math.abs(priceChange) >= threshold) {
          const shock = {
            region,
            date: sortedData[i].date + '-01', // Add day for consistent format
            magnitude: Math.abs(priceChange) * 100, // Convert to percentage
            shock_type: priceChange > 0 ? 'price_surge' : 'price_drop',
            price_change: priceChange,
            previous_price: baselinePrice,
            current_price: currentPrice,
            conflict_intensity: sortedData[i].conflictIntensity,
            baseline_period: {
              start: sortedData[i - WINDOW_SIZE].date,
              end: sortedData[i - 1].date
            }
          };
          
          shocks.push(shock);
        }
      }
    });

    DEBUG_SHOCK_ANALYSIS.log('Shock analysis complete:', {
      totalShocks: shocks.length,
      regionsAnalyzed: Object.keys(dataByRegion).length
    });

    metric.finish({ status: 'success', shockCount: shocks.length });
    return shocks;
  } catch (error) {
    console.error('Error analyzing market shocks:', error);
    metric.finish({ status: 'failed', error: error.message });
    return [];
  }
};

/**
 * Analyze shock propagation patterns
 * @param {Array} shocks - Array of detected shocks
 * @param {Object} spatialAutocorrelation - Spatial autocorrelation data
 * @returns {Object} Propagation patterns and metrics
 */
export const analyzeShockPropagation = (shocks, spatialAutocorrelation) => {
  const metric = backgroundMonitor.startMetric('shock-propagation-analysis');

  try {
    if (!Array.isArray(shocks) || !spatialAutocorrelation) {
      throw new Error('Invalid input data for propagation analysis');
    }

    // Group shocks by month
    const shocksByMonth = shocks.reduce((acc, shock) => {
      const month = shock.date.substring(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(shock);
      return acc;
    }, {});

    const propagationPatterns = [];

    // Analyze each month
    Object.entries(shocksByMonth).forEach(([month, monthShocks]) => {
      if (monthShocks.length > 1) {
        // Find primary shock considering spatial correlation
        const primaryShock = monthShocks.reduce((max, shock) => {
          const spatialWeight = spatialAutocorrelation.local?.[shock.region]?.local_i || 1;
          const weightedMagnitude = shock.magnitude * spatialWeight;
          return weightedMagnitude > max.weightedMagnitude ? 
            { ...shock, weightedMagnitude } : max;
        }, { ...monthShocks[0], weightedMagnitude: monthShocks[0].magnitude });

        // Add propagation pattern
        propagationPatterns.push({
          sourceRegion: primaryShock.region,
          date: primaryShock.date,
          magnitude: primaryShock.magnitude,
          spatialCorrelation: spatialAutocorrelation.local?.[primaryShock.region]?.local_i || 0,
          affectedRegions: monthShocks
            .filter(s => s !== primaryShock)
            .map(s => ({
              region: s.region,
              magnitude: s.magnitude,
              spatialCorrelation: spatialAutocorrelation.local?.[s.region]?.local_i || 0
            }))
        });
      }
    });

    metric.finish({ status: 'success', patternCount: propagationPatterns.length });

    return {
      patterns: propagationPatterns,
      metrics: {
        totalPatterns: propagationPatterns.length,
        avgMagnitude: propagationPatterns.reduce((sum, p) => sum + p.magnitude, 0) / 
          (propagationPatterns.length || 1),
        spatialCorrelation: spatialAutocorrelation.global?.I || 0
      }
    };
  } catch (error) {
    console.error('Error in shock propagation analysis:', error);
    metric.finish({ status: 'failed', error: error.message });
    return {
      patterns: [],
      metrics: {
        totalPatterns: 0,
        avgMagnitude: 0,
        spatialCorrelation: 0
      }
    };
  }
};

/**
 * Calculate shock statistics
 * @param {Array} shocks - Array of detected shocks
 * @param {Object} spatialAutocorrelation - Spatial autocorrelation data
 * @returns {Object} Shock statistics
 */
export const calculateShockStatistics = (shocks, spatialAutocorrelation) => {
  if (!Array.isArray(shocks) || shocks.length === 0) {
    return getDefaultShockStats();
  }

  try {
    const magnitudes = shocks.map(s => s.magnitude);
    const shockTypes = shocks.reduce((acc, shock) => {
      acc[shock.shock_type] = (acc[shock.shock_type] || 0) + 1;
      return acc;
    }, {});

    const uniqueRegions = new Set(shocks.map(s => s.region));
    const temporalDistribution = shocks.reduce((acc, shock) => {
      const month = shock.date.substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return {
      totalShocks: shocks.length,
      maxMagnitude: Math.max(...magnitudes),
      avgMagnitude: magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length,
      shockTypes,
      regionsAffected: uniqueRegions.size,
      temporalDistribution,
      spatialCorrelation: spatialAutocorrelation?.global?.I || 0
    };
  } catch (error) {
    console.error('Error calculating shock statistics:', error);
    return getDefaultShockStats();
  }
};

/**
 * Calculate robust baseline price
 * @param {Array} prices - Array of price values
 * @returns {number} Baseline price
 */
const calculateRobustBaseline = (prices) => {
  if (!prices || prices.length === 0) return 0;

  try {
    // Sort prices to calculate quartiles
    const sorted = [...prices].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const iqr = sorted[q3Index] - sorted[q1Index];

    // Filter outliers using IQR method
    const validPrices = prices.filter(price => 
      price >= sorted[q1Index] - 1.5 * iqr &&
      price <= sorted[q3Index] + 1.5 * iqr
    );

    // Use mean of valid prices or all prices if filtering removes too many
    return validPrices.length >= prices.length * 0.5 ?
      validPrices.reduce((a, b) => a + b, 0) / validPrices.length :
      prices.reduce((a, b) => a + b, 0) / prices.length;
  } catch (error) {
    console.error('Error calculating robust baseline:', error);
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
};

/**
 * Calculate standard deviation
 * @param {Array} values - Array of numeric values
 * @returns {number} Standard deviation
 */
const calculateStandardDeviation = (values) => {
  if (!Array.isArray(values) || values.length < 2) return 0;

  try {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  } catch (error) {
    console.error('Error calculating standard deviation:', error);
    return 0;
  }
};

/**
 * Get default shock statistics
 * @returns {Object} Default statistics object
 */
const getDefaultShockStats = () => ({
  totalShocks: 0,
  maxMagnitude: 0,
  avgMagnitude: 0,
  shockTypes: {},
  regionsAffected: 0,
  temporalDistribution: {},
  spatialCorrelation: 0
});

/**
 * Get default propagation patterns
 * @returns {Object} Default propagation patterns object
 */
const getDefaultPropagationPatterns = () => ({
  patterns: [],
  metrics: {
    totalPatterns: 0,
    avgMagnitude: 0,
    spatialCorrelation: 0
  }
});

/**
 * Calculate shock intensity index
 * @param {Object} shock - Shock data
 * @param {Object} spatialData - Spatial data
 * @returns {number} Intensity index
 */
export const calculateShockIntensity = (shock, spatialData) => {
  if (!shock || !spatialData) return 0;

  try {
    const baseIntensity = shock.magnitude / 100;
    const spatialWeight = spatialData.spatialAutocorrelation?.local?.[shock.region]?.local_i || 1;
    const conflictIntensity = shock.conflict_intensity || 0;

    // Weighted combination of factors
    return (
      baseIntensity * 0.5 +
      Math.abs(spatialWeight) * 0.3 +
      (conflictIntensity / 10) * 0.2
    );
  } catch (error) {
    console.error('Error calculating shock intensity:', error);
    return 0;
  }
};


export const calculateClusterGeometry = (markets, coordinates) => {
  if (!markets?.length || !coordinates) return null;

  const validMarkets = markets.filter(market => 
    coordinates[transformRegionName(market)]
  );

  if (!validMarkets.length) return null;

  const points = validMarkets.map(market => 
    coordinates[transformRegionName(market)]
  );

  // Calculate centroid
  const centroid = calculateCenter(points);

  // Calculate bounding box
  const bounds = points.reduce((acc, point) => ({
    minLon: Math.min(acc.minLon, point[0]),
    maxLon: Math.max(acc.maxLon, point[0]),
    minLat: Math.min(acc.minLat, point[1]),
    maxLat: Math.max(acc.maxLat, point[1])
  }), {
    minLon: Infinity,
    maxLon: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  });

  // Calculate area and perimeter
  const area = calculatePolygonArea(points);
  const perimeter = calculatePolygonPerimeter(points);

  return {
    centroid,
    bounds,
    area,
    perimeter,
    density: points.length / area
  };
};

/**
 * Calculate spatial relationships between clusters
 */
export const calculateClusterRelations = (clusters, coordinates) => {
  if (!clusters?.length) return [];

  const relations = [];

  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const cluster1 = clusters[i];
      const cluster2 = clusters[j];

      const geometry1 = calculateClusterGeometry(cluster1.markets, coordinates);
      const geometry2 = calculateClusterGeometry(cluster2.markets, coordinates);

      if (!geometry1?.centroid || !geometry2?.centroid) continue;

      const distance = calculateDistance(geometry1.centroid, geometry2.centroid);
      const overlap = calculateClusterOverlap(geometry1.bounds, geometry2.bounds);

      relations.push({
        cluster1: cluster1.cluster_id,
        cluster2: cluster2.cluster_id,
        distance,
        overlap,
        adjacency: overlap > 0
      });
    }
  }

  return relations;
};

/**
 * Calculate the area of connection between markets
 */
export const calculateConnectionArea = (marketPair, coordinates) => {
  const [market1, market2] = marketPair;
  const coord1 = coordinates[transformRegionName(market1)];
  const coord2 = coordinates[transformRegionName(market2)];

  if (!coord1 || !coord2) return 0;

  const distance = calculateDistance(coord1, coord2);
  const maxDistance = 500; // Maximum meaningful distance in km

  return Math.max(0, 1 - (distance / maxDistance));
};

/**
 * Calculate weighted centrality for markets
 */
export const calculateMarketCentrality = (markets, flows) => {
  const centrality = {};
  
  markets.forEach(market => {
    const marketFlows = flows.filter(flow => 
      flow.source === market || flow.target === market
    );

    const totalFlow = marketFlows.reduce((sum, flow) => 
      sum + (flow.total_flow || 0), 0
    );

    const uniqueConnections = new Set(
      marketFlows.flatMap(flow => [flow.source, flow.target])
    ).size - 1; // Subtract 1 to exclude the market itself

    centrality[market] = {
      flowCentrality: totalFlow,
      degreeCentrality: uniqueConnections,
      weightedCentrality: totalFlow * uniqueConnections
    };
  });

  return centrality;
};

/**
 * Calculate polygon area using the shoelace formula
 */
const calculatePolygonArea = (points) => {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }

  return Math.abs(area) / 2;
};

/**
 * Calculate polygon perimeter
 */
const calculatePolygonPerimeter = (points) => {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    perimeter += calculateDistance(points[i], points[j]);
  }
  return perimeter;
};

/**
 * Calculate overlap between two bounding boxes
 */
const calculateClusterOverlap = (bounds1, bounds2) => {
  const xOverlap = Math.max(0,
    Math.min(bounds1.maxLon, bounds2.maxLon) -
    Math.max(bounds1.minLon, bounds2.minLon)
  );

  const yOverlap = Math.max(0,
    Math.min(bounds1.maxLat, bounds2.maxLat) -
    Math.max(bounds1.minLat, bounds2.minLat)
  );

  return xOverlap * yOverlap;
};

/**
 * Calculate cluster cohesion metrics
 */
export const calculateClusterCohesion = (cluster, flows, coordinates) => {
  if (!cluster?.markets?.length) return null;

  const markets = cluster.markets;
  const internalFlows = flows.filter(flow =>
    markets.includes(flow.source) && markets.includes(flow.target)
  );

  // Calculate density
  const maxPossibleConnections = (markets.length * (markets.length - 1)) / 2;
  const actualConnections = internalFlows.length;
  const density = maxPossibleConnections > 0 ? 
    actualConnections / maxPossibleConnections : 0;

  // Calculate average flow strength
  const avgFlowStrength = internalFlows.length > 0 ?
    internalFlows.reduce((sum, flow) => sum + (flow.total_flow || 0), 0) / internalFlows.length : 0;

  // Calculate spatial dispersion
  const marketCoords = markets
    .map(market => coordinates[transformRegionName(market)])
    .filter(Boolean);

  const centroid = calculateCenter(marketCoords);
  const distances = marketCoords.map(coord => calculateDistance(coord, centroid));
  const dispersion = calculateStandardDeviation(distances);

  return {
    density,
    avgFlowStrength,
    dispersion,
    connectionCount: actualConnections,
    maxConnections: maxPossibleConnections,
    cohesionScore: density * (1 - (dispersion / 500)) // Normalize dispersion by max expected distance
  };
};

/**
 * Calculate inter-cluster flow metrics
 */
export const calculateInterClusterFlows = (cluster1, cluster2, flows) => {
  if (!cluster1?.markets?.length || !cluster2?.markets?.length) return null;

  const interFlows = flows.filter(flow => 
    (cluster1.markets.includes(flow.source) && cluster2.markets.includes(flow.target)) ||
    (cluster1.markets.includes(flow.target) && cluster2.markets.includes(flow.source))
  );

  const totalFlow = interFlows.reduce((sum, flow) => sum + (flow.total_flow || 0), 0);
  const avgFlow = interFlows.length > 0 ? totalFlow / interFlows.length : 0;
  const connectionCount = interFlows.length;

  const maxPossibleConnections = cluster1.markets.length * cluster2.markets.length;
  const connectionDensity = maxPossibleConnections > 0 ?
    connectionCount / maxPossibleConnections : 0;

  return {
    totalFlow,
    avgFlow,
    connectionCount,
    connectionDensity,
    flows: interFlows
  };
};

export const calculateMarketIsolation = (market, flows, coordinates) => {
  const marketCoord = coordinates[transformRegionName(market)];
  if (!marketCoord) return null;

  const marketFlows = flows.filter(flow => 
    flow.source === market || flow.target === market
  );

  const connectedMarkets = new Set(
    marketFlows.flatMap(flow => [flow.source, flow.target])
  );
  connectedMarkets.delete(market);

  const avgDistance = Array.from(connectedMarkets)
    .map(connectedMarket => {
      const coord = coordinates[transformRegionName(connectedMarket)];
      return coord ? calculateDistance(marketCoord, coord) : null;
    })
    .filter(Boolean)
    .reduce((sum, dist, i, arr) => sum + dist / arr.length, 0);

  return {
    connectionCount: connectedMarkets.size,
    totalFlow: marketFlows.reduce((sum, flow) => sum + (flow.total_flow || 0), 0),
    avgDistance,
    isolationScore: calculateIsolationScore(connectedMarkets.size, avgDistance)
  };
};

const calculateIsolationScore = (connections, avgDistance) => {
  const maxExpectedConnections = 20; // Based on total possible markets
  const maxExpectedDistance = 500; // Maximum meaningful distance in km

  const connectionScore = 1 - (connections / maxExpectedConnections);
  const distanceScore = avgDistance / maxExpectedDistance;

  return (connectionScore + distanceScore) / 2;
};


// src/utils/analysis/shockAnalysis.js

import { backgroundMonitor } from '../backgroundMonitor';
import { calculateDistance, calculateCenter } from './spatialUtils';

export class ShockAnalysis {
  /**
   * Analyze market shocks from time series data
   */
  static analyzeMarketShocks(timeSeriesData, threshold = 0.1) {
    const metric = backgroundMonitor.startMetric('market-shock-analysis');

    try {
      if (!Array.isArray(timeSeriesData)) {
        throw new Error('Invalid time series data');
      }

      // Group data by region
      const dataByRegion = this.groupDataByRegion(timeSeriesData);

      // Calculate regional statistics
      Object.values(dataByRegion).forEach(region => {
        const prices = region.timeSeries.map(d => d.price);
        region.meanPrice = this.calculateMean(prices);
        region.stdDev = this.calculateStandardDeviation(prices);
      });

      const shocks = this.detectShocks(dataByRegion, threshold);

      metric.finish({ status: 'success', shockCount: shocks.length });
      return shocks;
    } catch (error) {
      console.error('Error analyzing market shocks:', error);
      metric.finish({ status: 'failed', error: error.message });
      return [];
    }
  }

  /**
   * Analyze shock propagation patterns
   */
  static analyzeShockPropagation(shocks, spatialAutocorrelation) {
    const metric = backgroundMonitor.startMetric('shock-propagation-analysis');

    try {
      if (!Array.isArray(shocks) || !spatialAutocorrelation) {
        throw new Error('Invalid input data for propagation analysis');
      }

      const shocksByMonth = this.groupShocksByMonth(shocks);
      const propagationPatterns = this.analyzePropagationPatterns(
        shocksByMonth, 
        spatialAutocorrelation
      );

      metric.finish({ status: 'success', patternCount: propagationPatterns.length });
      return {
        patterns: propagationPatterns,
        metrics: this.calculatePropagationMetrics(propagationPatterns, spatialAutocorrelation)
      };
    } catch (error) {
      console.error('Error in shock propagation analysis:', error);
      metric.finish({ status: 'failed', error: error.message });
      return this.getDefaultPropagationPatterns();
    }
  }

  /**
   * Calculate shock statistics
   */
  static calculateShockStatistics(shocks, spatialAutocorrelation) {
    if (!Array.isArray(shocks) || shocks.length === 0) {
      return this.getDefaultShockStats();
    }

    try {
      return {
        ...this.calculateBasicStats(shocks),
        ...this.calculateSpatialStats(shocks, spatialAutocorrelation),
        temporalDistribution: this.calculateTemporalDistribution(shocks)
      };
    } catch (error) {
      console.error('Error calculating shock statistics:', error);
      return this.getDefaultShockStats();
    }
  }

  // Private helper methods
  static groupDataByRegion(timeSeriesData) {
    return timeSeriesData.reduce((acc, data) => {
      if (!this.isValidTimeSeriesEntry(data)) return acc;
      
      if (!acc[data.region]) {
        acc[data.region] = {
          timeSeries: [],
          meanPrice: 0,
          stdDev: 0
        };
      }
      
      acc[data.region].timeSeries.push({
        date: data.month,
        price: data.usdPrice,
        conflictIntensity: data.conflictIntensity || 0
      });
      return acc;
    }, {});
  }

  static isValidTimeSeriesEntry(data) {
    return data.region && 
           typeof data.usdPrice === 'number' && 
           !isNaN(data.usdPrice) && 
           data.month;
  }

  static detectShocks(dataByRegion, threshold) {
    const shocks = [];
    const WINDOW_SIZE = 3;

    Object.entries(dataByRegion).forEach(([region, data]) => {
      const sortedData = data.timeSeries.sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      for (let i = WINDOW_SIZE; i < sortedData.length; i++) {
        const shock = this.detectShock(
          region,
          sortedData,
          i,
          WINDOW_SIZE,
          threshold
        );
        if (shock) shocks.push(shock);
      }
    });

    return shocks;
  }

  static detectShock(region, sortedData, index, windowSize, threshold) {
    const currentPrice = sortedData[index].price;
    const windowPrices = sortedData
      .slice(index - windowSize, index)
      .map(d => d.price);
    const baselinePrice = this.calculateRobustBaseline(windowPrices);
    const priceChange = (currentPrice - baselinePrice) / baselinePrice;

    if (Math.abs(priceChange) >= threshold) {
      return {
        region,
        date: sortedData[index].date + '-01',
        magnitude: Math.abs(priceChange) * 100,
        shock_type: priceChange > 0 ? 'price_surge' : 'price_drop',
        price_change: priceChange,
        previous_price: baselinePrice,
        current_price: currentPrice,
        conflict_intensity: sortedData[index].conflictIntensity,
        baseline_period: {
          start: sortedData[index - windowSize].date,
          end: sortedData[index - 1].date
        }
      };
    }

    return null;
  }

  static calculateRobustBaseline(prices) {
    if (!prices?.length) return 0;

    try {
      const sorted = [...prices].sort((a, b) => a - b);
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const iqr = sorted[q3Index] - sorted[q1Index];

      const validPrices = prices.filter(price => 
        price >= sorted[q1Index] - 1.5 * iqr &&
        price <= sorted[q3Index] + 1.5 * iqr
      );

      return validPrices.length >= prices.length * 0.5 ?
        this.calculateMean(validPrices) :
        this.calculateMean(prices);
    } catch (error) {
      console.error('Error calculating robust baseline:', error);
      return this.calculateMean(prices);
    }
  }

  // Statistical helper methods
  static calculateMean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  static calculateStandardDeviation(values) {
    if (!Array.isArray(values) || values.length < 2) return 0;

    try {
      const mean = this.calculateMean(values);
      const squareDiffs = values.map(value => Math.pow(value - mean, 2));
      const variance = this.calculateMean(squareDiffs);
      return Math.sqrt(variance);
    } catch (error) {
      console.error('Error calculating standard deviation:', error);
      return 0;
    }
  }

  // Default values
  static getDefaultShockStats() {
    return {
      totalShocks: 0,
      maxMagnitude: 0,
      avgMagnitude: 0,
      shockTypes: {},
      regionsAffected: 0,
      temporalDistribution: {},
      spatialCorrelation: 0
    };
  }

  static getDefaultPropagationPatterns() {
    return {
      patterns: [],
      metrics: {
        totalPatterns: 0,
        avgMagnitude: 0,
        spatialCorrelation: 0
      }
    };
  }
}

export default ShockAnalysis;

// Export testing utilities
export const __testing = {
  calculateRobustBaseline,
  calculateStandardDeviation,
  getDefaultShockStats,
  getDefaultPropagationPatterns,
  calculateShockIntensity,
  calculateClusterGeometry,
  calculateClusterRelations,
  calculateConnectionArea,
  calculateMarketCentrality,
  calculateClusterCohesion,
  calculateInterClusterFlows,
  calculateMarketIsolation
};