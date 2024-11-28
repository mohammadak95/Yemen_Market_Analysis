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

// Export testing utilities
export const __testing = {
  calculateRobustBaseline,
  calculateStandardDeviation,
  getDefaultShockStats,
  getDefaultPropagationPatterns,
  calculateShockIntensity
};