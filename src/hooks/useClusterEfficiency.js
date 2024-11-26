// src/hooks/useClusterEfficiency.js

import { useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  calculateEfficiencyMetrics, 
  calculateClusterHealth,
  analyzeClusterStability,
  generateConnectivityMatrix 
} from '../components/analysis/spatial-analysis/utils/clusterAnalysis';

/**
 * Custom hook for managing cluster efficiency data and calculations
 * @param {Object} options - Configuration options
 * @returns {Object} Cluster efficiency data and utility functions
 */
const useClusterEfficiency = ({ timeSeriesData } = {}) => {
  // Local state for caching and performance optimization
  const [cachedCalculations, setCachedCalculations] = useState(new Map());

  // Select relevant data from Redux store
  const clusters = useSelector(state => state.spatial.clusters);
  const marketData = useSelector(state => state.spatial.marketData);
  const geometry = useSelector(state => state.spatial.geometry);

  // Memoized aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    if (!clusters?.length) return null;
    return calculateEfficiencyMetrics(clusters);
  }, [clusters]);

  // Memoized connectivity matrix
  const connectivityMatrix = useMemo(() => {
    if (!clusters?.length) return { markets: [], matrix: [] };
    return generateConnectivityMatrix(clusters);
  }, [clusters]);

  /**
   * Calculate and cache cluster health metrics
   * @param {Object} cluster - Cluster data
   * @returns {Object} Health metrics
   */
  const getClusterHealth = useCallback((cluster) => {
    if (!cluster) return null;

    const cacheKey = `health-${cluster.cluster_id}`;
    if (cachedCalculations.has(cacheKey)) {
      return cachedCalculations.get(cacheKey);
    }

    const health = calculateClusterHealth(cluster);
    setCachedCalculations(prev => new Map(prev).set(cacheKey, health));
    return health;
  }, [cachedCalculations]);

  /**
   * Calculate and cache cluster stability metrics
   * @param {Object} cluster - Cluster data
   * @returns {Object} Stability metrics
   */
  const getClusterStability = useCallback((cluster) => {
    if (!cluster || !timeSeriesData) return null;

    const cacheKey = `stability-${cluster.cluster_id}`;
    if (cachedCalculations.has(cacheKey)) {
      return cachedCalculations.get(cacheKey);
    }

    const stability = analyzeClusterStability(cluster, timeSeriesData);
    setCachedCalculations(prev => new Map(prev).set(cacheKey, stability));
    return stability;
  }, [timeSeriesData, cachedCalculations]);

  /**
   * Compare two clusters and analyze their differences
   * @param {Object} cluster1 - First cluster
   * @param {Object} cluster2 - Second cluster
   * @returns {Object} Comparison metrics
   */
  const compareClusterMetrics = useCallback((cluster1, cluster2) => {
    if (!cluster1 || !cluster2) return null;

    const health1 = getClusterHealth(cluster1);
    const health2 = getClusterHealth(cluster2);
    const stability1 = getClusterStability(cluster1);
    const stability2 = getClusterStability(cluster2);

    return {
      healthDifference: {
        score: health2.score - health1.score,
        components: {
          efficiency: cluster2.efficiency_metrics.efficiency_score - cluster1.efficiency_metrics.efficiency_score,
          connectivity: cluster2.efficiency_metrics.internal_connectivity - cluster1.efficiency_metrics.internal_connectivity,
          coverage: cluster2.efficiency_metrics.market_coverage - cluster1.efficiency_metrics.market_coverage,
          priceConvergence: 
            (cluster2.efficiency_metrics.price_convergence || 0) - 
            (cluster1.efficiency_metrics.price_convergence || 0)
        }
      },
      stabilityDifference: stability1 && stability2 ? {
        overall: stability2.overallStability - stability1.overallStability,
        priceVolatility: stability2.priceVolatility - stability1.priceVolatility,
        membershipStability: stability2.membershipStability - stability1.membershipStability
      } : null,
      marketOverlap: {
        count: cluster1.connected_markets.filter(market => 
          cluster2.connected_markets.includes(market)
        ).length,
        markets: cluster1.connected_markets.filter(market => 
          cluster2.connected_markets.includes(market)
        )
      }
    };
  }, [getClusterHealth, getClusterStability]);

  /**
   * Find clusters that might benefit from merging
   * @returns {Array} Array of potential cluster pairs for merging
   */
  const findPotentialMergers = useCallback(() => {
    if (!clusters?.length) return [];

    const potentialMergers = [];
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const comparison = compareClusterMetrics(clusters[i], clusters[j]);
        if (!comparison) continue;

        // Criteria for suggesting merger
        const hasSignificantOverlap = comparison.marketOverlap.count / 
          Math.min(clusters[i].market_count, clusters[j].market_count) > 0.3;
        
        const hasComplementaryMetrics = 
          (clusters[i].efficiency_metrics.efficiency_score < 0.6 ||
           clusters[j].efficiency_metrics.efficiency_score < 0.6) &&
          comparison.marketOverlap.count > 0;

        if (hasSignificantOverlap || hasComplementaryMetrics) {
          potentialMergers.push({
            cluster1: clusters[i],
            cluster2: clusters[j],
            comparison,
            reason: hasSignificantOverlap ? 'Market Overlap' : 'Complementary Performance'
          });
        }
      }
    }

    return potentialMergers;
  }, [clusters, compareClusterMetrics]);

  return {
    // Data
    clusters,
    marketData,
    geometry,
    aggregatedMetrics,
    connectivityMatrix,

    // Calculations
    getClusterHealth,
    getClusterStability,
    compareClusterMetrics,
    findPotentialMergers,

    // Cache management
    clearCache: useCallback(() => {
      setCachedCalculations(new Map());
    }, [])
  };
};

export default useClusterEfficiency;
