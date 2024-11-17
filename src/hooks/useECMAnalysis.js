//src/hooks/useECMAnalysis.js

import { useState, useEffect, useMemo } from 'react';
import { monitoringSystem } from '../utils/MonitoringSystem';
import Papa from 'papaparse';
import _ from 'lodash';

/**
 * Custom hook for Error Correction Model (ECM) analysis
 * Handles cointegration testing and ECM estimation for market price series
 * 
 * @param {Object} options Analysis configuration
 * @param {string} options.commodity Selected commodity
 * @param {string} options.baseMarket Base market for comparison
 * @param {string[]} options.comparisonMarkets Markets to compare against base
 * @param {string} options.regime Analysis regime (unified, north-south, south-north)
 */
export const useECMAnalysis = ({
  commodity,
  baseMarket,
  comparisonMarkets,
  regime = 'unified'
}) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const performECMAnalysis = async () => {
      if (!commodity || !baseMarket || !comparisonMarkets?.length) return;

      const metric = monitoringSystem.startMetric('ecm-analysis');
      setStatus('loading');
      setError(null);

      try {
        // Load time series data
        const timeSeriesResponse = await fetch('time_varying_flows.csv');
        const timeSeriesText = await timeSeriesResponse.text();
        const timeSeriesData = await new Promise((resolve) => {
          Papa.parse(timeSeriesText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data)
          });
        });

        // Filter data for selected commodity and markets
        const relevantData = timeSeriesData.filter(row => 
          row.commodity.toLowerCase() === commodity.toLowerCase() &&
          (row.source === baseMarket || comparisonMarkets.includes(row.source))
        );

        // Organize price series by market
        const priceSeriesByMarket = _.groupBy(relevantData, 'source');
        
        // Perform analysis for each comparison market
        const analysisResults = await Promise.all(
          comparisonMarkets.map(async market => {
            const baseSeriesRaw = priceSeriesByMarket[baseMarket] || [];
            const compSeriesRaw = priceSeriesByMarket[market] || [];

            // Align time series and prepare for analysis
            const { baseSeries, compSeries } = alignTimeSeries(
              baseSeriesRaw,
              compSeriesRaw
            );

            // Perform cointegration test
            const cointResult = await testCointegration(
              baseSeries,
              compSeries
            );

            // If cointegrated, estimate ECM
            let ecmResult = null;
            if (cointResult.isCointegrated) {
              ecmResult = await estimateECM(
                baseSeries,
                compSeries,
                cointResult.cointegratingVector
              );
            }

            // Calculate additional diagnostics
            const diagnostics = calculateDiagnostics(
              baseSeries,
              compSeries,
              ecmResult
            );

            return {
              baseMarket,
              comparisonMarket: market,
              cointegration: cointResult,
              ecm: ecmResult,
              diagnostics,
              metadata: {
                sampleSize: baseSeries.length,
                timeRange: {
                  start: baseSeries[0]?.date,
                  end: baseSeries[baseSeries.length - 1]?.date
                }
              }
            };
          })
        );

        // Aggregate results
        const aggregatedResults = {
          marketPairs: analysisResults,
          summary: summarizeResults(analysisResults),
          metadata: {
            commodity,
            regime,
            processedAt: new Date().toISOString()
          }
        };

        setResults(aggregatedResults);
        setStatus('succeeded');
        metric.finish({ status: 'success' });

      } catch (err) {
        console.error('Error in ECM analysis:', err);
        setError(err.message);
        setStatus('failed');
        metric.finish({ status: 'error', error: err.message });
      }
    };

    performECMAnalysis();
  }, [commodity, baseMarket, comparisonMarkets, regime]);

  // Compute market integration metrics from ECM results
  const integrationMetrics = useMemo(() => {
    if (!results?.marketPairs) return null;

    return {
      // Long-run relationships
      longRun: {
        cointegrationRate: results.summary.cointegrationRate,
        avgAdjustmentSpeed: results.summary.avgAdjustmentSpeed,
        marketCoverage: results.marketPairs.length
      },

      // Short-run dynamics
      shortRun: {
        avgTransmissionSpeed: results.summary.avgTransmissionSpeed,
        symmetry: results.summary.priceTransmissionSymmetry,
        efficiency: results.summary.marketEfficiency
      },

      // Market pair details
      marketPairs: results.marketPairs.map(pair => ({
        markets: `${pair.baseMarket}-${pair.comparisonMarket}`,
        cointegrated: pair.cointegration.isCointegrated,
        adjustmentSpeed: pair.ecm?.adjustmentSpeed || null,
        halfLife: calculateHalfLife(pair.ecm?.adjustmentSpeed),
        efficiency: calculateMarketEfficiency(pair)
      }))
    };
  }, [results]);

  return {
    results,
    integrationMetrics,
    status,
    error
  };
};

