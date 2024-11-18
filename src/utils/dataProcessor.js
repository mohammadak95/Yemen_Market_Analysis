// src/utils/dataProcessor.js

/**
 * Simplified data processing utilities
 */
export const dataProcessor = {
    // Normalize region names
    normalizeRegion: (name) => {
      if (!name) return '';
      return name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .trim();
    },
  
    // Process time series data
    processTimeSeries: (data) => {
      return data.map(entry => ({
        date: entry.date,
        price: parseFloat(entry.price) || 0,
        usdprice: parseFloat(entry.usdprice) || 0,
        conflict_intensity: parseFloat(entry.conflict_intensity) || 0,
        region: dataProcessor.normalizeRegion(entry.region || entry.admin1)
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
    },
  
    // Process market clusters
    processClusters: (clusters) => {
      return clusters.map(cluster => ({
        cluster_id: cluster.cluster_id,
        main_market: dataProcessor.normalizeRegion(cluster.main_market),
        connected_markets: cluster.connected_markets.map(m => 
          dataProcessor.normalizeRegion(m)
        ),
        market_count: parseInt(cluster.market_count) || 0
      }));
    },
  
    // Validate data structure
    validateData: (data) => {
      const required = [
        'time_series_data',
        'market_clusters',
        'flow_analysis',
        'spatial_autocorrelation'
      ];
  
      const missing = required.filter(field => !data[field]);
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }
  
      return true;
    }
  };
  
  export default dataProcessor;