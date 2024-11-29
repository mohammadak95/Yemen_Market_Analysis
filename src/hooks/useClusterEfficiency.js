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
export const useClusterEfficiency = (clusters, flowMaps) => {
  return useMemo(() => {
    try {
      if (!clusters?.length) {
        return {
          clusters: [],
          metrics: getDefaultMetrics()
        };
      }

      // Process each cluster
      const processedClusters = clusters.map(cluster => {
        // Get connected markets, handle both potential formats
        const markets = cluster.markets || cluster.connected_markets || [];
        
        // Calculate cohesion metrics with coordinate validation
        const cohesionMetrics = calculateClusterCohesion(
          { ...cluster, markets }, 
          flowMaps,
          YEMEN_COORDINATES
        );

        // Calculate market isolation scores with safety checks
        const marketIsolationScores = markets.map(market => {
          const normalizedName = transformRegionName(market);
          return calculateMarketIsolation(
            normalizedName,
            flowMaps,
            YEMEN_COORDINATES
          ) || { isolationScore: 1, connectionCount: 0, totalFlow: 0 };
        });

        // Calculate intercluster relationships with validation
        const interClusterMetrics = clusters
          .filter(c => c.cluster_id !== cluster.cluster_id)
          .map(otherCluster => {
            const flows = calculateInterClusterFlows(cluster, otherCluster, flowMaps);
            return flows || { connectionDensity: 0, avgFlow: 0, totalFlow: 0 };
          });

        // Calculate efficiency metrics with proper validation
        const metrics = {
          efficiency: calculateEfficiencyScore(
            cohesionMetrics,
            marketIsolationScores,
            interClusterMetrics
          ),
          internal_efficiency: calculateInternalEfficiency(cohesionMetrics),
          external_efficiency: calculateExternalEfficiency(interClusterMetrics),
          market_integration: calculateMarketIntegration(
            marketIsolationScores,
            flowMaps
          ),
          price_stability: calculatePriceStability(cluster, flowMaps),
          flow_consistency: calculateFlowConsistency(cluster, flowMaps)
        };

        return {
          ...cluster,
          metrics,
          cohesion: cohesionMetrics,
          marketIsolation: marketIsolationScores,
          interClusterRelations: interClusterMetrics
        };
      });

      // Calculate overall metrics with validation
      const overallMetrics = {
        averageEfficiency: _.meanBy(processedClusters, 'metrics.efficiency') || 0,
        totalCoverage: calculateTotalCoverage(processedClusters),
        integrationScore: calculateOverallIntegration(processedClusters),
        stabilityScore: calculateOverallStability(processedClusters),
        flowConsistency: calculateOverallFlowConsistency(processedClusters)
      };

      return {
        clusters: processedClusters,
        metrics: overallMetrics
      };

    } catch (error) {
      console.error('Error in cluster efficiency analysis:', error);
      return {
        clusters: [],
        metrics: getDefaultMetrics()
      };
    }
  }, [clusters, flowMaps]);
};

export default useClusterEfficiency;
