// src/components/analysis/spatial-analysis/utils/clusterAnalysis.js

import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Validate positive number and return default if invalid
 * @param {number} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Validated number
 */
const validateNumber = (value, defaultValue = 0) => {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value) || value < 0) {
        return defaultValue;
    }
    return value;
};

/**
 * Validate price data for a time series entry
 * @param {Object} ts - Time series entry
 * @returns {boolean} Whether the entry is valid
 */
const isValidPriceData = (ts) => {
    return ts && 
           ts.region && 
           typeof ts.avgUsdPrice === 'number' && 
           !isNaN(ts.avgUsdPrice) && 
           isFinite(ts.avgUsdPrice) && 
           ts.avgUsdPrice > 0;
};

/**
 * Calculate efficiency metrics for market clusters
 */
export const calculateEfficiencyMetrics = (clusters, flowData, timeSeriesData) => {
    const metric = backgroundMonitor.startMetric('cluster-efficiency-calculation', {
        clusterCount: clusters?.length,
        flowCount: flowData?.length,
        timeSeriesLength: timeSeriesData?.length
    });

    if (DEBUG) {
        console.log('Cluster Efficiency Calculation');
        console.log('Input Data:', {
            clusterCount: clusters?.length,
            flowCount: flowData?.length,
            timeSeriesLength: timeSeriesData?.length
        });
    }

    if (!Array.isArray(clusters) || !Array.isArray(flowData) || !Array.isArray(timeSeriesData)) {
        const error = 'Missing or invalid input data for efficiency calculation';
        console.warn(error);
        metric.finish({ status: 'failed', reason: error });
        return [];
    }

    try {
        const processedClusters = clusters.map(cluster => {
            if (!cluster?.connected_markets?.length) {
                return { ...cluster, metrics: getDefaultMetrics() };
            }

            // Get all flows within this cluster
            const internalFlows = flowData.filter(flow =>
                flow?.source && flow?.target &&
                cluster.connected_markets.includes(flow.source) &&
                cluster.connected_markets.includes(flow.target)
            );

            if (DEBUG) {
                console.log(`Processing cluster ${cluster.main_market}:`, {
                    mainMarket: cluster.main_market,
                    marketCount: cluster.connected_markets.length,
                    internalFlowCount: internalFlows.length
                });
            }

            // Calculate metrics with validation
            const maxPossibleConnections = validateNumber(
                cluster.connected_markets.length * (cluster.connected_markets.length - 1) / 2
            );
            const internal_connectivity = validateNumber(
                maxPossibleConnections > 0 ? internalFlows.length / maxPossibleConnections : 0
            );

            const market_coverage = validateNumber(
                flowData.length > 0 ? cluster.connected_markets.length / flowData.length : 0
            );

            // Calculate price convergence with validation
            const priceConvergence = calculatePriceConvergence(cluster, timeSeriesData);

            // Calculate stability metrics
            const stabilityMetrics = calculateStabilityMetrics(cluster, timeSeriesData, flowData);

            // Calculate total and average flows with validation
            const totalFlow = validateNumber(
                internalFlows.reduce((sum, flow) => sum + validateNumber(flow.totalFlow), 0)
            );
            
            const avgFlow = validateNumber(
                internalFlows.length > 0 ? 
                internalFlows.reduce((sum, flow) => sum + validateNumber(flow.avgFlow), 0) / internalFlows.length : 
                0
            );

            // Calculate efficiency score
            const metrics = {
                internal_connectivity,
                market_coverage,
                price_convergence: validateNumber(priceConvergence.convergence),
                price_volatility: validateNumber(priceConvergence.volatility, 1),
                stability: validateNumber(stabilityMetrics.overall_stability),
                flow_stability: validateNumber(stabilityMetrics.flow_stability),
                price_stability: validateNumber(stabilityMetrics.price_stability),
                market_count: validateNumber(cluster.connected_markets.length),
                total_flow: totalFlow,
                avg_flow: avgFlow
            };

            // Calculate overall efficiency score
            metrics.efficiency_score = calculateEfficiencyScore(metrics);

            if (DEBUG) {
                console.log(`Cluster ${cluster.main_market} metrics:`, metrics);
            }

            return {
                ...cluster,
                metrics
            };
        });

        metric.finish({ status: 'success', processedClusters: processedClusters.length });
        return processedClusters;

    } catch (error) {
        console.error('Error calculating cluster efficiency:', error);
        backgroundMonitor.logError('cluster-efficiency-calculation', error);
        metric.finish({ status: 'failed', error: error.message });

        return clusters.map(cluster => ({
            ...cluster,
            metrics: getDefaultMetrics()
        }));
    }
};

