// src/components/spatialAnalysis/hooks/useSeasonalAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { selectSeasonalAnalysisData } from '../../../selectors/spatialAnalysisSelectors';

/**
 * Custom hook for analyzing seasonal patterns in market data
 * @returns {Object} Seasonal analysis results
 */
export const useSeasonalAnalysis = () => {
  const seasonalData = useSelector(selectSeasonalAnalysisData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('seasonal-analysis-hook');

    try {
      if (!seasonalData) {
        return {
          data: null,
          loading: false,
          error: 'No seasonal data available'
        };
      }

      const { monthlyStats, summary } = seasonalData;

      // Format data for visualization and analysis
      const formattedData = {
        // Monthly patterns with additional metrics
        patterns: monthlyStats.map(month => {
          const baselinePrice = monthlyStats.reduce((sum, m) => sum + m.averagePrice, 0) / 
                              monthlyStats.length;
          
          return {
            month: month.month,
            averagePrice: month.averagePrice,
            volatility: month.volatility,
            // Calculate seasonal indices
            seasonalIndex: month.averagePrice / baselinePrice,
            deviation: (month.averagePrice - baselinePrice) / baselinePrice,
            isHighSeason: month.averagePrice > baselinePrice * 1.1,
            isLowSeason: month.averagePrice < baselinePrice * 0.9
          };
        }),

        // Seasonal characteristics
        seasonality: {
          highSeasons: monthlyStats
            .filter(m => m.averagePrice > summary.highestPriceMonth.averagePrice * 0.9)
            .map(m => m.month),
          lowSeasons: monthlyStats
            .filter(m => m.averagePrice < summary.lowestPriceMonth.averagePrice * 1.1)
            .map(m => m.month),
          peakMonth: summary.highestPriceMonth.month,
          troughMonth: summary.lowestPriceMonth.month,
          seasonalStrength: (
            summary.highestPriceMonth.averagePrice - 
            summary.lowestPriceMonth.averagePrice
          ) / summary.lowestPriceMonth.averagePrice
        },

        // Price stability analysis
        stability: {
          monthlyVolatility: monthlyStats.map(m => ({
            month: m.month,
            volatility: m.volatility
          })),
          mostStableMonth: monthlyStats.reduce((min, curr) => 
            curr.volatility < min.volatility ? curr : min
          ),
          mostVolatileMonth: monthlyStats.reduce((max, curr) => 
            curr.volatility > max.volatility ? curr : max
          )
        },

        // Enhanced summary statistics
        summary: {
          ...summary,
          averageSeasonalVariation: monthlyStats.reduce((sum, month) => {
            const baselinePrice = monthlyStats.reduce((s, m) => s + m.averagePrice, 0) / 
                                monthlyStats.length;
            return sum + Math.abs(month.averagePrice - baselinePrice) / baselinePrice;
          }, 0) / monthlyStats.length,
          seasonalityIndex: (
            summary.highestPriceMonth.averagePrice - 
            summary.lowestPriceMonth.averagePrice
          ) / (
            summary.highestPriceMonth.averagePrice + 
            summary.lowestPriceMonth.averagePrice
          ) * 2,
          priceStability: 1 - monthlyStats.reduce((sum, m) => sum + m.volatility, 0) / 
                         monthlyStats.length
        }
      };

      // Add seasonal cycle detection
      const seasonalCycle = detectSeasonalCycle(formattedData.patterns);
      formattedData.seasonality.cycle = seasonalCycle;

      metric.finish({ status: 'success' });

      return {
        data: formattedData,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error in useSeasonalAnalysis:', error);
      metric.finish({ status: 'error', error: error.message });

      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [seasonalData]);
};

/**
 * Helper function to detect seasonal cycles in price patterns
 * @param {Array} patterns - Monthly price patterns
 * @returns {Object} Detected seasonal cycle information
 */
const detectSeasonalCycle = (patterns) => {
  // Initialize cycle detection
  const pricePattern = patterns.map(p => p.seasonalIndex);
  const n = pricePattern.length;
  
  // Calculate autocorrelation for different lags
  const correlations = [];
  for (let lag = 1; lag <= Math.floor(n/2); lag++) {
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < n - lag; i++) {
      correlation += (pricePattern[i] - 1) * (pricePattern[i + lag] - 1);
      count++;
    }
    
    correlations.push({
      lag,
      correlation: correlation / count
    });
  }

  // Find the strongest correlation
  const strongestCycle = correlations.reduce((max, curr) => 
    curr.correlation > max.correlation ? curr : max
  );

  return {
    length: strongestCycle.lag,
    strength: strongestCycle.correlation,
    isSignificant: strongestCycle.correlation > 0.5
  };
};

export default useSeasonalAnalysis;
