// src/components/analysis/spatial-analysis/utils/shockAnalysis.js

/**
 * Analyzes market shocks based on time series data.
 * @param {Array} timeSeriesData - Array of time series data for markets.
 * @param {number} threshold - Threshold for detecting significant price changes.
 * @returns {Array} Array of detected shocks with their properties.
 */
export const analyzeMarketShocks = (timeSeriesData, threshold = 0.1) => {
  const shocks = [];

  // Ensure timeSeriesData includes region
  const sortedData = timeSeriesData
    .filter((data) => data.region && data.usdPrice)
    .sort((a, b) => {
      if (a.region === b.region) {
        return new Date(a.month) - new Date(b.month);
      }
      return a.region.localeCompare(b.region);
    });

  const previousPrices = {};

  sortedData.forEach((data) => {
    const { region, month, usdPrice: currentPrice } = data;
    const previousPrice = previousPrices[region];

    if (previousPrice !== undefined) {
      const priceChange = calculatePriceChange(currentPrice, previousPrice);
      if (Math.abs(priceChange) >= threshold) {
        shocks.push({
          region,
          date: month + '-01',
          magnitude: Math.abs(priceChange),
          shock_type: priceChange > 0 ? 'price surge' : 'price drop',
          previous_price: previousPrice,
          current_price: currentPrice,
        });
      }
    }

    previousPrices[region] = currentPrice;
  });

  return shocks;
};


/**
 * Calculates shock statistics such as total shocks, maximum magnitude, and average magnitude.
 * @param {Array} shocks - Array of detected shocks.
 * @returns {Object} Object containing shock statistics.
 */
export const calculateShockStatistics = (shocks) => {
  if (!shocks.length) {
    return {
      totalShocks: 0,
      maxMagnitude: 0,
      avgMagnitude: 0,
      shockTypes: {},
      regionsAffected: 0,
      temporalDistribution: {}
    };
  }

  const totalShocks = shocks.length;
  const maxMagnitude = Math.max(...shocks.map((shock) => shock.magnitude));
  const avgMagnitude = shocks.reduce((sum, shock) => sum + shock.magnitude, 0) / totalShocks;

  // Count shock types
  const shockTypes = shocks.reduce((acc, shock) => {
    acc[shock.shock_type] = (acc[shock.shock_type] || 0) + 1;
    return acc;
  }, {});

  // Count unique regions affected
  const uniqueRegions = new Set(shocks.map(shock => shock.region));
  const regionsAffected = uniqueRegions.size;

  // Analyze temporal distribution
  const temporalDistribution = shocks.reduce((acc, shock) => {
    const month = new Date(shock.date).toISOString().slice(0, 7); // YYYY-MM format
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  return {
    totalShocks,
    maxMagnitude,
    avgMagnitude,
    shockTypes,
    regionsAffected,
    temporalDistribution
  };
};

/**
 * Analyzes shock propagation patterns between regions over time.
 * @param {Array} shocks - Array of detected shocks.
 * @param {Object} spatialAutocorrelation - Object containing spatial autocorrelation data.
 * @returns {Object} Object containing shock propagation patterns and metrics.
 */
export const analyzeShockPropagation = (shocks, spatialAutocorrelation) => {
  if (!shocks.length || !spatialAutocorrelation) {
    return {
      propagationPatterns: [],
      spatialClusters: [],
      propagationMetrics: {
        averagePropagationTime: 0,
        spatialCorrelation: 0,
        clusterCount: 0
      }
    };
  }

  // Sort shocks by date
  const sortedShocks = [...shocks].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Identify propagation patterns
  const propagationPatterns = [];
  const timeWindow = 7; // 7-day window for propagation analysis

  sortedShocks.forEach((shock, index) => {
    const shockDate = new Date(shock.date);
    const windowEnd = new Date(shockDate.getTime() + (timeWindow * 24 * 60 * 60 * 1000));

    // Find subsequent shocks within the time window
    const subsequentShocks = sortedShocks.slice(index + 1)
      .filter(s => new Date(s.date) <= windowEnd);

    // Check for spatial correlation with subsequent shocks
    subsequentShocks.forEach(subShock => {
      const spatialWeight = spatialAutocorrelation[`${shock.region}-${subShock.region}`] || 0;
      
      if (spatialWeight > 0) {
        propagationPatterns.push({
          sourceRegion: shock.region,
          targetRegion: subShock.region,
          sourceDate: shock.date,
          targetDate: subShock.date,
          propagationTime: (new Date(subShock.date) - new Date(shock.date)) / (24 * 60 * 60 * 1000), // days
          spatialWeight,
          shockType: shock.shock_type,
          magnitude: shock.magnitude
        });
      }
    });
  });

  // Identify spatial clusters of shocks
  const spatialClusters = identifySpatialClusters(shocks, spatialAutocorrelation);

  // Calculate propagation metrics
  const propagationMetrics = {
    averagePropagationTime: propagationPatterns.length > 0
      ? propagationPatterns.reduce((sum, p) => sum + p.propagationTime, 0) / propagationPatterns.length
      : 0,
    spatialCorrelation: calculateSpatialCorrelation(propagationPatterns),
    clusterCount: spatialClusters.length
  };

  return {
    propagationPatterns,
    spatialClusters,
    propagationMetrics
  };
};

/**
 * Identifies clusters of spatially correlated shocks.
 * @param {Array} shocks - Array of shocks.
 * @param {Object} spatialAutocorrelation - Spatial weights matrix.
 * @returns {Array} Array of shock clusters.
 */
const identifySpatialClusters = (shocks, spatialAutocorrelation) => {
  const clusters = [];
  const visited = new Set();

  shocks.forEach(shock => {
    if (!visited.has(shock.region)) {
      const cluster = findCluster(shock, shocks, spatialAutocorrelation, visited);
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }
  });

  return clusters;
};

/**
 * Finds a cluster of spatially connected shocks.
 * @param {Object} shock - Initial shock.
 * @param {Array} allShocks - All shocks.
 * @param {Object} spatialAutocorrelation - Spatial weights matrix.
 * @param {Set} visited - Set of visited regions.
 * @returns {Array} Array of connected shocks.
 */
const findCluster = (shock, allShocks, spatialAutocorrelation, visited) => {
  const cluster = [shock];
  visited.add(shock.region);

  allShocks.forEach(otherShock => {
    if (!visited.has(otherShock.region)) {
      const spatialWeight = spatialAutocorrelation[`${shock.region}-${otherShock.region}`] || 0;
      if (spatialWeight > 0 && Math.abs(new Date(shock.date) - new Date(otherShock.date)) <= 7 * 24 * 60 * 60 * 1000) {
        cluster.push(...findCluster(otherShock, allShocks, spatialAutocorrelation, visited));
      }
    }
  });

  return cluster;
};

/**
 * Calculates spatial correlation coefficient for shock propagation patterns.
 * @param {Array} propagationPatterns - Array of propagation patterns.
 * @returns {number} Spatial correlation coefficient.
 */
const calculateSpatialCorrelation = (propagationPatterns) => {
  if (propagationPatterns.length === 0) return 0;

  const weights = propagationPatterns.map(p => p.spatialWeight);
  const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;

  return variance > 0 ? Math.sqrt(variance) / mean : 0;
};
