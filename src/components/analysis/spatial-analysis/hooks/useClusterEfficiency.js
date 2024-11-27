// src/components/analysis/spatial-analysis/hooks/useClusterEfficiency.js

import { useMemo, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
    selectMarketClusters,
    selectMarketFlows,
    selectTimeSeriesData 
} from '../../../../selectors/optimizedSelectors';
import { calculateEfficiencyMetrics } from '../utils/clusterAnalysis';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';
import { validateNumber } from '../../../../utils/numberValidation';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Safe selector wrapper with error handling
 */
const useSafeSelector = (selector, defaultValue = null) => {
    try {
        return useSelector(selector) || defaultValue;
    } catch (error) {
        console.error(`Selector error: ${error.message}`);
        backgroundMonitor.logError('selector-error', {
            selector: selector.name,
            error: error.message
        });
        return defaultValue;
    }
};

/**
 * Hook to calculate and track cluster efficiency metrics
 * @returns {Array} Array of clusters with calculated efficiency metrics
 */
export const useClusterEfficiency = () => {
    // Initialize metrics tracking
    const metricsRef = useRef({
        hook: null,
        processing: null
    });

    // Safely select data with defaults
    const clusters = useSafeSelector(selectMarketClusters, []);
    const flowData = useSafeSelector(selectMarketFlows, []);
    const timeSeriesData = useSafeSelector(selectTimeSeriesData, []);

    // Start hook metric on mount
    useEffect(() => {
        metricsRef.current.hook = backgroundMonitor.startMetric('cluster-efficiency-hook');
        return () => {
            if (metricsRef.current.hook) {
                metricsRef.current.hook.finish();
            }
        };
    }, []);

    return useMemo(() => {
        // Start processing metric
        metricsRef.current.processing = backgroundMonitor.startMetric('cluster-processing', {
            clusterCount: clusters?.length || 0,
            flowCount: flowData?.length || 0,
            timeSeriesCount: timeSeriesData?.length || 0
        });

        if (DEBUG) {
            console.log('useClusterEfficiency Hook');
            console.log('Raw Data:', {
                clusterCount: clusters?.length,
                flowDataCount: flowData?.length,
                timeSeriesCount: timeSeriesData?.length
            });
        }

        try {
            // Validate input data
            if (!Array.isArray(clusters) || !Array.isArray(flowData) || !Array.isArray(timeSeriesData)) {
                console.warn('Invalid input data types in useClusterEfficiency');
                return [];
            }

            if (!clusters.length || !flowData.length || !timeSeriesData.length) {
                if (DEBUG) {
                    console.log('No data available for cluster efficiency calculation');
                }
                return [];
            }

            // Calculate efficiency metrics
            const processedClusters = calculateEfficiencyMetrics(
                clusters,
                flowData,
                timeSeriesData
            );

            // Validate and format cluster metrics
            const validatedClusters = processedClusters.map(cluster => {
                const metrics = {
                    efficiency_score: validateNumber(cluster.metrics?.efficiency_score),
                    internal_connectivity: validateNumber(cluster.metrics?.internal_connectivity),
                    market_coverage: validateNumber(cluster.metrics?.market_coverage),
                    price_convergence: validateNumber(cluster.metrics?.price_convergence),
                    price_volatility: validateNumber(cluster.metrics?.price_volatility, 1),
                    stability: validateNumber(cluster.metrics?.stability),
                    flow_stability: validateNumber(cluster.metrics?.flow_stability),
                    price_stability: validateNumber(cluster.metrics?.price_stability),
                    market_count: validateNumber(cluster.market_count),
                    total_flow: validateNumber(cluster.metrics?.total_flow),
                    avg_flow: validateNumber(cluster.metrics?.avg_flow)
                };

                return {
                    ...cluster,
                    metrics,
                    market_count: validateNumber(cluster.market_count),
                    connected_markets: Array.isArray(cluster.connected_markets) ? 
                        cluster.connected_markets : []
                };
            });

            if (DEBUG) {
                console.log('Processed Clusters:', validatedClusters);
                validatedClusters.forEach(cluster => {
                    console.log(`Cluster ${cluster.main_market}:`, {
                        efficiency: cluster.metrics.efficiency_score.toFixed(3),
                        marketCount: cluster.market_count,
                        connectivity: cluster.metrics.internal_connectivity.toFixed(3),
                        stability: cluster.metrics.stability.toFixed(3)
                    });
                });
            }

            // Finish processing metric with success
            if (metricsRef.current.processing) {
                metricsRef.current.processing.finish({ 
                    status: 'success', 
                    clusterCount: validatedClusters.length 
                });
            }

            return validatedClusters;

        } catch (error) {
            console.error('Error in useClusterEfficiency:', error);
            backgroundMonitor.logError('cluster-efficiency-hook', error);
            
            // Finish processing metric with error
            if (metricsRef.current.processing) {
                metricsRef.current.processing.finish({ 
                    status: 'failed', 
                    error: error.message 
                });
            }

            return [];
        }
    }, [clusters, flowData, timeSeriesData]);
};

