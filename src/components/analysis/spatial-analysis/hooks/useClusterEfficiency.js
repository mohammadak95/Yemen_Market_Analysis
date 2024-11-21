// src/hooks/useClusterAnalysis.js
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import { 
  selectMarketClusters,
  selectTimeSeriesData,
  selectFlowMaps,
  selectGeometryData
} from '../selectors/optimizedSelectors';

export const useClusterAnalysis = () => {
  // Get data from Redux store
  const marketClusters = useSelector(selectMarketClusters);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const flowMaps = useSelector(selectFlowMaps);
  const geometry = useSelector(selectGeometryData);

  // Process cluster efficiency metrics
  const processedClusters = useMemo(() => {
    if (!marketClusters?.length) return [];

    return marketClusters.map(cluster => {
      // Calculate internal connectivity based on flow data
      const internalFlows = flowMaps.filter(flow => 
        cluster.connected_markets.includes(flow.source) && 
        cluster.connected_markets.includes(flow.target)
      );

      const connectivity = internalFlows.reduce((sum, flow) => 
        sum + (flow.total_flow || 0), 0) / (cluster.market_count * (cluster.market_count - 1));

      // Calculate price convergence
      const clusterPrices = timeSeriesData.filter(d => 
        cluster.connected_markets.includes(d.region)
      );

      const priceVariation = calculatePriceVariation(clusterPrices);
      const stability = calculateStability(clusterPrices);

      return {
        ...cluster,
        efficiency_metrics: {
          internal_connectivity: connectivity,
          market_coverage: cluster.market_count / (marketClusters.length || 1),
          price_convergence: 1 - priceVariation,
          stability,
          efficiency_score: calculateEfficiencyScore({
            connectivity,
            coverage: cluster.market_count / (marketClusters.length || 1),
            priceConvergence: 1 - priceVariation,
            stability
          })
        }
      };
    });
  }, [marketClusters, flowMaps, timeSeriesData]);

  // Calculate overall efficiency metrics
  const efficiencyMetrics = useMemo(() => {
    if (!processedClusters.length) return null;

    return {
      avgEfficiency: _.meanBy(processedClusters, 'efficiency_metrics.efficiency_score'),
      avgConnectivity: _.meanBy(processedClusters, 'efficiency_metrics.internal_connectivity'),
      avgCoverage: _.meanBy(processedClusters, 'efficiency_metrics.market_coverage'),
      totalMarkets: _.sumBy(processedClusters, 'market_count'),
      maxEfficiency: _.maxBy(processedClusters, 'efficiency_metrics.efficiency_score')?.efficiency_metrics.efficiency_score,
      minEfficiency: _.minBy(processedClusters, 'efficiency_metrics.efficiency_score')?.efficiency_metrics.efficiency_score
    };
  }, [processedClusters]);

  // Generate connectivity matrix
  const connectivityMatrix = useMemo(() => {
    if (!processedClusters.length) return null;

    const matrix = {};
    processedClusters.forEach(cluster => {
      matrix[cluster.main_market] = {};
      cluster.connected_markets.forEach(market => {
        matrix[cluster.main_market][market] = cluster.efficiency_metrics.internal_connectivity;
      });
    });

    return matrix;
  }, [processedClusters]);

  return {
    processedClusters,
    efficiencyMetrics,
    connectivityMatrix,
    geometry
  };
};

// Helper functions
const calculatePriceVariation = (prices) => {
  if (!prices?.length) return 1;
  const meanPrice = _.meanBy(prices, 'avgUsdPrice');
  const variance = prices.reduce((sum, p) => 
    sum + Math.pow(p.avgUsdPrice - meanPrice, 2), 0) / prices.length;
  return Math.sqrt(variance) / meanPrice;
};

const calculateStability = (prices) => {
  if (!prices?.length) return 0;
  const sortedPrices = _.sortBy(prices, 'date');
  const priceChanges = [];
  
  for (let i = 1; i < sortedPrices.length; i++) {
    const change = Math.abs(
      sortedPrices[i].avgUsdPrice - sortedPrices[i-1].avgUsdPrice
    ) / sortedPrices[i-1].avgUsdPrice;
    priceChanges.push(change);
  }

  return 1 / (1 + _.mean(priceChanges));
};

const calculateEfficiencyScore = ({
  connectivity,
  coverage,
  priceConvergence,
  stability
}) => {
  const weights = {
    connectivity: 0.3,
    coverage: 0.2,
    priceConvergence: 0.3,
    stability: 0.2
  };

  return (
    weights.connectivity * connectivity +
    weights.coverage * coverage +
    weights.priceConvergence * priceConvergence +
    weights.stability * stability
  );
};