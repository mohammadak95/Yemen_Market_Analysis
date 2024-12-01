import { mean, sum } from 'd3-array';

/**
 * Create spatial weights matrix from flow data
 */
const createSpatialWeightsMatrix = (flowData) => {
  const weights = {};
  
  // Initialize weights matrix
  flowData.forEach(flow => {
    if (!weights[flow.source]) weights[flow.source] = {};
    if (!weights[flow.target]) weights[flow.target] = {};
  });

  // Fill weights matrix using flow data
  flowData.forEach(flow => {
    // Use normalized flow values (avg_flow) as weights
    weights[flow.source][flow.target] = flow.avg_flow;
    weights[flow.target][flow.source] = flow.avg_flow; // Make matrix symmetric
  });

  // Row standardize the weights matrix
  Object.keys(weights).forEach(region => {
    const rowSum = Object.values(weights[region]).reduce((sum, weight) => sum + weight, 0);
    if (rowSum > 0) {
      Object.keys(weights[region]).forEach(neighbor => {
        weights[region][neighbor] = weights[region][neighbor] / rowSum;
      });
    }
  });

  return weights;
};

/**
 * Calculate Global Moran's I statistic with inference
 */
export const calculateGlobalMoranI = (data, flowData) => {
  if (!data?.length || !flowData?.length) {
    return {
      moran_i: 0,
      p_value: 1,
      z_score: 0,
      significance: false
    };
  }

  try {
    // Create spatial weights matrix from flow data
    const weights = createSpatialWeightsMatrix(flowData);

    // Extract values and calculate mean
    const values = data.map(d => d.usdPrice);
    const dataMean = mean(values);
    const deviations = values.map(val => val - dataMean);
    
    // Calculate numerator (spatial covariance)
    let numerator = 0;
    let denominator = sum(deviations.map(d => d * d));
    let sumWeights = 0;

    // Calculate Moran's I components
    data.forEach((observation, i) => {
      const region = observation.region;
      data.forEach((neighbor, j) => {
        if (i !== j) {
          const weight = weights[region]?.[neighbor.region] || 0;
          numerator += weight * deviations[i] * deviations[j];
          sumWeights += weight;
        }
      });
    });

    // Calculate Moran's I
    const n = data.length;
    const moranI = (n / sumWeights) * (numerator / denominator);

    // Calculate expected I and variance
    const expectedI = -1 / (n - 1);
    const variance = calculateMoranVariance(n, sumWeights, weights, deviations);

    // Calculate z-score and p-value
    const zScore = (moranI - expectedI) / Math.sqrt(variance);
    const pValue = calculatePValue(zScore);

    return {
      moran_i: moranI,
      p_value: pValue,
      z_score: zScore,
      significance: pValue <= 0.05
    };
  } catch (error) {
    console.error('Error calculating Global Moran\'s I:', error);
    return {
      moran_i: 0,
      p_value: 1,
      z_score: 0,
      significance: false
    };
  }
};

/**
 * Calculate Local Moran's I statistics
 */
export const calculateLocalMoranI = (data, flowData) => {
  if (!data?.length || !flowData?.length) {
    return {};
  }

  try {
    // Create spatial weights matrix from flow data
    const weights = createSpatialWeightsMatrix(flowData);

    // Calculate global statistics
    const values = data.map(d => d.usdPrice);
    const dataMean = mean(values);
    const dataStd = calculateStandardDeviation(values);
    const deviations = values.map(val => val - dataMean);

    const results = {};

    // Calculate local statistics for each region
    data.forEach((observation, i) => {
      const region = observation.region;
      let localI = 0;
      let weightSum = 0;

      // Calculate spatial lag
      data.forEach((neighbor, j) => {
        if (i !== j) {
          const weight = weights[region]?.[neighbor.region] || 0;
          localI += weight * deviations[j];
          weightSum += weight;
        }
      });

      // Standardize local I
      const standardizedI = (deviations[i] / (dataStd * dataStd)) * localI;

      // Calculate variance and z-score
      const variance = calculateLocalVariance(weights[region], deviations, dataStd * dataStd, weightSum);
      const zScore = standardizedI / Math.sqrt(variance);
      const pValue = calculatePValue(zScore);

      // Determine cluster type
      const clusterType = determineClusterType(deviations[i], standardizedI, pValue);

      results[region] = {
        local_i: standardizedI,
        z_score: zScore,
        p_value: pValue,
        cluster_type: clusterType,
        spatial_lag: localI / deviations[i]
      };
    });

    return results;
  } catch (error) {
    console.error('Error calculating Local Moran\'s I:', error);
    return {};
  }
};

