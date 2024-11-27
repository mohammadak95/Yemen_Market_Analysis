// src/components/analysis/spatial-analysis/hooks/useShockAnalysis.js

import { useMemo } from 'react';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';
import { DEBUG_SHOCK_ANALYSIS } from '../../../../utils/shockAnalysisDebug';

export const useShockAnalysis = (
  timeSeriesData,
  spatialAutocorrelation,
  threshold = 0.1,
  marketShocks
) => {
  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('shock-analysis', {
      hasTimeData: !!timeSeriesData?.length,
      hasAutocorrelation: !!spatialAutocorrelation,
      threshold,
    });

    try {
      if (!timeSeriesData?.length || !spatialAutocorrelation) {
        console.warn('Missing required data for shock analysis');
        return {
          shocks: [],
          shockStats: getDefaultShockStats(),
          propagationPatterns: getDefaultPropagationPatterns(),
        };
      }

      let shocks = [];

      if (marketShocks && marketShocks.length > 0) {
        // Use existing market shocks
        shocks = marketShocks.filter((shock) => shock.magnitude >= threshold);
      } else {
        // Compute shocks from timeSeriesData
        shocks = analyzeMarketShocks(timeSeriesData, threshold);
      }

      // Calculate statistics
      const shockStats = calculateShockStatistics(shocks);

      // Analyze propagation with monitoring
      const propagationPatterns = analyzeShockPropagation(
        shocks,
        spatialAutocorrelation
      );
      DEBUG_SHOCK_ANALYSIS.monitorPropagationPatterns(
        propagationPatterns.propagationPatterns
      );

      metric.finish({ status: 'success', shockCount: shocks.length });

      return {
        shocks,
        shockStats,
        propagationPatterns,
      };
    } catch (error) {
      console.error('Error in shock analysis:', error);
      backgroundMonitor.logError('shock-analysis', error);
      metric.finish({ status: 'failed', error: error.message });

      return {
        shocks: [],
        shockStats: getDefaultShockStats(),
        propagationPatterns: getDefaultPropagationPatterns(),
      };
    }
  }, [timeSeriesData, spatialAutocorrelation, threshold, marketShocks]);
};

const analyzeMarketShocks = (timeSeriesData, threshold) => {
  const metric = backgroundMonitor.startMetric('market-shock-analysis');

  try {
    // Ensure timeSeriesData includes region
    const sortedData = timeSeriesData
      .filter((data) => data.region && data.usdPrice)
      .sort((a, b) => {
        if (a.region === b.region) {
          return new Date(a.month) - new Date(b.month);
        }
        return a.region.localeCompare(b.region);
      });

    const shocks = [];
    const previousPrices = {};

    sortedData.forEach((data) => {
      const region = data.region;
      const currentPrice = data.usdPrice;
      const previousPrice = previousPrices[region];

      if (previousPrice !== undefined) {
        const priceChange = calculatePriceChange(currentPrice, previousPrice);
        if (Math.abs(priceChange) >= threshold) {
          shocks.push({
            region,
            date: data.month + '-01',
            magnitude: Math.abs(priceChange),
            shock_type: priceChange > 0 ? 'price_surge' : 'price_drop',
            price_change: priceChange,
            previous_price: previousPrice,
            current_price: currentPrice,
          });
        }
      }

      // Update the previous price for the region
      previousPrices[region] = currentPrice;
    });

    metric.finish({ status: 'success', shockCount: shocks.length });
    return shocks;
  } catch (error) {
    console.error('Error analyzing market shocks:', error);
    metric.finish({ status: 'failed', error: error.message });
    return [];
  }
};

const calculatePriceChange = (currentPrice, previousPrice) => {
  if (previousPrice === 0) return 0;
  return (currentPrice - previousPrice) / previousPrice;
};


/**
 * Calculate shock statistics
 */
const calculateShockStatistics = (shocks) => {
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
      temporalDistribution
    };
  } catch (error) {
    console.error('Error calculating shock statistics:', error);
    return getDefaultShockStats();
  }
};

/**
 * Analyze shock propagation patterns
 */
