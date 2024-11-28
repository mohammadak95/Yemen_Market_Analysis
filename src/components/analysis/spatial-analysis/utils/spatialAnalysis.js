import { calculateDistance, createWeightsMatrix, calculateStandardDeviation } from './spatialUtils';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

const DEBUG = process.env.NODE_ENV === 'development';

export const calculateLocalMorans = (data, geometry) => {
  const metric = backgroundMonitor.startMetric('local-morans-calculation');

  try {
    // Create spatial weights matrix
    const weights = createWeightsMatrix(geometry);

    // Calculate global statistics
    const prices = data.map(d => d.avgUsdPrice);
    const meanPrice = _.mean(prices);
    const variance = _.meanBy(prices, p => Math.pow(p - meanPrice, 2));

    // Calculate local Moran's I for each region
    const clusters = {};
    let globalI = 0;
    let globalN = 0;

    data.forEach((region, i) => {
      const localI = calculateLocalI(
        region,
        data,
        weights,
        meanPrice,
        variance
      );

      if (localI) {
        clusters[region.region] = {
          local_i: localI.i,
          z_score: localI.z,
          p_value: localI.p,
          cluster_type: determineClusterType(localI),
          significance: localI.p < 0.05
        };

        globalI += localI.i;
        globalN++;
      }
    });

    const results = {
      clusters,
      globalI: globalI / globalN,
      zScore: calculateGlobalZ(globalI / globalN, data.length),
      pValue: calculatePValue(globalI / globalN, data.length)
    };

    metric.finish({ status: 'success' });
    return results;

  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    throw error;
  }
};

/**
 * Calculate market coverage based on spatial data
 * @param {Object} spatialData - Spatial data object containing geometry and time series
 * @returns {number} Coverage ratio between 0 and 1
 */
export const calculateMarketCoverage = (spatialData) => {
  if (!spatialData?.geometry?.features || !spatialData?.timeSeriesData) {
    if (DEBUG) console.warn('Missing required data for market coverage calculation');
    return 0;
  }

  try {
    const totalRegions = spatialData.geometry.features.length;
    const regionsWithData = new Set(
      spatialData.timeSeriesData
        .filter(d => d.avgUsdPrice !== null && d.avgUsdPrice !== undefined)
        .map(d => d.region)
    ).size;

    return regionsWithData / totalRegions;
  } catch (error) {
    backgroundMonitor.logError('market-coverage-calculation', error);
    return 0;
  }
};

/**
 * Calculate conflict impact on market prices
 * @param {Object} spatialData - Spatial data object
 * @returns {number} Impact coefficient between -1 and 1
 */
export const calculateConflictImpact = (spatialData) => {
  if (!spatialData?.timeSeriesData) {
    if (DEBUG) console.warn('Missing time series data for conflict impact calculation');
    return 0;
  }

  try {
    const validData = spatialData.timeSeriesData.filter(
      d => d.volatility !== undefined && d.conflict_intensity !== undefined
    );

    if (validData.length < 2) return 0;

    const priceVolatility = validData.map(d => d.volatility);
    const conflictIntensity = validData.map(d => d.conflict_intensity);

    const correlation = calculateCorrelation(priceVolatility, conflictIntensity);
    return isNaN(correlation) ? 0 : correlation;
  } catch (error) {
    backgroundMonitor.logError('conflict-impact-calculation', error);
    return 0;
  }
};

/**
 * Calculate north-south market disparity
 * @param {Object} spatialData - Spatial data object
 * @returns {number} Disparity index between -1 and 1
 */
export const calculateNorthSouthDisparity = (spatialData) => {
  if (!spatialData?.timeSeriesData) {
    if (DEBUG) console.warn('Missing time series data for disparity calculation');
    return 0;
  }

  const northRegions = ["sana'a", "amran", "hajjah", "sa'dah", "al mahwit"];
  const southRegions = ["aden", "lahj", "abyan", "al dhale'e", "taizz"];

  try {
    const validData = spatialData.timeSeriesData.filter(d => d.avgUsdPrice !== null);
    const northPrices = validData
      .filter(d => d.region && northRegions.includes(d.region.toLowerCase()))
      .map(d => d.avgUsdPrice);
    const southPrices = validData
      .filter(d => d.region && southRegions.includes(d.region.toLowerCase()))
      .map(d => d.avgUsdPrice);

    if (!northPrices.length || !southPrices.length) return 0;

    const northAverage = calculateMean(northPrices);
    const southAverage = calculateMean(southPrices);

    if (northAverage === 0 && southAverage === 0) return 0;
    return (northAverage - southAverage) / ((northAverage + southAverage) / 2);
  } catch (error) {
    backgroundMonitor.logError('north-south-disparity-calculation', error);
    return 0;
  }
};