/**
 * Hook to get detailed metrics for a specific cluster
 */
export const useClusterDetails = (clusterId) => {
    const clusters = useClusterEfficiency();
    const metricsRef = useRef({ hook: null, details: null });

    useEffect(() => {
        metricsRef.current.hook = backgroundMonitor.startMetric('cluster-details-hook');
        return () => {
            if (metricsRef.current.hook) {
                metricsRef.current.hook.finish();
            }
        };
    }, []);

    return useMemo(() => {
        metricsRef.current.details = backgroundMonitor.startMetric('cluster-details-processing', {
            clusterId,
            hasData: !!clusters?.length
        });

        try {
            if (!clusterId || !Array.isArray(clusters) || !clusters.length) {
                return null;
            }

            const cluster = clusters.find(c => c.cluster_id === clusterId);
            if (!cluster) {
                return null;
            }

            const totalMarkets = validateNumber(
                clusters.reduce((sum, c) => sum + validateNumber(c.market_count), 0)
            );

            const maxEfficiency = validateNumber(
                Math.max(...clusters.map(c => validateNumber(c.metrics?.efficiency_score)))
            );

            // Calculate additional metrics
            const detailedMetrics = {
                marketShare: validateNumber(
                    totalMarkets > 0 ? cluster.market_count / totalMarkets : 0
                ),
                relativeEfficiency: validateNumber(
                    maxEfficiency > 0 ? cluster.metrics.efficiency_score / maxEfficiency : 0
                ),
                rankByEfficiency: validateNumber(
                    clusters
                        .sort((a, b) => validateNumber(b.metrics?.efficiency_score) - validateNumber(a.metrics?.efficiency_score))
                        .findIndex(c => c.cluster_id === clusterId) + 1
                ),
                rankBySize: validateNumber(
                    clusters
                        .sort((a, b) => validateNumber(b.market_count) - validateNumber(a.market_count))
                        .findIndex(c => c.cluster_id === clusterId) + 1
                )
            };

            if (metricsRef.current.details) {
                metricsRef.current.details.finish({ status: 'success' });
            }

            return { ...cluster, detailedMetrics };

        } catch (error) {
            console.error('Error in useClusterDetails:', error);
            backgroundMonitor.logError('cluster-details-hook', error);
            
            if (metricsRef.current.details) {
                metricsRef.current.details.finish({ 
                    status: 'failed', 
                    error: error.message 
                });
            }

            return null;
        }
    }, [clusterId, clusters]);
};

/**
 * Helper function to safely calculate efficiency scores
 */
export const safeCalculateEfficiencyScore = (metrics) => {
    const weights = {
        internal_connectivity: 0.3,
        market_coverage: 0.2,
        price_convergence: 0.3,
        stability: 0.2
    };

    try {
        if (!metrics || typeof metrics !== 'object') {
            return 0;
        }

        let score = 0;
        let totalWeight = 0;

        Object.entries(weights).forEach(([metric, weight]) => {
            const value = validateNumber(metrics[metric]);
            if (!isNaN(value)) {
                score += value * weight;
                totalWeight += weight;
            }
        });

        return validateNumber(totalWeight > 0 ? score / totalWeight : 0);
    } catch (error) {
        console.error('Error calculating efficiency score:', error);
        backgroundMonitor.logError('efficiency-score-calculation', error);
        return 0;
    }
};