/**
 * Calculate standard deviation
 */
const calculateStandardDeviation = (values) => {
  if (!values?.length) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
};

/**
 * Calculate variance for Moran's I
 */
const calculateMoranVariance = (n, sumWeights, weights, deviations) => {
  const s1 = calculateS1(weights);
  const s2 = calculateS2(weights);
  const m2 = sum(deviations.map(d => d * d)) / n;
  const m4 = sum(deviations.map(d => d * d * d * d)) / n;

  const term1 = n * ((n * n - 3 * n + 3) * s1 - n * s2 + 3 * sumWeights * sumWeights);
  const term2 = (m4 / (m2 * m2)) * ((n * n - n) * s1 - 2 * n * s2 + 6 * sumWeights * sumWeights);
  const term3 = -1 * (n - 1) * (n - 2) * (n - 3) * sumWeights * sumWeights;

  return Math.max((term1 - term2 + term3) / ((n - 1) * (n - 2) * (n - 3) * sumWeights * sumWeights), 0.0001);
};

/**
 * Calculate variance for Local Moran's I
 */
const calculateLocalVariance = (weights, deviations, variance, weightSum) => {
  if (!weights || !deviations?.length) return 0.0001;
  
  const sumSquaredWeights = Object.values(weights).reduce((sum, w) => sum + w * w, 0);
  return Math.max((sumSquaredWeights * (deviations.length - 1)) / ((deviations.length - 2) * variance), 0.0001);
};

/**
 * Calculate p-value from z-score
 */
const calculatePValue = (zScore) => {
  // Two-tailed test using normal distribution
  const absZ = Math.abs(zScore);
  return 2 * (1 - pnorm(absZ));
};

/**
 * Calculate S1 statistic
 */
const calculateS1 = (weights) => {
  let s1 = 0;
  Object.entries(weights).forEach(([region, regionWeights]) => {
    Object.entries(regionWeights).forEach(([neighbor, weight]) => {
      s1 += (weight + (weights[neighbor]?.[region] || 0)) * (weight + (weights[neighbor]?.[region] || 0));
    });
  });
  return s1 / 2;
};

/**
 * Calculate S2 statistic
 */
const calculateS2 = (weights) => {
  let s2 = 0;
  Object.entries(weights).forEach(([region, regionWeights]) => {
    const rowSum = Object.values(regionWeights).reduce((sum, w) => sum + w, 0);
    const colSum = Object.entries(weights).reduce((sum, [_, neighborWeights]) => sum + (neighborWeights[region] || 0), 0);
    s2 += (rowSum + colSum) * (rowSum + colSum);
  });
  return s2;
};

/**
 * Determine cluster type
 */
const determineClusterType = (deviation, localI, pValue) => {
  if (pValue > 0.05) return 'not_significant';
  if (deviation > 0 && localI > 0) return 'high-high';
  if (deviation < 0 && localI < 0) return 'low-low';
  if (deviation > 0 && localI < 0) return 'high-low';
  return 'low-high';
};

/**
 * Standard normal cumulative distribution function
 */
const pnorm = (z) => {
  if (z < -6) return 0;
  if (z > 6) return 1;
  
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c2 = 0.3989423;
  
  const a = Math.abs(z);
  const t = 1.0 / (1.0 + a * p);
  const b = c2 * Math.exp((-z) * (z / 2.0));
  let n = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  n = 1.0 - b * n;
  return z < 0 ? 1 - n : n;
};

export default {
  calculateGlobalMoranI,
  calculateLocalMoranI
};
