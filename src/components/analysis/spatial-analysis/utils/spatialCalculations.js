// src/components/analysis/spatial-analysis/utils/spatialCalculations.js

export const calculateQuadrantStatistics = (scatterData) => {
  if (!scatterData?.length) return {};
  
  const quadrants = scatterData.reduce((acc, point) => {
    if (point.x >= 0 && point.y >= 0) acc.q1++;
    else if (point.x < 0 && point.y >= 0) acc.q2++;
    else if (point.x < 0 && point.y < 0) acc.q3++;
    else acc.q4++;
    return acc;
  }, { q1: 0, q2: 0, q3: 0, q4: 0 });
  
  const total = scatterData.length;
  return {
    quadrants,
    percentages: {
      q1: (quadrants.q1 / total) * 100,
      q2: (quadrants.q2 / total) * 100,
      q3: (quadrants.q3 / total) * 100,
      q4: (quadrants.q4 / total) * 100
    }
  };
};

export const calculateSpatialStatistics = (localMorans, timeSeriesData) => {
  if (!localMorans || !timeSeriesData) return null;

  const regions = Object.keys(localMorans);
  const stats = {
    significantClusters: 0,
    highHighClusters: 0,
    lowLowClusters: 0,
    outliers: 0,
    averageLocalI: 0
  };

  regions.forEach(region => {
    const result = localMorans[region];
    if (result && result.p_value !== null && result.p_value < 0.05) {
      stats.significantClusters++;
      switch (result.cluster_type) {
        case 'high-high':
          stats.highHighClusters++;
          break;
        case 'low-low':
          stats.lowLowClusters++;
          break;
        case 'high-low':
        case 'low-high':
          stats.outliers++;
          break;
        default:
          break;
      }
    }
    stats.averageLocalI += Math.abs(result.local_i || 0);
  });

  stats.averageLocalI /= regions.length || 1;
  stats.clusteringIndex = (stats.highHighClusters + stats.lowLowClusters) / (regions.length || 1);
  stats.outliersRatio = stats.outliers / (regions.length || 1);

  return stats;
};