/**
 * Calculate price convergence within a cluster
 */
const calculatePriceConvergence = (cluster, timeSeriesData) => {
    const metric = backgroundMonitor.startMetric('price-convergence-calculation');

    try {
        if (!cluster?.connected_markets?.length) {
            return { convergence: 0, volatility: 1, coefficientOfVariation: 1 };
        }

        // Get valid price data for markets in this cluster
        const clusterPrices = timeSeriesData.filter(ts =>
            isValidPriceData(ts) && cluster.connected_markets.includes(ts.region)
        );

        if (clusterPrices.length === 0) {
            return { convergence: 0, volatility: 1, coefficientOfVariation: 1 };
        }

        // Calculate monthly differentials with validation
        const monthlyDifferentials = {};
        clusterPrices.forEach(ts => {
            if (ts.month && isValidPriceData(ts)) {
                if (!monthlyDifferentials[ts.month]) {
                    monthlyDifferentials[ts.month] = [];
                }
                monthlyDifferentials[ts.month].push(ts.avgUsdPrice);
            }
        });

        // Calculate coefficient of variation for each month
        const coefficients = Object.values(monthlyDifferentials)
            .filter(prices => prices.length > 1)
            .map(prices => {
                const mean = validateNumber(
                    prices.reduce((a, b) => a + validateNumber(b), 0) / prices.length
                );
                if (mean === 0) return 1;

                const variance = validateNumber(
                    prices.reduce((a, b) => a + Math.pow(validateNumber(b) - mean, 2), 0) / prices.length
                );
                return Math.sqrt(variance) / mean;
            });

        if (coefficients.length === 0) {
            return { convergence: 0, volatility: 1, coefficientOfVariation: 1 };
        }

        // Calculate convergence metrics
        const avgCoefficient = validateNumber(
            coefficients.reduce((a, b) => a + validateNumber(b), 0) / coefficients.length
        );
        const convergence = validateNumber(1 / (1 + avgCoefficient));
        const volatility = validateNumber(calculatePriceVolatility(clusterPrices), 1);

        metric.finish({ status: 'success' });
        return { convergence, volatility, coefficientOfVariation: avgCoefficient };

    } catch (error) {
        console.error('Error calculating price convergence:', error);
        backgroundMonitor.logError('price-convergence-calculation', error);
        metric.finish({ status: 'failed', error: error.message });

        return {
            convergence: 0,
            volatility: 1,
            coefficientOfVariation: 1
        };
    }
};

/**
 * Calculate stability metrics for a cluster
 */
const calculateStabilityMetrics = (cluster, timeSeriesData, flowData) => {
    const metric = backgroundMonitor.startMetric('stability-metrics-calculation');

    try {
        // Calculate price stability with validation
        const clusterPrices = timeSeriesData.filter(ts =>
            isValidPriceData(ts) && cluster.connected_markets.includes(ts.region)
        );
        const price_stability = validateNumber(1 - calculatePriceVolatility(clusterPrices));

        // Calculate flow stability with validation
        const clusterFlows = flowData.filter(flow =>
            flow?.source && flow?.target &&
            cluster.connected_markets.includes(flow.source) &&
            cluster.connected_markets.includes(flow.target)
        );
        const flow_stability = validateNumber(calculateFlowStability(clusterFlows));

        // Calculate overall stability with weighted average
        const overall_stability = validateNumber(
            (price_stability * 0.6) + (flow_stability * 0.4)
        );

        metric.finish({ status: 'success' });
        return { price_stability, flow_stability, overall_stability };

    } catch (error) {
        console.error('Error calculating stability metrics:', error);
        backgroundMonitor.logError('stability-metrics-calculation', error);
        metric.finish({ status: 'failed', error: error.message });

        return {
            price_stability: 0,
            flow_stability: 0,
            overall_stability: 0
        };
    }
};