/**
 * Calculate spatial lag values
 * @param {Array} data - Time series data array
 * @param {Object} weights - Spatial weights matrix
 * @returns {Array} Spatial lag values
 */
export const calculateSpatialLag = (data, weights) => {
  if (!data?.length || !weights) return [];

  try {
    return data.map(region => {
      const neighbors = weights[region.region];
      if (!neighbors) return 0;

      let weightedSum = 0;
      let weightSum = 0;

      Object.entries(neighbors).forEach(([neighborId, weight]) => {
        const neighbor = data.find(d => d.region === neighborId);
        if (!neighbor?.avgUsdPrice) return;

        weightedSum += weight * neighbor.avgUsdPrice;
        weightSum += weight;
      });

      return weightSum > 0 ? weightedSum / weightSum : 0;
    });
  } catch (error) {
    backgroundMonitor.logError('spatial-lag-calculation', error);
    return [];
  }
};

/**
 * Calculate robust statistics (Median and MAD)
 * @param {Array} values - Array of numeric values
 * @returns {Object} Robust statistics
 */
const calculateRobustStatistics = (values) => {
  if (!values?.length) return { mean: 0, std: 1 };

  try {
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mad = calculateMAD(sorted, median);
    
    return {
      mean: median,
      std: mad * 1.4826 // Consistent with normal distribution
    };
  } catch (error) {
    backgroundMonitor.logError('robust-statistics-calculation', error);
    return { mean: 0, std: 1 };
  }
};

/**
 * Calculate Median Absolute Deviation
 * @param {Array} sorted - Sorted array of values
 * @param {number} median - Median value
 * @returns {number} MAD value
 */
const calculateMAD = (sorted, median) => {
  const deviations = sorted.map(x => Math.abs(x - median));
  deviations.sort((a, b) => a - b);
  return deviations[Math.floor(deviations.length / 2)];
};

/**
 * Calculate optimal bandwidth for spatial weights
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {number} Optimal bandwidth value
 */
const calculateOptimalBandwidth = (geometry) => {
  try {
    const distances = [];
    const features = geometry.features;
    
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        distances.push(calculateDistance(features[i], features[j]));
      }
    }

    const n = distances.length;
    if (n === 0) return 100; // Default bandwidth

    const mean = calculateMean(distances);
    const std = calculateStandardDeviation(distances);
    const iqr = calculateIQR(distances.sort((a, b) => a - b));

    // Silverman's rule of thumb
    return 0.9 * Math.min(std, iqr / 1.34) * Math.pow(n, -0.2);
  } catch (error) {
    backgroundMonitor.logError('bandwidth-calculation', error);
    return 100; // Default bandwidth
  }
};

/**
 * Calculate Local Moran's I statistics
 * @param {Array} standardizedValues - Standardized values array
 * @param {number} index - Current index
 * @param {Object} neighbors - Neighbor weights
 * @param {Object} weights - Full weights matrix
 * @returns {Object} Local Moran's I statistics
 */
const calculateLocalI = (standardizedValues, index, neighbors, weights) => {
  try {
    let numerator = 0;
    let denominator = 0;

    Object.entries(neighbors).forEach(([neighborId, weight]) => {
      const neighborIndex = standardizedValues.findIndex((_, i) => i === parseInt(neighborId));
      if (neighborIndex === -1) return;

      numerator += weight * standardizedValues[index] * standardizedValues[neighborIndex];
      denominator += weight;
    });

    const localI = denominator > 0 ? numerator / denominator : 0;
    const expectedI = -1 / (standardizedValues.length - 1);
    const varianceI = calculateVarianceI(standardizedValues, weights, index);

    return { localI, expectedI, varianceI };
  } catch (error) {
    backgroundMonitor.logError('local-morans-calculation', error);
    return { localI: 0, expectedI: 0, varianceI: 1 };
  }
};

