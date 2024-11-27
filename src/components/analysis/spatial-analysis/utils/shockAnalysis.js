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
        acc[data.region] = [];
      }
      
      acc[data.region].push({
        date: data.month,
        price: data.usdPrice,
        conflictIntensity: data.conflictIntensity || 0
      });
      return acc;
    }, {});

    const shocks = [];

    // Analyze each region
    Object.entries(dataByRegion).forEach(([region, timeSeries]) => {
      const sortedData = timeSeries.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Use 3-month rolling window
      const WINDOW_SIZE = 3;
      
      for (let i = WINDOW_SIZE; i < sortedData.length; i++) {
        const currentPrice = sortedData[i].price;
        const windowPrices = sortedData.slice(i - WINDOW_SIZE, i).map(d => d.price);
        const baselinePrice = calculateBaseline(windowPrices);
        
        // Calculate price change as percentage
        const priceChange = (currentPrice - baselinePrice) / baselinePrice;
        
        // Detect significant price changes
        if (Math.abs(priceChange) >= threshold) {
          shocks.push({
            region,
            date: sortedData[i].date + '-01',
            magnitude: Math.abs(priceChange) * 100, // Convert to percentage
            shock_type: priceChange > 0 ? 'price_surge' : 'price_drop',
            price_change: priceChange,
            previous_price: baselinePrice,
            current_price: currentPrice,
            conflict_intensity: sortedData[i].conflictIntensity
          });
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
    console.error('Error in market shock analysis:', error);
    metric.finish({ status: 'failed', error: error.message });
    return [];
  }
};

/**
 * Calculate baseline price from window
 * @param {Array} prices - Array of prices in window
 * @returns {number} Baseline price
 */
const calculateBaseline = (prices) => {
  if (!prices || prices.length === 0) return 0;
  
  // Remove outliers using IQR method
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const validPrices = prices.filter(p => 
    p >= q1 - 1.5 * iqr && 
    p <= q3 + 1.5 * iqr
  );
  
  return validPrices.length > 0
    ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
    : prices.reduce((a, b) => a + b, 0) / prices.length;
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

    const metrics = {
      totalPatterns: propagationPatterns.length,
      avgMagnitude: propagationPatterns.reduce((sum, p) => sum + p.magnitude, 0) / 
        (propagationPatterns.length || 1),
      spatialCorrelation: spatialAutocorrelation.global?.I || 0
    };

    DEBUG_SHOCK_ANALYSIS.log('Propagation analysis complete:', metrics);
    metric.finish({ status: 'success', patternCount: propagationPatterns.length });

    return {
      patterns: propagationPatterns,
      metrics
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

// Export for testing
export const __testing = {
  calculateBaseline,
  analyzeMarketShocks,
  analyzeShockPropagation
};