/**
 * Calculate price volatility for a set of time series data
 */
const calculatePriceVolatility = (priceData) => {
    const metric = backgroundMonitor.startMetric('price-volatility-calculation');

    try {
        if (!Array.isArray(priceData) || priceData.length === 0) {
            return 1;
        }

        // Extract valid prices and calculate returns
        const prices = priceData
            .filter(d => isValidPriceData(d))
            .map(d => d.avgUsdPrice);

        if (prices.length < 2) {
            return 1;
        }

        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            if (prices[i-1] > 0) {
                returns.push(Math.log(prices[i] / prices[i-1]));
            }
        }

        if (returns.length === 0) {
            return 1;
        }

        // Calculate variance of returns
        const meanReturn = validateNumber(
            returns.reduce((a, b) => a + validateNumber(b), 0) / returns.length
        );
        const variance = validateNumber(
            returns.reduce((a, b) => a + Math.pow(validateNumber(b) - meanReturn, 2), 0) / returns.length
        );

        metric.finish({ status: 'success' });
        return Math.sqrt(variance);

    } catch (error) {
        console.error('Error calculating price volatility:', error);
        backgroundMonitor.logError('price-volatility-calculation', error);
        metric.finish({ status: 'failed', error: error.message });
        return 1;
    }
};

/**
 * Calculate flow stability based on flow data
 */
const calculateFlowStability = (flows) => {
    const metric = backgroundMonitor.startMetric('flow-stability-calculation');

    try {
        if (!Array.isArray(flows) || flows.length === 0) {
            return 0;
        }

        // Extract and validate flow counts
        const flowCounts = flows
            .map(f => validateNumber(f.flowCount))
            .filter(count => count > 0);

        if (flowCounts.length === 0) {
            return 0;
        }

        // Calculate mean and variance
        const meanCount = validateNumber(
            flowCounts.reduce((a, b) => a + b, 0) / flowCounts.length
        );
        
        if (meanCount === 0) {
            return 0;
        }

        const variance = validateNumber(
            flowCounts.reduce((a, b) => a + Math.pow(b - meanCount, 2), 0) / flowCounts.length
        );

        metric.finish({ status: 'success' });
        return 1 / (1 + Math.sqrt(variance) / meanCount);

    } catch (error) {
        console.error('Error calculating flow stability:', error);
        backgroundMonitor.logError('flow-stability-calculation', error);
        metric.finish({ status: 'failed', error: error.message });
        return 0;
    }
};

/**
 * Calculate overall efficiency score
 */
const calculateEfficiencyScore = (metrics) => {
    const weights = {
      internal_connectivity: 0.3,
      market_coverage: 0.2,
      price_convergence: 0.3,
      stability: 0.2
    };
  
    let totalScore = 0;
    let totalWeight = 0;
  
    Object.entries(weights).forEach(([metric, weight]) => {
      const value = metrics?.[metric];
      if (typeof value === 'number' && !isNaN(value)) {
        totalScore += value * weight;
        totalWeight += weight;
      }
    });
  
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  };

/**
 * Get default metrics object
 */
const getDefaultMetrics = () => ({
    internal_connectivity: 0,
    market_coverage: 0,
    price_convergence: 0,
    price_volatility: 1,
    stability: 0,
    flow_stability: 0,
    price_stability: 0,
    efficiency_score: 0,
    market_count: 0,
    total_flow: 0,
    avg_flow: 0,
    averageEfficiency: 0,
    totalCoverage: 0,
    integrationScore: 0,
    stabilityScore: 0,
    flowConsistency: 0



});