/**
 * Calculate variance of Local Moran's I
 * @param {Array} standardizedValues - Standardized values array
 * @param {Object} weights - Weights matrix
 * @param {number} index - Current index
 * @returns {number} Variance value
 */
const calculateVarianceI = (standardizedValues, weights, index) => {
  try {
    const n = standardizedValues.length;
    const neighbors = weights[index];
    if (!neighbors) return 1;

    let sumWeights = 0;
    let sumWeightsSquared = 0;

    Object.values(neighbors).forEach(weight => {
      sumWeights += weight;
      sumWeightsSquared += weight * weight;
    });

    const m2 = standardizedValues.reduce((sum, val) => sum + val * val, 0) / n;
    const m4 = standardizedValues.reduce((sum, val) => sum + val * val * val * val, 0) / n;

    return (m4 / (m2 * m2)) * (sumWeightsSquared / (sumWeights * sumWeights));
  } catch (error) {
    backgroundMonitor.logError('variance-calculation', error);
    return 1;
  }
};

/**
 * Calculate Monte Carlo based p-value
 * @param {number} zScore - Z-score value
 * @param {number} statistic - Test statistic
 * @param {Object} options - Simulation options
 * @returns {number} P-value
 */
const calculatePValue = (zScore, statistic, options) => {
  const { standardizedPrices, weights, iterations } = options;
  let count = 0;

  try {
    for (let i = 0; i < iterations; i++) {
      const randomStat = generateRandomStatistic({ standardizedPrices, weights });
      if (Math.abs(randomStat) >= Math.abs(statistic)) count++;
    }

    return (count + 1) / (iterations + 1);
  } catch (error) {
    backgroundMonitor.logError('p-value-calculation', error);
    return 1;
  }
};

/**
 * Generate random statistic for Monte Carlo simulation
 * @param {Object} options - Simulation options
 * @returns {number} Random statistic
 */
const generateRandomStatistic = ({ standardizedPrices, weights }) => {
  try {
    const shuffled = [...standardizedPrices].sort(() => Math.random() - 0.5);
    let sum = 0;
    let count = 0;

    Object.values(weights).forEach(neighbors => {
      Object.values(neighbors).forEach(weight => {
        sum += weight * shuffled[count % shuffled.length];
        count++;
      });
    });

    return sum / count;
  } catch (error) {
    backgroundMonitor.logError('random-statistic-generation', error);
    return 0;
  }
};

/**
 * Determine cluster type based on statistical results
 * @param {number} standardizedValue - Standardized value
 * @param {number} spatialLag - Spatial lag value
 * @param {number} zScore - Z-score
 * @param {number} pValue - P-value
 * @returns {Object} Cluster classification
 */
const determineClusterType = (standardizedValue, spatialLag, zScore, pValue) => {
  const significance = 0.05;
  let cluster_type = 'not-significant';
  let strength = 'none';

  if (pValue < significance) {
    if (standardizedValue > 0 && spatialLag > 0) {
      cluster_type = 'high-high';
      strength = zScore > 2.576 ? 'very-high' : 'high';
    } else if (standardizedValue < 0 && spatialLag < 0) {
      cluster_type = 'low-low';
      strength = zScore < -2.576 ? 'very-low' : 'low';
    } else if (standardizedValue > 0 && spatialLag < 0) {
      cluster_type = 'high-low';
    } else {
      cluster_type = 'low-high';
    }
  }

  return {
    cluster_type,
    strength,
    significance_level: pValue < 0.01 ? 0.01 : pValue < 0.05 ? 0.05 : null,
    intensity: Math.abs(zScore),
    reliability: 1 - pValue
  };
};

/**
 * Calculate correlation coefficient
 * @param {Array} x - First array of values
 * @param {Array} y - Second array of values
 * @returns {number} Correlation coefficient
 */
const calculateCorrelation = (x, y) => {
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 2) {
    return 0;
  }

  try {
    const n = x.length;
    const meanX = calculateMean(x);
    const meanY = calculateMean(y);
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      numerator += xDiff * yDiff;
      denomX += xDiff * xDiff;
      denomY += yDiff * yDiff;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  } catch (error) {
    backgroundMonitor.logError('correlation-calculation', error);
    return 0;
  }
};

