// src/components/spatialAnalysis/hooks/useMarketHealth.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { selectMarketHealthData } from '../../../selectors/spatialAnalysisSelectors';

/**
 * Custom hook for analyzing overall market health
 * @returns {Object} Market health analysis results
 */
export const useMarketHealth = () => {
  const healthData = useSelector(selectMarketHealthData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('market-health-hook');

    try {
      if (!healthData) {
        return {
          data: null,
          loading: false,
          error: 'No market health data available'
        };
      }

      const { marketHealth, summary } = healthData;

      // Format data for visualization and analysis
      const formattedData = {
        // Market health scores with detailed metrics
        markets: Object.entries(marketHealth).map(([region, data]) => {
          const prices = data.prices;
          const priceStats = calculatePriceStatistics(prices);

          return {
            region,
            healthScore: data.healthScore,
            metrics: {
              priceStability: priceStats.stability,
              shockResilience: 1 - (data.shocks / 10),
              marketIntegration: data.flows / 10,
              conflictImpact: 1 - (data.conflictIntensity / 10),
              priceVolatility: priceStats.volatility,
              trendStrength: priceStats.trend
            },
            classification: classifyMarketHealth(data.healthScore),
            prices: {
              current: prices[prices.length - 1],
              average: priceStats.average,
              trend: priceStats.trend,
              volatility: priceStats.volatility
            },
            risks: identifyRisks(data, priceStats)
          };
        }),

        // Health categories
        categories: {
          healthy: Object.entries(marketHealth)
            .filter(([_, data]) => data.healthScore >= 0.7)
            .map(([region]) => region),
          vulnerable: Object.entries(marketHealth)
            .filter(([_, data]) => data.healthScore >= 0.4 && data.healthScore < 0.7)
            .map(([region]) => region),
          stressed: Object.entries(marketHealth)
            .filter(([_, data]) => data.healthScore < 0.4)
            .map(([region]) => region)
        },

        // Regional analysis
        regions: Object.entries(marketHealth).reduce((acc, [region, data]) => {
          acc[region] = {
            healthScore: data.healthScore,
            riskLevel: calculateRiskLevel(data),
            vulnerabilities: identifyVulnerabilities(data),
            strengths: identifyStrengths(data)
          };
          return acc;
        }, {}),

        // Enhanced summary statistics
        summary: {
          ...summary,
          healthDistribution: {
            healthy: summary.healthyMarkets,
            vulnerable: Object.values(marketHealth)
              .filter(m => m.healthScore >= 0.4 && m.healthScore < 0.7).length,
            stressed: Object.values(marketHealth)
              .filter(m => m.healthScore < 0.4).length
          },
          systemicRisk: calculateSystemicRisk(marketHealth),
          resilience: calculateSystemResilience(marketHealth)
        }
      };

      metric.finish({ status: 'success' });

      return {
        data: formattedData,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error in useMarketHealth:', error);
      metric.finish({ status: 'error', error: error.message });

      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [healthData]);
};

// Helper functions

const calculatePriceStatistics = (prices) => {
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const volatility = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / prices.length
  ) / average;
  const trend = prices.length > 1 ? 
    (prices[prices.length - 1] - prices[0]) / prices[0] : 0;
  
  return {
    average,
    volatility,
    trend,
    stability: 1 - volatility
  };
};

const classifyMarketHealth = (score) => {
  if (score >= 0.7) return 'healthy';
  if (score >= 0.4) return 'vulnerable';
  return 'stressed';
};

const calculateRiskLevel = (data) => {
  const riskFactors = [
    data.shocks > 5,
    data.conflictIntensity > 5,
    data.flows < 3,
    calculatePriceStatistics(data.prices).volatility > 0.2
  ];
  
  const riskCount = riskFactors.filter(Boolean).length;
  return riskCount >= 3 ? 'high' :
         riskCount >= 1 ? 'medium' : 'low';
};

const identifyRisks = (data, priceStats) => {
  const risks = [];
  if (data.shocks > 5) risks.push('frequent_shocks');
  if (data.conflictIntensity > 5) risks.push('high_conflict');
  if (data.flows < 3) risks.push('low_integration');
  if (priceStats.volatility > 0.2) risks.push('price_volatility');
  return risks;
};

const identifyVulnerabilities = (data) => {
  const vulnerabilities = [];
  if (data.shocks > 3) vulnerabilities.push('shock_susceptibility');
  if (data.conflictIntensity > 3) vulnerabilities.push('conflict_exposure');
  if (data.flows < 5) vulnerabilities.push('limited_connectivity');
  return vulnerabilities;
};

const identifyStrengths = (data) => {
  const strengths = [];
  if (data.flows > 7) strengths.push('high_connectivity');
  if (data.shocks < 3) strengths.push('shock_resistant');
  if (data.conflictIntensity < 3) strengths.push('stable_environment');
  return strengths;
};

const calculateSystemicRisk = (marketHealth) => {
  const scores = Object.values(marketHealth).map(m => m.healthScore);
  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const correlation = calculateHealthCorrelation(Object.values(marketHealth));
  return (1 - average) * correlation;
};

const calculateSystemResilience = (marketHealth) => {
  const markets = Object.values(marketHealth);
  const healthyCount = markets.filter(m => m.healthScore >= 0.7).length;
  const connectivity = markets.reduce((sum, m) => sum + m.flows, 0) / markets.length;
  return (healthyCount / markets.length) * connectivity;
};

const calculateHealthCorrelation = (markets) => {
  // Simplified correlation calculation between market health scores
  const scores = markets.map(m => m.healthScore);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const deviations = scores.map(s => s - mean);
  const covariance = deviations.reduce((sum, d, i) => 
    sum + d * deviations[(i + 1) % deviations.length], 0
  ) / scores.length;
  const variance = deviations.reduce((sum, d) => sum + d * d, 0) / scores.length;
  return covariance / variance;
};

export default useMarketHealth;
