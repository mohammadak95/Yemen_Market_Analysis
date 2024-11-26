// src/components/analysis/spatial-analysis/utils/clusterAnalysis.js

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Calculate efficiency metrics for market clusters
 * @param {Array} clusters - Array of market clusters
 * @param {Array} flowData - Array of market flows
 * @param {Array} timeSeriesData - Time series price data
 * @returns {Array} Clusters with calculated efficiency metrics
 */
export const calculateEfficiencyMetrics = (clusters, flowData, timeSeriesData) => {
    if (DEBUG) {
        console.group('Cluster Efficiency Calculation');
        console.log('Input Data:', {
            clusterCount: clusters?.length,
            flowCount: flowData?.length,
            timeSeriesLength: timeSeriesData?.length
        });
    }

    if (!clusters?.length || !flowData?.length || !timeSeriesData?.length) {
        console.warn('Missing required data for efficiency calculation');
        return [];
    }

    try {
        return clusters.map(cluster => {
            // Get all flows within this cluster
            const internalFlows = flowData.filter(flow =>
                cluster.connected_markets.includes(flow.source) &&
                cluster.connected_markets.includes(flow.target)
            );

            if (DEBUG) {
                console.log(`Processing cluster ${cluster.cluster_id}:`, {
                    mainMarket: cluster.main_market,
                    marketCount: cluster.connected_markets.length,
                    internalFlowCount: internalFlows.length
                });
            }

            // Calculate internal connectivity
            const maxPossibleConnections = cluster.connected_markets.length * (cluster.connected_markets.length - 1) / 2;
            const internal_connectivity = internalFlows.length / maxPossibleConnections;

            // Calculate market coverage
            const market_coverage = cluster.market_count / flowData.length;

            // Calculate price convergence
            const priceConvergence = calculatePriceConvergence(cluster, timeSeriesData);

            // Calculate stability metrics
            const stabilityMetrics = calculateStabilityMetrics(cluster, timeSeriesData, flowData);

            // Calculate efficiency score
            const efficiency_score = calculateEfficiencyScore({
                internal_connectivity,
                market_coverage,
                price_convergence: priceConvergence.convergence,
                stability: stabilityMetrics.overall_stability
            });

            const metrics = {
                internal_connectivity,
                market_coverage,
                price_convergence: priceConvergence.convergence,
                price_volatility: priceConvergence.volatility,
                stability: stabilityMetrics.overall_stability,
                flow_stability: stabilityMetrics.flow_stability,
                price_stability: stabilityMetrics.price_stability,
                efficiency_score,
                market_count: cluster.market_count,
                total_flow: internalFlows.reduce((sum, flow) => sum + flow.totalFlow, 0),
                avg_flow: internalFlows.reduce((sum, flow) => sum + flow.avgFlow, 0) / (internalFlows.length || 1)
            };

            if (DEBUG) {
                console.log(`Cluster ${cluster.cluster_id} metrics:`, metrics);
            }

            return {
                ...cluster,
                metrics
            };
        });
    } catch (error) {
        console.error('Error calculating cluster efficiency:', error);
        return clusters.map(cluster => ({
            ...cluster,
            metrics: getDefaultMetrics()
        }));
    } finally {
        if (DEBUG) {
            console.groupEnd();
        }
    }
};

/**
 * Calculate price convergence within a cluster
 * @param {Object} cluster - Cluster data
 * @param {Array} timeSeriesData - Time series price data
 * @returns {Object} Convergence metrics
 */
