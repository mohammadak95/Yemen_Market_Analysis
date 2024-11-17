import { useState, useEffect, useMemo } from 'react';
import { marketDataProcessor } from '../utils/MarketDataProcessor';
import { spatialSystem } from '../utils/SpatialSystem';
import { monitoringSystem } from '../utils/MonitoringSystem';
import _ from 'lodash';

/**
 * Custom hook for analyzing market integration patterns
 * @param {Object} options - Analysis configuration options
 * @param {string} options.commodity - Selected commodity
 * @param {string[]} options.selectedMarkets - Array of selected markets
 * @param {string} options.timeRange - Time range for analysis
 * @returns {Object} Market integration analysis results and status
 */
export const useMarketIntegration = ({ commodity, selectedMarkets, timeRange }) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const analyzeIntegration = async () => {
      if (!commodity || !selectedMarkets?.length) return;

      const metric = monitoringSystem.startMetric('market-integration-analysis');
      setStatus('loading');
      setError(null);

      try {
        // Process commodity data with spatial integration
        const processedData = await marketDataProcessor.processCommodityData(
          commodity,
          { timeRange }
        );

        // Calculate spatial metrics for selected markets
        const spatialMetrics = await spatialSystem.processSpatialData({
          markets: selectedMarkets,
          timeSeriesData: processedData.timeSeriesData,
          flowAnalysis: processedData.marketIntegration
        });

        // Combine results
        setData({
          timeSeriesAnalysis: processedData.timeSeriesData,
          marketIntegration: processedData.marketIntegration,
          spatialDependence: processedData.spatialDependence,
          spatialMetrics,
          priceDifferentials: processedData.priceDifferentials,
          metadata: processedData.metadata
        });

        setStatus('succeeded');
        metric.finish({ status: 'success' });

      } catch (err) {
        console.error('Error in market integration analysis:', err);
        setError(err.message);
        setStatus('failed');
        metric.finish({ status: 'error', error: err.message });
      }
    };

    analyzeIntegration();
  }, [commodity, selectedMarkets, timeRange]);

  // Compute derived metrics
  const derivedMetrics = useMemo(() => {
    if (!data) return null;

    return {
      // Market coverage metrics
      marketCoverage: {
        total: selectedMarkets.length,
        integrated: data.marketIntegration.summary.marketCoverage,
        coverage: (data.marketIntegration.summary.marketCoverage / selectedMarkets.length) * 100
      },

      // Integration strength metrics
      integrationStrength: {
        overall: data.marketIntegration.summary.avgIntegration,
        spatial: data.spatialDependence?.moranI,
        temporal: _.meanBy(data.marketIntegration.monthlyMetrics, 'tvmii')
      },

      // Market efficiency metrics
      efficiency: {
        priceConvergence: calculatePriceConvergence(data.priceDifferentials),
        flowEfficiency: data.marketIntegration.summary.avgFlowWeight,
        spatialEfficiency: data.spatialMetrics?.efficiency || null
      },

      // Stability metrics
      stability: calculateStabilityMetrics(data.timeSeriesAnalysis)
    };
  }, [data, selectedMarkets]);

  return {
    data,
    derivedMetrics,
    status,
    error
  };
};

/**
 * Calculate price convergence metrics from price differentials
 */
function calculatePriceConvergence(priceDiffs) {
  if (!priceDiffs) return null;

  const convergenceMetrics = {};
  Object.entries(priceDiffs).forEach(([market, diffs]) => {
    convergenceMetrics[market] = diffs.map(diff => ({
      otherMarket: diff.otherMarket,
      convergenceRate: diff.regression.coefficient,
      significance: diff.regression.pValue < 0.05,
      rSquared: diff.regression.rSquared
    }));
  });

  return {
    marketPairs: convergenceMetrics,
    summary: {
      averageConvergence: _.meanBy(
        Object.values(convergenceMetrics).flat(),
        'convergenceRate'
      ),
      significantPairs: Object.values(convergenceMetrics)
        .flat()
        .filter(m => m.significance).length
    }
  };
}

/**
 * Calculate stability metrics from time series data
 */
function calculateStabilityMetrics(timeSeriesData) {
  if (!timeSeriesData) return null;

  return timeSeriesData.map(series => ({
    market: series.market,
    priceStability: {
      coefficientOfVariation: series.statistics.std / series.statistics.mean,
      range: series.statistics.max - series.statistics.min,
      normalizedRange: (series.statistics.max - series.statistics.min) / series.statistics.mean
    }
  }));
}