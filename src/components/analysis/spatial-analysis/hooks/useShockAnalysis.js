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

      // Use existing market shocks if available
      if (Array.isArray(marketShocks) && marketShocks.length > 0) {
        shocks = marketShocks.filter(shock => (
          shock && 
          typeof shock.magnitude === 'number' && 
          !isNaN(shock.magnitude) &&
          shock.magnitude >= threshold &&
          shock.region &&
          shock.date &&
          shock.shock_type &&
          typeof shock.previous_price === 'number' &&
          typeof shock.current_price === 'number'
        ));

        console.log('Using existing market shocks:', {
          total: marketShocks.length,
          valid: shocks.length
        });
      } else {
        // Compute shocks from time series data
        const validTimeSeriesData = timeSeriesData.filter(d => (
          d && 
          d.region && 
          typeof d.usdPrice === 'number' && 
          !isNaN(d.usdPrice) &&
          d.month
        ));

        console.log('Computing shocks from time series:', {
          total: timeSeriesData.length,
          valid: validTimeSeriesData.length
        });

        shocks = analyzeMarketShocks(validTimeSeriesData, threshold);
      }

      // Calculate statistics with spatial context
      const shockStats = calculateShockStatistics(shocks, spatialAutocorrelation);

      // Analyze propagation patterns
      const propagationPatterns = analyzeShockPropagation(
        shocks,
        spatialAutocorrelation,
        timeSeriesData
      );

      metric.finish({ 
        status: 'success', 
        shockCount: shocks.length,
        spatialCorrelation: spatialAutocorrelation.global?.I || 0
      });

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

    console.log('Shock analysis complete:', {
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

const calculateRobustBaseline = (prices) => {
  if (!prices || prices.length === 0) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
};

const calculateStandardDeviation = (values) => {
  if (!values || values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
};

const calculateShockStatistics = (shocks, spatialAutocorrelation) => {
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

const analyzeShockPropagation = (shocks, spatialAutocorrelation) => {
  const metric = backgroundMonitor.startMetric('shock-propagation-analysis');

  try {
    if (!Array.isArray(shocks) || !spatialAutocorrelation) {
      return getDefaultPropagationPatterns();
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
      propagationPatterns,
      spatialClusters: [],
      propagationMetrics: {
        averagePropagationTime: 0,
        spatialCorrelation: spatialAutocorrelation.global?.I || 0,
        clusterCount: propagationPatterns.length
      }
    };
  } catch (error) {
    console.error('Error analyzing shock propagation:', error);
    metric.finish({ status: 'failed', error: error.message });
    return getDefaultPropagationPatterns();
  }
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
  analyzeShockPropagation
};