const calculatePriceConvergence = (cluster, timeSeriesData) => {
    try {
        // Get price data for markets in this cluster
        const clusterPrices = timeSeriesData.filter(ts =>
            cluster.connected_markets.includes(ts.region)
        );

        // Calculate price differentials over time
        const monthlyDifferentials = {};
        clusterPrices.forEach(ts => {
            if (!monthlyDifferentials[ts.month]) {
                monthlyDifferentials[ts.month] = [];
            }
            monthlyDifferentials[ts.month].push(ts.avgUsdPrice);
        });

        // Calculate coefficient of variation for each month
        const coefficients = Object.values(monthlyDifferentials).map(prices => {
            const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
            const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
            return Math.sqrt(variance) / mean;
        });

        // Average coefficient of variation (inverse for convergence)
        const avgCoefficient = coefficients.reduce((a, b) => a + b, 0) / coefficients.length;
        const convergence = 1 / (1 + avgCoefficient);

        // Calculate price volatility
        const volatility = calculatePriceVolatility(clusterPrices);

        return {
            convergence,
            volatility,
            coefficientOfVariation: avgCoefficient
        };
    } catch (error) {
        console.error('Error calculating price convergence:', error);
        return {
            convergence: 0,
            volatility: 1,
            coefficientOfVariation: 1
        };
    }
};

/**
 * Calculate stability metrics for a cluster
 * @param {Object} cluster - Cluster data
 * @param {Array} timeSeriesData - Time series data
 * @param {Array} flowData - Flow data
 * @returns {Object} Stability metrics
 */
const calculateStabilityMetrics = (cluster, timeSeriesData, flowData) => {
    try {
        // Calculate price stability
        const clusterPrices = timeSeriesData.filter(ts =>
            cluster.connected_markets.includes(ts.region)
        );
        const price_stability = 1 - calculatePriceVolatility(clusterPrices);

        // Calculate flow stability
        const clusterFlows = flowData.filter(flow =>
            cluster.connected_markets.includes(flow.source) &&
            cluster.connected_markets.includes(flow.target)
        );
        const flow_stability = calculateFlowStability(clusterFlows);

        // Calculate overall stability
        const overall_stability = (price_stability * 0.6) + (flow_stability * 0.4);

        return {
            price_stability,
            flow_stability,
            overall_stability
        };
    } catch (error) {
        console.error('Error calculating stability metrics:', error);
        return {
            price_stability: 0,
            flow_stability: 0,
            overall_stability: 0
        };
    }
};

/**
 * Calculate price volatility for a set of time series data
 * @param {Array} priceData - Time series price data
 * @returns {number} Volatility measure
 */
const calculatePriceVolatility = (priceData) => {
    if (!priceData?.length) return 1;

    try {
        const prices = priceData.map(d => d.avgUsdPrice);
        const returns = [];
        
        for (let i = 1; i < prices.length; i++) {
            returns.push(Math.log(prices[i] / prices[i-1]));
        }

        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    } catch (error) {
        console.error('Error calculating price volatility:', error);
        return 1;
    }
};

/**
 * Calculate flow stability based on flow data
 * @param {Array} flows - Flow data
 * @returns {number} Flow stability measure
 */
const calculateFlowStability = (flows) => {
    if (!flows?.length) return 0;

    try {
        const flowCounts = flows.map(f => f.flowCount);
        const meanCount = flowCounts.reduce((a, b) => a + b, 0) / flowCounts.length;
        const variance = flowCounts.reduce((a, b) => a + Math.pow(b - meanCount, 2), 0) / flowCounts.length;
        
        return 1 / (1 + Math.sqrt(variance) / meanCount);
    } catch (error) {
        console.error('Error calculating flow stability:', error);
        return 0;
    }
};

/**
 * Calculate overall efficiency score
 * @param {Object} metrics - Component metrics
 * @returns {number} Overall efficiency score
 */
const calculateEfficiencyScore = (metrics) => {
    const weights = {
        internal_connectivity: 0.3,
        market_coverage: 0.2,
        price_convergence: 0.3,
        stability: 0.2
    };

    return Object.entries(weights).reduce((score, [metric, weight]) => {
        return score + (metrics[metric] * weight);
    }, 0);
};

/**
 * Get default metrics object
 * @returns {Object} Default metrics
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
    avg_flow: 0
});