const analyzeShockPropagation = (shocks, spatialAutocorrelation) => {
  const metric = backgroundMonitor.startMetric('shock-propagation-analysis');

  try {
    if (!Array.isArray(shocks) || !spatialAutocorrelation) {
      return getDefaultPropagationPatterns();
    }

    // Group shocks by region and time
    const shocksByRegionTime = shocks.reduce((acc, shock) => {
      const key = `${shock.region}_${shock.date}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(shock);
      return acc;
    }, {});

    // Identify propagation patterns
    const propagationPatterns = [];
    Object.values(shocksByRegionTime).forEach(regionShocks => {
      if (regionShocks.length > 1) {
        // Sort by magnitude to find primary shock
        const sortedShocks = [...regionShocks].sort((a, b) => b.magnitude - a.magnitude);
        const primaryShock = sortedShocks[0];
        
        // Add propagation pattern
        propagationPatterns.push({
          sourceRegion: primaryShock.region,
          date: primaryShock.date,
          magnitude: primaryShock.magnitude,
          affectedRegions: sortedShocks.slice(1).map(s => ({
            region: s.region,
            magnitude: s.magnitude,
            timeLag: calculateTimeLag(primaryShock.date, s.date)
          }))
        });
      }
    });

    // Calculate propagation metrics
    const propagationMetrics = {
      averagePropagationTime: calculateAveragePropagationTime(propagationPatterns),
      spatialCorrelation: spatialAutocorrelation.global?.I || 0,
      clusterCount: propagationPatterns.length
    };

    metric.finish({ status: 'success', patternCount: propagationPatterns.length });

    return {
      propagationPatterns,
      spatialClusters: identifySpatialClusters(propagationPatterns),
      propagationMetrics
    };
  } catch (error) {
    console.error('Error analyzing shock propagation:', error);
    metric.finish({ status: 'failed', error: error.message });
    return getDefaultPropagationPatterns();
  }
};

/**
 * Calculate time lag between dates in days
 */
const calculateTimeLag = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
};

/**
 * Calculate average propagation time
 */
const calculateAveragePropagationTime = (patterns) => {
  if (!patterns.length) return 0;
  
  const timeLags = patterns.flatMap(p => 
    p.affectedRegions.map(r => r.timeLag)
  );
  
  return timeLags.length > 0 
    ? timeLags.reduce((a, b) => a + b, 0) / timeLags.length 
    : 0;
};

/**
 * Identify spatial clusters in propagation patterns
 */
const identifySpatialClusters = (patterns) => {
  if (!patterns.length) return [];

  // Simple clustering based on region proximity
  const clusters = [];
  patterns.forEach(pattern => {
    const regions = [pattern.sourceRegion, ...pattern.affectedRegions.map(r => r.region)];
    
    // Check if regions belong to existing cluster
    let foundCluster = false;
    for (const cluster of clusters) {
      if (regions.some(r => cluster.regions.includes(r))) {
        cluster.regions.push(...regions);
        cluster.regions = [...new Set(cluster.regions)]; // Remove duplicates
        foundCluster = true;
        break;
      }
    }

    // Create new cluster if no existing cluster found
    if (!foundCluster) {
      clusters.push({
        regions: [...new Set(regions)],
        centerRegion: pattern.sourceRegion,
        magnitude: pattern.magnitude
      });
    }
  });

  return clusters;
};

const getDefaultShockStats = () => ({
  totalShocks: 0,
  maxMagnitude: 0,
  avgMagnitude: 0,
  shockTypes: {},
  regionsAffected: 0,
  temporalDistribution: {}
});

const getDefaultPropagationPatterns = () => ({
  propagationPatterns: [],
  spatialClusters: [],
  propagationMetrics: {
    averagePropagationTime: 0,
    spatialCorrelation: 0,
    clusterCount: 0
  }
});

// Export for testing
export const __testing = {
  getDefaultShockStats,
  getDefaultPropagationPatterns,
  analyzeMarketShocks,
  calculateShockStatistics,
  analyzeShockPropagation,
  identifySpatialClusters
};
