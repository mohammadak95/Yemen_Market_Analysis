export const calculateClusterMetrics = (clusters, timeSeriesData) => {
  if (!clusters?.length || !timeSeriesData?.length) {
    return { clusters: [], metrics: null };
  }

  // Calculate enhanced cluster metrics
  const enhancedClusters = clusters.map(cluster => {
    const clusterData = timeSeriesData.filter(d =>
      cluster.connected_markets.includes(d.region)
    );

    // Basic metrics
    const avgPrice = clusterData.reduce((sum, d) => sum + (d.usdPrice || 0), 0) / clusterData.length;
    const avgConflict = clusterData.reduce((sum, d) => sum + (d.conflictIntensity || 0), 0) / clusterData.length;

    // Price volatility (normalized between 0 and 1)
    const priceStdDev = Math.sqrt(
      clusterData.reduce((sum, d) => sum + Math.pow(d.usdPrice - avgPrice, 2), 0) / clusterData.length
    );
    const priceCoeffVar = Math.min(priceStdDev / (avgPrice || 1), 1);

    // Integration score (normalized between 0 and 1)
    const maxPossibleConnections = Math.max(...clusters.map(c => c.connected_markets.length));
    const integrationScore = cluster.connected_markets.length / maxPossibleConnections;

    // Stability score (normalized between 0 and 1)
    const maxVolatility = Math.max(...clusters.map(c => {
      const cData = timeSeriesData.filter(d => c.connected_markets.includes(d.region));
      const cAvg = cData.reduce((sum, d) => sum + (d.usdPrice || 0), 0) / cData.length;
      const cStdDev = Math.sqrt(
        cData.reduce((sum, d) => sum + Math.pow(d.usdPrice - cAvg, 2), 0) / cData.length
      );
      return cStdDev / (cAvg || 1);
    }));
    const stabilityScore = 1 - (priceCoeffVar / (maxVolatility || 1));

    return {
      ...cluster,
      metrics: {
        avgPrice,
        avgConflict,
        marketCount: cluster.connected_markets.length,
        priceVolatility: priceCoeffVar,
        integrationScore,
        stabilityScore,
        resilience: (integrationScore + stabilityScore) / 2
      }
    };
  });

  // Calculate overall metrics (all normalized between 0 and 1)
  const overallMetrics = {
    totalMarkets: enhancedClusters.reduce((sum, c) => sum + c.metrics.marketCount, 0),
    avgPrice: enhancedClusters.reduce((sum, c) => sum + c.metrics.avgPrice, 0) / enhancedClusters.length,
    avgConflict: enhancedClusters.reduce((sum, c) => sum + c.metrics.avgConflict, 0) / enhancedClusters.length,
    systemIntegration: enhancedClusters.reduce((sum, c) => sum + c.metrics.integrationScore, 0) / enhancedClusters.length,
    systemStability: enhancedClusters.reduce((sum, c) => sum + c.metrics.stabilityScore, 0) / enhancedClusters.length,
    systemResilience: enhancedClusters.reduce((sum, c) => sum + c.metrics.resilience, 0) / enhancedClusters.length
  };

  return { clusters: enhancedClusters, metrics: overallMetrics };
};
