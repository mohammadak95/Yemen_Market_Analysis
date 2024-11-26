// src/components/analysis/spatial-analysis/hooks/useClusterEfficiency.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
    selectMarketClusters,
    selectMarketFlows,
    selectTimeSeriesData 
} from '../../../../selectors/optimizedSelectors';
import { calculateEfficiencyMetrics } from '../utils/clusterAnalysis';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Hook to calculate and track cluster efficiency metrics
 * @returns {Array} Array of clusters with calculated efficiency metrics
 */
export const useClusterEfficiency = () => {
    const clusters = useSelector(selectMarketClusters);
    const flowData = useSelector(selectMarketFlows);
    const timeSeriesData = useSelector(selectTimeSeriesData);

    return useMemo(() => {
        if (DEBUG) {
            console.group('useClusterEfficiency Hook');
            console.log('Raw Data:', {
                clusterCount: clusters?.length,
                flowDataCount: flowData?.length,
                timeSeriesCount: timeSeriesData?.length
            });
        }

        try {
            if (!clusters?.length || !flowData?.length || !timeSeriesData?.length) {
                console.warn('Missing required data for cluster efficiency calculation');
                return [];
            }

            // Calculate efficiency metrics using actual data
            const processedClusters = calculateEfficiencyMetrics(
                clusters,
                flowData,
                timeSeriesData
            );

            if (DEBUG) {
                console.log('Processed Clusters:', processedClusters);
                
                // Log key metrics for each cluster
                processedClusters.forEach(cluster => {
                    console.log(`Cluster ${cluster.cluster_id} (${cluster.main_market}):`, {
                        efficiency: cluster.metrics.efficiency_score.toFixed(3),
                        marketCount: cluster.market_count,
                        connectivity: cluster.metrics.internal_connectivity.toFixed(3),
                        stability: cluster.metrics.stability.toFixed(3)
                    });
                });
            }

            return processedClusters;
        } catch (error) {
            console.error('Error in useClusterEfficiency:', error);
            return [];
        } finally {
            if (DEBUG) {
                console.groupEnd();
            }
        }
    }, [clusters, flowData, timeSeriesData]);
};

/**
 * Hook to get detailed metrics for a specific cluster
 * @param {number} clusterId - ID of the cluster to analyze
 * @returns {Object|null} Detailed cluster metrics
 */
export const useClusterDetails = (clusterId) => {
    const clusters = useClusterEfficiency();

    return useMemo(() => {
        if (!clusterId || !clusters?.length) return null;

        const cluster = clusters.find(c => c.cluster_id === clusterId);
        if (!cluster) return null;

        // Calculate additional detailed metrics
        return {
            ...cluster,
            detailedMetrics: {
                marketShare: cluster.market_count / clusters.reduce((sum, c) => sum + c.market_count, 0),
                relativeEfficiency: cluster.metrics.efficiency_score / 
                    Math.max(...clusters.map(c => c.metrics.efficiency_score)),
                rankByEfficiency: clusters
                    .sort((a, b) => b.metrics.efficiency_score - a.metrics.efficiency_score)
                    .findIndex(c => c.cluster_id === clusterId) + 1,
                rankBySize: clusters
                    .sort((a, b) => b.market_count - a.market_count)
                    .findIndex(c => c.cluster_id === clusterId) + 1
            }
        };
    }, [clusterId, clusters]);
};

/**
 * Hook to get comparative cluster metrics
 * @returns {Object} Comparative metrics between clusters
 */
export const useComparativeClusters = () => {
    const clusters = useClusterEfficiency();

    return useMemo(() => {
        if (!clusters?.length) return null;

        const metrics = clusters.map(cluster => ({
            id: cluster.cluster_id,
            mainMarket: cluster.main_market,
            efficiency: cluster.metrics.efficiency_score,
            size: cluster.market_count,
            connectivity: cluster.metrics.internal_connectivity,
            stability: cluster.metrics.stability
        }));

        return {
            metrics,
            summary: {
                totalMarkets: clusters.reduce((sum, c) => sum + c.market_count, 0),
                avgEfficiency: clusters.reduce((sum, c) => sum + c.metrics.efficiency_score, 0) / clusters.length,
                mostEfficient: metrics.reduce((a, b) => a.efficiency > b.efficiency ? a : b).mainMarket,
                leastEfficient: metrics.reduce((a, b) => a.efficiency < b.efficiency ? a : b).mainMarket
            }
        };
    }, [clusters]);
};