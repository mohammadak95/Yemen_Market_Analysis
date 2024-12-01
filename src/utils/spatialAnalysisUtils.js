// src/utils/spatialAnalysisUtils.js

/**
 * Calculate Moran's I spatial autocorrelation
 * @param {Array} values - Array of values
 * @param {Object} weights - Spatial weights matrix
 * @returns {Object} Moran's I statistics
 */
export const calculateMoranI = (values, weights) => {
  if (!values?.length || !weights) return { moran_i: 0, p_value: 1 };

  const n = values.length;
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  let totalWeights = 0;

  // Calculate numerator and weights sum
  Object.entries(weights).forEach(([i, neighbors]) => {
    Object.entries(neighbors).forEach(([j, weight]) => {
      numerator += weight * (values[i] - mean) * (values[j] - mean);
      totalWeights += weight;
    });
  });

  // Calculate denominator (variance)
  denominator = values.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0
  );

  const moranI = (n / totalWeights) * (numerator / denominator);

  // Calculate expected value and variance for significance test
  const expectedI = -1 / (n - 1);
  const variance = calculateMoranVariance(weights, values, mean, expectedI);
  const zScore = (moranI - expectedI) / Math.sqrt(variance);
  const pValue = calculatePValue(zScore);

  return {
    moran_i: moranI,
    expected: expectedI,
    variance,
    z_score: zScore,
    p_value: pValue
  };
};

/**
 * Calculate variance for Moran's I
 * @private
 */
const calculateMoranVariance = (weights, values, mean, expectedI) => {
  const n = values.length;
  const s2 = values.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0
  ) / n;

  let s0 = 0, s1 = 0, s2_w = 0;

  Object.entries(weights).forEach(([i, neighbors]) => {
    Object.entries(neighbors).forEach(([j, weight]) => {
      s0 += weight;
      s1 += Math.pow(weight + weights[j]?.[i] || 0, 2);
      s2_w += weight + weights[j]?.[i] || 0;
    });
  });

  const a = (n * ((n * n - 3 * n + 3) * s1 - n * s2_w + 3 * s0 * s0));
  const b = (s2 * ((n * n - n) * s1 - 2 * n * s2_w + 6 * s0 * s0));
  const c = ((n - 1) * (n - 2) * (n - 3) * s0 * s0);

  return (a - b) / c - expectedI * expectedI;
};

/**
 * Calculate p-value from z-score
 * @private
 */
const calculatePValue = (zScore) => {
  // Using normal distribution approximation
  const x = Math.abs(zScore);
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + 
      t * (-1.821256 + t * 1.330274))));
  return 2 * (1 - p); // Two-tailed test
};

/**
 * Calculate local indicators of spatial association (LISA)
 * @param {Array} values - Array of values
 * @param {Object} weights - Spatial weights matrix
 * @returns {Array} LISA statistics for each location
 */
export const calculateLISA = (values, weights) => {
  if (!values?.length || !weights) return [];

  const n = values.length;
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const variance = values.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0
  ) / n;

  return Object.entries(weights).map(([i, neighbors]) => {
    const localSum = Object.entries(neighbors).reduce((sum, [j, weight]) => 
      sum + weight * (values[j] - mean), 0
    );

    const localI = ((values[i] - mean) / variance) * localSum;
    const expectedI = -1 / (n - 1);
    const variance_i = calculateLocalVariance(weights[i], values, mean, variance);
    const zScore = (localI - expectedI) / Math.sqrt(variance_i);
    const pValue = calculatePValue(zScore);

    return {
      location: i,
      local_i: localI,
      z_score: zScore,
      p_value: pValue,
      cluster_type: determineClusterType(values[i], mean, localSum, pValue)
    };
  });
};

/**
 * Calculate variance for local Moran's I
 * @private
 */
const calculateLocalVariance = (weights, values, mean, variance) => {
  const n = values.length;
  let w_sum = 0, w2_sum = 0;

  Object.values(weights).forEach(weight => {
    w_sum += weight;
    w2_sum += weight * weight;
  });

  const b2 = values.reduce((sum, val) => 
    sum + Math.pow(val - mean, 4), 0
  ) / (n * Math.pow(variance, 2));

  return (w2_sum * (n - b2)) / (n - 1);
};

/**
 * Determine cluster type based on LISA statistics
 * @private
 */
const determineClusterType = (value, mean, localSum, pValue) => {
  if (pValue >= 0.05) return 'not_significant';

  const highLow = value > mean ? 'high' : 'low';
  const neighborHighLow = localSum > 0 ? 'high' : 'low';

  return `${highLow}-${neighborHighLow}`;
};

/**
 * Calculate market integration index
 * @param {Array} prices - Array of price time series
 * @param {Object} weights - Spatial weights matrix
 * @returns {Object} Market integration metrics
 */
export const calculateMarketIntegration = (prices, weights) => {
  if (!prices?.length || !weights) return null;

  // Calculate price correlations
  const correlations = {};
  prices.forEach((series1, i) => {
    correlations[i] = {};
    prices.forEach((series2, j) => {
      if (i !== j) {
        correlations[i][j] = calculateCorrelation(series1, series2);
      }
    });
  });

  // Calculate spatial price integration
  const spatialIntegration = calculateMoranI(
    prices.map(series => series[series.length - 1]),
    weights
  );

  // Calculate market accessibility
  const accessibility = calculateAccessibility(correlations, weights);

  return {
    correlations,
    spatialIntegration,
    accessibility,
    overall: (
      Object.values(accessibility).reduce((sum, val) => sum + val, 0) / 
      Object.keys(accessibility).length
    )
  };
};

/**
 * Calculate correlation between two time series
 * @private
 */
const calculateCorrelation = (series1, series2) => {
  const n = Math.min(series1.length, series2.length);
  const mean1 = series1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = series2.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = series1[i] - mean1;
    const diff2 = series2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }

  return numerator / Math.sqrt(denom1 * denom2);
};

/**
 * Calculate market accessibility scores
 * @private
 */
const calculateAccessibility = (correlations, weights) => {
  const accessibility = {};

  Object.keys(correlations).forEach(market => {
    const neighbors = weights[market] || {};
    let weightedSum = 0;
    let weightSum = 0;

    Object.entries(neighbors).forEach(([neighbor, weight]) => {
      weightedSum += (correlations[market]?.[neighbor] || 0) * weight;
      weightSum += weight;
    });

    accessibility[market] = weightSum > 0 ? weightedSum / weightSum : 0;
  });

  return accessibility;
};
