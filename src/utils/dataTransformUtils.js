
// src/utils/spatialTransformUtils.js

/**
 * Utility functions for transforming spatial data for visualization
 */
const spatialTransformUtils = {
  /**
   * Transform time series data for visualization
   * @param {TimeSeriesEntry[]} timeSeriesData 
   * @param {Object} options
   * @returns {Object} Transformed data for charts
   */
  transformTimeSeriesForViz(timeSeriesData, options = {}) {
    const {
      includeGarch = true,
      includeConflict = true,
      smoothing = false,
      windowSize = 3
    } = options;

    let transformed = timeSeriesData.map(entry => ({
      date: new Date(entry.month),
      price: entry.avgUsdPrice,
      volatility: entry.volatility,
      ...(includeGarch && { garchVolatility: entry.garch_volatility }),
      ...(includeConflict && { 
        conflictIntensity: entry.conflict_intensity,
        stability: entry.price_stability
      })
    }));

    if (smoothing) {
      transformed = this.applyMovingAverage(transformed, windowSize);
    }

    return {
      dates: transformed.map(d => d.date),
      prices: transformed.map(d => d.price),
      volatility: transformed.map(d => d.volatility),
      ...(includeGarch && { garchVolatility: transformed.map(d => d.garchVolatility) }),
      ...(includeConflict && {
        conflictIntensity: transformed.map(d => d.conflictIntensity),
        stability: transformed.map(d => d.stability)
      })
    };
  },

  /**
   * Transform spatial data for choropleth visualization
   * @param {PrecomputedData} data 
   * @param {string} metric 
   * @returns {Object} Transformed data for choropleth
   */
  transformForChoropleth(data, metric) {
    const metricMap = {
      'price': d => d.avgUsdPrice,
      'volatility': d => d.volatility,
      'stability': d => d.price_stability,
      'conflict': d => d.conflict_intensity,
      'integration': (_, region) => data.spatialAutocorrelation.local[region]?.local_i || 0,
      'hotspot': (_, region) => data.spatialAutocorrelation.hotspots[region]?.gi_star || 0
    };

    const getMetricValue = metricMap[metric] || metricMap.price;

    const latestTimeSeries = this.getLatestTimeSlice(data.timeSeriesData);
    
    return Object.entries(data.spatialAutocorrelation.local).map(([region, stats]) => ({
      region,
      value: getMetricValue(latestTimeSeries[region], region),
      significance: stats.p_value < 0.05,
      clusterType: stats.cluster_type,
      hotspotIntensity: data.spatialAutocorrelation.hotspots[region]?.intensity
    }));
  },

  /**
   * Transform flow data for network visualization
   * @param {FlowAnalysis[]} flows 
   * @param {Object} options
   * @returns {Object} Transformed data for network viz
   */
  transformFlowsForNetwork(flows, options = {}) {
    const {
      minFlowWeight = 0,
      maxFlows = Infinity,
      includeCoordinates = true
    } = options;

    const filteredFlows = flows
      .filter(flow => flow.total_flow >= minFlowWeight)
      .sort((a, b) => b.total_flow - a.total_flow)
      .slice(0, maxFlows);

    const nodes = new Set();
    filteredFlows.forEach(flow => {
      nodes.add(flow.source);
      nodes.add(flow.target);
    });

    return {
      nodes: Array.from(nodes).map(id => ({
        id,
        ...(includeCoordinates && {
          coordinates: this.getNodeCoordinates(id, flows)
        })
      })),
      links: filteredFlows.map(flow => ({
        source: flow.source,
        target: flow.target,
        weight: flow.total_flow,
        value: flow.avg_flow,
        count: flow.flow_count
      }))
    };
  },

  /**
   * Transform cluster data for visualization
   * @param {MarketCluster[]} clusters 
   * @param {Object} options
   * @returns {Object} Transformed cluster data
   */
  transformClustersForViz(clusters, options = {}) {
    const {
      includeMetrics = true,
      includeEfficiency = true
    } = options;

    return clusters.map(cluster => ({
      id: cluster.cluster_id,
      mainMarket: cluster.main_market,
      markets: cluster.connected_markets,
      size: cluster.market_count,
      ...(includeMetrics && { metrics: cluster.metrics }),
      ...(includeEfficiency && { efficiency: cluster.efficiency })
    }));
  },

  // Helper functions
  applyMovingAverage(data, window) {
    return data.map((entry, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(data.length, index + Math.floor(window / 2) + 1);
      const windowData = data.slice(start, end);
      
      return {
        ...entry,
        price: this.calculateWindowAverage(windowData, 'price'),
        volatility: this.calculateWindowAverage(windowData, 'volatility'),
        ...(entry.garchVolatility && {
          garchVolatility: this.calculateWindowAverage(windowData, 'garchVolatility')
        })
      };
    });
  },

  calculateWindowAverage(windowData, field) {
    return windowData.reduce((sum, entry) => sum + (entry[field] || 0), 0) / windowData.length;
  },

  getLatestTimeSlice(timeSeriesData) {
    const latestDate = Math.max(...timeSeriesData.map(d => new Date(d.month)));
    return timeSeriesData
      .filter(d => new Date(d.month).getTime() === latestDate)
      .reduce((acc, entry) => ({
        ...acc,
        [entry.region]: entry
      }), {});
  },

  getNodeCoordinates(nodeId, flows) {
    const nodeFlow = flows.find(f => f.source === nodeId || f.target === nodeId);
    return nodeFlow?.source === nodeId ? 
      nodeFlow.source_coordinates : 
      nodeFlow.target_coordinates;
  }
};