/**
 * Calculate Interquartile Range
 * @param {Array} sorted - Sorted array of values
 * @returns {number} IQR value
 */
const calculateIQR = (sorted) => {
  if (!Array.isArray(sorted) || sorted.length < 4) return 0;

  try {
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    return sorted[q3Index] - sorted[q1Index];
  } catch (error) {
    backgroundMonitor.logError('iqr-calculation', error);
    return 0;
  }
};

/**
 * Calculate mean of an array
 * @param {Array} values - Array of numeric values
 * @returns {number} Mean value
 */
const calculateMean = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;

  try {
    return values.reduce((sum, val) => sum + (val || 0), 0) / values.length;
  } catch (error) {
    backgroundMonitor.logError('mean-calculation', error);
    return 0;
  }
};

/**
 * Calculate Edge Correction Factor
 * @param {Object} region - Region data
 * @param {Object} weights - Weights matrix
 * @param {Array} data - Complete dataset
 * @returns {number} Edge correction factor
 */
const calculateEdgeCorrection = (region, weights, data) => {
  if (!region || !weights || !data?.length) return 1;

  try {
    const totalPossibleNeighbors = data.length - 1;
    const actualNeighbors = Object.keys(weights[region.region] || {}).length;
    return Math.sqrt(totalPossibleNeighbors / Math.max(actualNeighbors, 1));
  } catch (error) {
    backgroundMonitor.logError('edge-correction-calculation', error);
    return 1;
  }
};

/**
 * Calculate market integration metrics
 * @param {Array} timeSeriesData - Time series data array
 * @param {Object} spatialWeights - Spatial weights matrix
 * @returns {Object} Integration metrics
 */
export const calculateMarketIntegration = (timeSeriesData, spatialWeights) => {
  if (!timeSeriesData?.length || !spatialWeights) {
    if (DEBUG) console.warn('Missing data for market integration calculation');
    return {
      integration_score: 0,
      price_correlation: {},
      flow_density: 0
    };
  }

  try {
    // Group data by region
    const regionData = {};
    timeSeriesData.forEach(d => {
      if (!regionData[d.region]) regionData[d.region] = [];
      regionData[d.region].push(d.avgUsdPrice);
    });

    // Calculate price correlations
    const priceCorrelation = {};
    const regions = Object.keys(regionData);

    regions.forEach(region1 => {
      priceCorrelation[region1] = {};
      regions.forEach(region2 => {
        if (region1 === region2) {
          priceCorrelation[region1][region2] = 1;
        } else if (!priceCorrelation[region2]?.[region1]) {
          const correlation = calculateCorrelation(
            regionData[region1],
            regionData[region2]
          );
          priceCorrelation[region1][region2] = correlation;
        }
      });
    });

    // Calculate integration score
    let totalCorrelation = 0;
    let correlationCount = 0;
    regions.forEach(region1 => {
      regions.forEach(region2 => {
        if (region1 !== region2) {
          totalCorrelation += Math.abs(priceCorrelation[region1][region2]);
          correlationCount++;
        }
      });
    });

    // Calculate flow density
    const potentialConnections = regions.length * (regions.length - 1) / 2;
    const actualConnections = Object.values(spatialWeights)
      .reduce((sum, weights) => sum + Object.keys(weights).length, 0) / 2;

    return {
      integration_score: correlationCount > 0 ? totalCorrelation / correlationCount : 0,
      price_correlation: priceCorrelation,
      flow_density: potentialConnections > 0 ? actualConnections / potentialConnections : 0
    };
  } catch (error) {
    backgroundMonitor.logError('market-integration-calculation', error);
    return {
      integration_score: 0,
      price_correlation: {},
      flow_density: 0
    };
  }
};

/**
 * Calculate regional price convergence
 * @param {Array} timeSeriesData - Time series data array
 * @param {Object} clusters - Market clusters
 * @returns {Object} Convergence metrics
 */