/**
 * Align two time series by date
 */
function alignTimeSeries(series1, series2) {
  const dates = _.intersection(
    series1.map(x => x.date),
    series2.map(x => x.date)
  );

  return {
    baseSeries: dates.map(date => ({
      date,
      price: series1.find(x => x.date === date)?.price
    })),
    compSeries: dates.map(date => ({
      date,
      price: series2.find(x => x.date === date)?.price
    }))
  };
}

/**
 * Test for cointegration between price series
 */
async function testCointegration(series1, series2) {
  // Implement Johansen or Engle-Granger cointegration test
  // Return cointegration test results
  return {
    isCointegrated: true, // Placeholder
    cointegratingVector: [1, -1],
    testStatistic: 0,
    pValue: 0
  };
}

/**
 * Estimate Error Correction Model
 */
async function estimateECM(series1, series2, cointegratingVector) {
  // Implement ECM estimation
  // Return ECM parameters and diagnostics
  return {
    adjustmentSpeed: -0.5,
    shortRunCoefficients: [],
    residuals: [],
    rSquared: 0.8
  };
}

/**
 * Calculate diagnostic statistics
 */
function calculateDiagnostics(series1, series2, ecmResult) {
  return {
    correlations: {
      levels: calculateCorrelation(series1, series2),
      returns: calculateCorrelation(
        calculateReturns(series1),
        calculateReturns(series2)
      )
    },
    volatility: {
      series1: calculateVolatility(series1),
      series2: calculateVolatility(series2)
    },
    modelFit: ecmResult ? {
      rSquared: ecmResult.rSquared,
      residualTests: performResidualTests(ecmResult.residuals)
    } : null
  };
}

/**
 * Calculate half-life of price adjustment
 */
function calculateHalfLife(adjustmentSpeed) {
  if (!adjustmentSpeed || adjustmentSpeed >= 0) return null;
  return Math.log(0.5) / Math.log(1 + adjustmentSpeed);
}

/**
 * Calculate market efficiency score
 */
function calculateMarketEfficiency(pairResults) {
  if (!pairResults.ecm) return null;

  // Combine multiple metrics for efficiency score
  const metrics = {
    adjustmentSpeed: Math.abs(pairResults.ecm.adjustmentSpeed),
    rSquared: pairResults.ecm.rSquared,
    residualQuality: pairResults.diagnostics.modelFit?.residualTests.normalityPValue || 0
  };

  // Weight and combine metrics
  return (
    0.4 * metrics.adjustmentSpeed +
    0.4 * metrics.rSquared +
    0.2 * metrics.residualQuality
  );
}

/**
 * Summarize ECM analysis results
 */
function summarizeResults(results) {
  const cointegrated = results.filter(r => r.cointegration.isCointegrated);
  
  return {
    cointegrationRate: cointegrated.length / results.length,
    avgAdjustmentSpeed: _.meanBy(cointegrated, 'ecm.adjustmentSpeed'),
    avgTransmissionSpeed: calculateAvgTransmissionSpeed(cointegrated),
    priceTransmissionSymmetry: assessTransmissionSymmetry(cointegrated),
    marketEfficiency: _.meanBy(results, r => calculateMarketEfficiency(r))
  };
}