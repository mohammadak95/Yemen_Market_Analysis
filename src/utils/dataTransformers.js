// src/utils/dataTransformers.js

import { THRESHOLDS } from './spatialUtils';
import { backgroundMonitor } from './backgroundMonitor';


/**
 * Transform raw data into GeoJSON format
 */
export function transformGeoData(rawData, targetDate) {
  const metric = backgroundMonitor.startMetric('transform-geo-data');
  try {
    // Create basic GeoJSON structure
    const transformed = {
      type: 'FeatureCollection',
      features: Object.entries(rawData.market_clusters.reduce((acc, cluster) => {
        // Add main market
        acc[cluster.main_market] = {
          type: 'Feature',
          properties: {
            id: cluster.main_market,
            isMainMarket: true,
            clusterSize: cluster.market_count,
            marketType: 'hub',
            priceData: timeSeriesForDate
          },
          geometry: null // Would need to be populated with actual coordinates
        };

        // Add connected markets
        cluster.connected_markets.forEach(market => {
          if (!acc[market]) {
            acc[market] = {
              type: 'Feature',
              properties: {
                id: market,
                isMainMarket: false,
                clusterSize: cluster.market_count,
                marketType: 'peripheral',
                priceData: timeSeriesForDate
              },
              geometry: null // Would need to be populated with actual coordinates
            };
          }
        });

        return acc;
      }, {})).map(([_, feature]) => feature)
    };

    metric.finish({ status: 'success' });
    return transformed;
  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    throw error;
  }
}
  
  /**
   * Process market shock data
   */
  export function processMarketShocks(shocks, timeframe) {
    if (!Array.isArray(shocks)) return [];
  
    return shocks
      .filter(shock => {
        if (!timeframe) return true;
        const shockDate = new Date(shock.date);
        return shockDate >= timeframe.start && shockDate <= timeframe.end;
      })
      .map(shock => ({
        id: `${shock.region}_${shock.date}_${shock.type}`,
        region: shock.region,
        date: new Date(shock.date),
        type: shock.shock_type,
        magnitude: shock.magnitude,
        severity: shock.magnitude > 50 ? 'high' : shock.magnitude > 25 ? 'medium' : 'low',
        priceChange: {
          previous: shock.previous_price,
          current: shock.current_price,
          percentChange: ((shock.current_price - shock.previous_price) / shock.previous_price) * 100
        }
      }));
  }
  
  /**
   * Process market clusters
   */
  export function processMarketClusters(clusters) {
    if (!Array.isArray(clusters)) return [];
  
    return clusters.map(cluster => ({
      id: `cluster_${cluster.main_market}`,
      mainMarket: cluster.main_market,
      markets: cluster.connected_markets,
      size: cluster.market_count,
      metrics: {
        density: cluster.market_count / (cluster.connected_markets.length + 1),
        centrality: cluster.connected_markets.length
      }
    }));
  }
  
  /**
   * Calculate market metrics
   */
  export function calculateMarketMetrics(data) {
    const timeSeriesData = data.time_series_data || [];
    const shocks = data.market_shocks || [];
    const spatialMetrics = data.spatial_autocorrelation || {};
  
    return {
      priceMetrics: {
        average: timeSeriesData.reduce((acc, d) => acc + d.avgUsdPrice, 0) / timeSeriesData.length,
        volatility: timeSeriesData.reduce((acc, d) => acc + d.volatility, 0) / timeSeriesData.length,
        trend: calculatePriceTrend(timeSeriesData)
      },
      shockMetrics: {
        total: shocks.length,
        surges: shocks.filter(s => s.shock_type === 'price_surge').length,
        drops: shocks.filter(s => s.shock_type === 'price_drop').length,
        averageMagnitude: shocks.reduce((acc, s) => acc + s.magnitude,0) / (shocks.length || 1)
    },
    spatialMetrics: {
      moranI: spatialMetrics.moran_i || 0,
      pValue: spatialMetrics.p_value || 1,
      isSignificant: spatialMetrics.significance || false
    },
    marketStructure: {
      clusterCount: data.market_clusters?.length || 0,
      averageClusterSize: calculateAverageClusterSize(data.market_clusters),
      flowDensity: calculateFlowDensity(data.flow_analysis)
    }
  };
}

function calculatePriceTrend(timeSeriesData) {
  if (timeSeriesData.length < 2) return 0;
  
  const prices = timeSeriesData.map(d => d.avgUsdPrice);
  const n = prices.length;
  
  // Simple linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  prices.forEach((price, index) => {
    sumX += index;
    sumY += price;
    sumXY += index * price;
    sumX2 += index * index;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

function calculateAverageClusterSize(clusters) {
  if (!clusters?.length) return 0;
  return clusters.reduce((acc, cluster) => acc + cluster.market_count, 0) / clusters.length;
}

function calculateFlowDensity(flows) {
  if (!flows?.length) return 0;
  const uniqueMarkets = new Set();
  flows.forEach(flow => {
    uniqueMarkets.add(flow.source);
    uniqueMarkets.add(flow.target);
  });
  const marketCount = uniqueMarkets.size;
  return flows.length / (marketCount * (marketCount - 1));
}

export function validateDataStructure(data) {
  const requiredFields = [
    'time_series_data',
    'market_shocks',
    'market_clusters',
    'flow_analysis',
    'spatial_autocorrelation',
    'metadata'
  ];

  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  return true;
}