export const calculatePriceConvergence = (timeSeriesData, clusters) => {
  if (!timeSeriesData?.length || !clusters?.length) {
    if (DEBUG) console.warn('Missing data for price convergence calculation');
    return {
      convergence_score: 0,
      cluster_metrics: {},
      overall_trend: 0
    };
  }

  try {
    const clusterMetrics = {};
    let totalConvergence = 0;

    clusters.forEach(cluster => {
      const clusterData = timeSeriesData.filter(d => 
        cluster.connected_markets.includes(d.region)
      );

      if (clusterData.length > 0) {
        const priceDispersion = calculatePriceDispersion(clusterData);
        const convergenceTrend = calculateConvergenceTrend(clusterData);

        clusterMetrics[cluster.cluster_id] = {
          dispersion: priceDispersion,
          trend: convergenceTrend,
          market_count: cluster.connected_markets.length
        };

        totalConvergence += (1 - priceDispersion) * cluster.connected_markets.length;
      }
    });

    const totalMarkets = clusters.reduce((sum, c) => sum + c.connected_markets.length, 0);

    return {
      convergence_score: totalMarkets > 0 ? totalConvergence / totalMarkets : 0,
      cluster_metrics: clusterMetrics,
      overall_trend: calculateOverallConvergenceTrend(timeSeriesData)
    };
  } catch (error) {
    backgroundMonitor.logError('price-convergence-calculation', error);
    return {
      convergence_score: 0,
      cluster_metrics: {},
      overall_trend: 0
    };
  }
};

/**
 * Calculate price dispersion within a dataset
 * @param {Array} data - Price data array
 * @returns {number} Price dispersion metric
 */
const calculatePriceDispersion = (data) => {
  if (!data?.length) return 0;

  try {
    const prices = data.map(d => d.avgUsdPrice).filter(p => p !== null && !isNaN(p));
    if (prices.length < 2) return 0;

    const mean = calculateMean(prices);
    if (mean === 0) return 1;

    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance) / mean;
  } catch (error) {
    backgroundMonitor.logError('price-dispersion-calculation', error);
    return 0;
  }
};

/**
 * Calculate convergence trend in a dataset
 * @param {Array} data - Time series data array
 * @returns {number} Convergence trend coefficient
 */
const calculateConvergenceTrend = (data) => {
  if (!data?.length) return 0;

  try {
    const timePoints = data.map((_, i) => i);
    const dispersions = data.map((_, i) => 
      calculatePriceDispersion(data.slice(0, i + 1))
    );

    return calculateCorrelation(timePoints, dispersions) * -1; // Negative correlation indicates convergence
  } catch (error) {
    backgroundMonitor.logError('convergence-trend-calculation', error);
    return 0;
  }
};

/**
 * Calculate overall convergence trend
 * @param {Array} timeSeriesData - Complete time series data
 * @returns {number} Overall convergence trend
 */
const calculateOverallConvergenceTrend = (timeSeriesData) => {
  if (!timeSeriesData?.length) return 0;

  try {
    const monthlyDispersions = {};
    timeSeriesData.forEach(d => {
      if (!monthlyDispersions[d.month]) monthlyDispersions[d.month] = [];
      monthlyDispersions[d.month].push(d.avgUsdPrice);
    });

    const dispersions = Object.values(monthlyDispersions)
      .map(prices => calculatePriceDispersion({ avgUsdPrice: prices }));
    
    const timePoints = Object.keys(monthlyDispersions).map((_, i) => i);
    return calculateCorrelation(timePoints, dispersions) * -1;
  } catch (error) {
    backgroundMonitor.logError('overall-convergence-calculation', error);
    return 0;
  }
};

/**
 * Calculate the coefficient of variation
 * @param {Array<number>} data - Array of numerical data
 * @returns {number} Coefficient of variation
 */
export const calculateCoefficientOfVariation = (data) => {
  if (!data || data.length === 0) return 0;
  const mean = calculateMean(data);
  const std = calculateStandardDeviation(data);
  return mean === 0 ? 0 : std / mean;
};


// Export utility functions for testing
export const testUtils = {
  calculateCorrelation,
  calculateIQR,
  calculateMean,
  calculateEdgeCorrection,
  calculatePriceDispersion,
  calculateConvergenceTrend,
  calculateOverallConvergenceTrend
};
