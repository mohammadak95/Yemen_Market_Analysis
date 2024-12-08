import { mean, sum } from 'd3-array';

/**
 * Create spatial weights matrix from flow data with improved normalization
 */
const createSpatialWeightsMatrix = (flowData) => {
  const weights = {};
  
  // Initialize weights matrix
  flowData.forEach(flow => {
    if (!weights[flow.source]) weights[flow.source] = {};
    if (!weights[flow.target]) weights[flow.target] = {};
  });

  // Calculate max flow for normalization
  const maxFlow = Math.max(...flowData.map(flow => flow.avg_flow));

  // Fill weights matrix using normalized flow data
  flowData.forEach(flow => {
    // Normalize flows to [0,1] range and ensure symmetry
    const normalizedWeight = flow.avg_flow / maxFlow;
    weights[flow.source][flow.target] = normalizedWeight;
    weights[flow.target][flow.source] = normalizedWeight;
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
 * Calculate Global Moran's I statistic with improved inference
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
    
    // Calculate numerator (spatial covariance) and denominator
    let numerator = 0;
    let denominator = sum(deviations.map(d => d * d));
    let sumWeights = 0;

    // Calculate Moran's I components with improved precision
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

    // Ensure valid denominator
    if (Math.abs(denominator) < 1e-10) denominator = 1e-10;

    // Calculate Moran's I with improved numerical stability
    const n = data.length;
    const moranI = (n / sumWeights) * (numerator / denominator);

    // Calculate expected I and variance with improved precision
    const expectedI = -1 / (n - 1);
    const variance = calculateMoranVariance(n, sumWeights, weights, deviations);

    // Calculate z-score and p-value with improved significance testing
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
 * Calculate Local Moran's I statistics with improved inference
 */
export const calculateLocalMoranI = (data, flowData) => {
  if (!data?.length || !flowData?.length) {
    return {};
  }

  try {
    // Create spatial weights matrix from flow data
    const weights = createSpatialWeightsMatrix(flowData);

    // Calculate global statistics with improved precision
    const values = data.map(d => d.usdPrice);
    const dataMean = mean(values);
    const dataStd = calculateStandardDeviation(values);
    const deviations = values.map(val => val - dataMean);

    // Ensure valid variance
    const variance = Math.max(dataStd * dataStd, 1e-10);

    const results = {};

    // Calculate local statistics for each region with improved inference
    data.forEach((observation, i) => {
      const region = observation.region;
      let localI = 0;
      let weightSum = 0;

      // Calculate spatial lag with improved precision
      data.forEach((neighbor, j) => {
        if (i !== j) {
          const weight = weights[region]?.[neighbor.region] || 0;
          localI += weight * deviations[j];
          weightSum += weight;
        }
      });

      // Standardize local I with improved numerical stability
      const standardizedI = (deviations[i] / variance) * localI;

      // Calculate variance and z-score with improved inference
      const localVariance = calculateLocalVariance(weights[region], deviations, variance, weightSum);
      const zScore = standardizedI / Math.sqrt(localVariance);
      const pValue = calculatePValue(zScore);

      // Determine cluster type using standardized values
      const clusterType = determineClusterType(
        deviations[i] / dataStd, 
        standardizedI, 
        pValue
      );

      results[region] = {
        local_i: standardizedI,
        z_score: zScore,
        p_value: pValue,
        cluster_type: clusterType,
        variance: localVariance,
        spatial_lag: localI / Math.max(Math.abs(deviations[i]), 1e-10)
      };
    });

    return results;
  } catch (error) {
    console.error('Error calculating Local Moran\'s I:', error);
    return {};
  }
};

/**
 * Calculate standard deviation with improved numerical stability
 */
const calculateStandardDeviation = (values) => {
  if (!values?.length) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(Math.max(mean(squareDiffs), 1e-10));
};

/**
 * Calculate variance for Moran's I with improved precision
 */
const calculateMoranVariance = (n, sumWeights, weights, deviations) => {
  const s1 = calculateS1(weights);
  const s2 = calculateS2(weights);
  
  // Calculate moments with improved numerical stability
  const m2 = Math.max(sum(deviations.map(d => d * d)) / n, 1e-10);
  const m4 = Math.max(sum(deviations.map(d => d * d * d * d)) / n, 1e-10);

  const term1 = n * ((n * n - 3 * n + 3) * s1 - n * s2 + 3 * sumWeights * sumWeights);
  const term2 = (m4 / (m2 * m2)) * ((n * n - n) * s1 - 2 * n * s2 + 6 * sumWeights * sumWeights);
  const term3 = -1 * (n - 1) * (n - 2) * (n - 3) * sumWeights * sumWeights;

  return Math.max(
    (term1 - term2 + term3) / 
    ((n - 1) * (n - 2) * (n - 3) * sumWeights * sumWeights),
    1e-10
  );
};

/**
 * Calculate variance for Local Moran's I with improved precision
 */
const calculateLocalVariance = (weights, deviations, variance, weightSum) => {
  if (!weights || !deviations?.length) return 1e-10;
  
  const sumSquaredWeights = Object.values(weights).reduce((sum, w) => sum + w * w, 0);
  return Math.max(
    (sumSquaredWeights * (deviations.length - 1)) / 
    ((deviations.length - 2) * variance),
    1e-10
  );
};

/**
 * Calculate p-value from z-score with improved accuracy
 */
const calculatePValue = (zScore) => {
  // Two-tailed test using normal distribution with improved precision
  if (!isFinite(zScore)) return 1;
  const absZ = Math.abs(zScore);
  return 2 * (1 - pnorm(absZ));
};

/**
 * Calculate S1 statistic with improved precision
 */
const calculateS1 = (weights) => {
  let s1 = 0;
  Object.entries(weights).forEach(([region, regionWeights]) => {
    Object.entries(regionWeights).forEach(([neighbor, weight]) => {
      const symmetricWeight = weight + (weights[neighbor]?.[region] || 0);
      s1 += symmetricWeight * symmetricWeight;
    });
  });
  return s1 / 2;
};

/**
 * Calculate S2 statistic with improved precision
 */
const calculateS2 = (weights) => {
  let s2 = 0;
  Object.entries(weights).forEach(([region, regionWeights]) => {
    const rowSum = Object.values(regionWeights).reduce((sum, w) => sum + w, 0);
    const colSum = Object.entries(weights)
      .reduce((sum, [_, neighborWeights]) => sum + (neighborWeights[region] || 0), 0);
    s2 += (rowSum + colSum) * (rowSum + colSum);
  });
  return s2;
};

/**
 * Determine cluster type using standardized values
 */
const determineClusterType = (standardizedDeviation, localI, pValue) => {
  if (pValue > 0.05) return 'not_significant';
  
  // Use standardized values for more robust classification
  const threshold = 0;
  if (standardizedDeviation > threshold && localI > threshold) return 'high-high';
  if (standardizedDeviation < -threshold && localI < -threshold) return 'low-low';
  if (standardizedDeviation > threshold && localI < -threshold) return 'high-low';
  if (standardizedDeviation < -threshold && localI > threshold) return 'low-high';
  
  return 'not_significant';
};

/**
 * Standard normal cumulative distribution function with improved precision
 */
const pnorm = (z) => {
  if (z < -8) return 0;
  if (z > 8) return 1;
  
  // Constants for improved numerical approximation
  const p = 0.2316419;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  
  const a = Math.abs(z);
  const t = 1.0 / (1.0 + a * p);
  
  // Calculate with improved precision
  const b = 0.3989423 * Math.exp(-0.5 * z * z);
  let n = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  n = 1.0 - b * n;
  
  return z < 0 ? 1 - n : n;
};

export default {
  calculateGlobalMoranI,
  calculateLocalMoranI
};
