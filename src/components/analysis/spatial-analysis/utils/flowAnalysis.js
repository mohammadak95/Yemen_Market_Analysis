// src/components/analysis/spatial-analysis/utils/flowAnalysis.js

export const calculateNetworkStats = (flows) => {
    const totalVolume = _.sumBy(flows, 'total_flow');
    const avgFlowSize = totalVolume / flows.length;
    
    const uniqueMarkets = new Set([
      ...flows.map(f => f.source),
      ...flows.map(f => f.target)
    ]);
    
    const activeMarkets = uniqueMarkets.size;
    const maxPossibleFlows = activeMarkets * (activeMarkets - 1);
    const flowDensity = flows.length / maxPossibleFlows;
  
    return {
      totalVolume,
      avgFlowSize,
      activeMarkets,
      flowDensity
    };
  };
  
  export const processFlowMetrics = (flows, marketIntegration) => {
    // Calculate top flows
    const topFlows = _.orderBy(flows, ['total_flow'], ['desc'])
      .slice(0, 10)
      .map(flow => ({
        ...flow,
        avg_price_differential: calculatePriceDifferential(
          flow.source,
          flow.target,
          marketIntegration
        )
      }));
  
    // Calculate region-specific metrics
    const regionMetrics = {};
    const markets = _.uniq([...flows.map(f => f.source), ...flows.map(f => f.target)]);
  
    markets.forEach(region => {
      const inflows = flows.filter(f => f.target === region);
      const outflows = flows.filter(f => f.source === region);
      
      regionMetrics[region] = {
        inflow: _.sumBy(inflows, 'total_flow'),
        outflow: _.sumBy(outflows, 'total_flow'),
        netFlow: _.sumBy(inflows, 'total_flow') - _.sumBy(outflows, 'total_flow'),
        totalFlow: _.sumBy(inflows, 'total_flow') + _.sumBy(outflows, 'total_flow'),
        priceImpact: calculatePriceImpact(region, inflows, outflows, marketIntegration)
      };
    });
  
    return {
      topFlows,
      regionMetrics
    };
  };
  
  export const aggregateTimeSeriesFlows = (flows) => {
    // Group flows by time periods
    const daily = aggregateByTimeframe(flows, 'day');
    const weekly = aggregateByTimeframe(flows, 'week');
    const monthly = aggregateByTimeframe(flows, 'month');
  
    return {
      daily,
      weekly,
      monthly
    };
  };
  
  // Helper functions
  
  const calculatePriceDifferential = (source, target, marketIntegration) => {
    if (!marketIntegration?.price_correlation) return 0;
    
    const sourceCorr = marketIntegration.price_correlation[source];
    const targetCorr = marketIntegration.price_correlation[target];
    
    if (!sourceCorr || !targetCorr) return 0;
    
    return sourceCorr[target] || targetCorr[source] || 0;
  };
  
  const calculatePriceImpact = (region, inflows, outflows, marketIntegration) => {
    if (!marketIntegration?.accessibility) return 0;
    
    const accessibility = marketIntegration.accessibility[region] || 1;
    const netFlow = _.sumBy(inflows, 'total_flow') - _.sumBy(outflows, 'total_flow');
    const totalFlow = _.sumBy(inflows, 'total_flow') + _.sumBy(outflows, 'total_flow');
    
    if (totalFlow === 0) return 0;
    
    return (netFlow / totalFlow) * accessibility * 100;
  };
  
  const aggregateByTimeframe = (flows, timeframe) => {
    // Group flows by timeframe and calculate metrics
    const grouped = _.groupBy(flows, flow => {
      const date = new Date(flow.date);
      switch (timeframe) {
        case 'week':
          return `${date.getFullYear()}-W${Math.ceil((date.getDate() + date.getDay()) / 7)}`;
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        default:
          return flow.date;
      }
    });
  
    return Object.entries(grouped).map(([date, groupFlows]) => ({
      date,
      totalFlow: _.sumBy(groupFlows, 'total_flow'),
      avgPriceDiff: _.meanBy(groupFlows, 'avg_price_differential'),
      flowCount: groupFlows.length
    }));
  };