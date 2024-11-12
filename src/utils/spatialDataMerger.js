// src/utils/spatialDataMerger.js

import { getDataPath } from './dataUtils';
import { backgroundMonitor } from './backgroundMonitor';

/**
 * Comprehensive spatial data merger that matches existing system
 */
export class SpatialDataMerger {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Main merge function that combines preprocessed and geometry data
   */
  async mergeData(preprocessedData, selectedCommodity, selectedDate) {
    const metric = backgroundMonitor.startMetric('merge-spatial-data');
    
    try {
      // Load geometries if not cached
      const geometries = await this.loadGeometries();
      
      // Transform preprocessed data
      const transformedData = this.transformPreprocessedData(
        preprocessedData,
        selectedDate
      );

      // Merge geometries with transformed data
      const mergedData = await this.mergeGeometries(
        transformedData,
        geometries,
        selectedDate
      );

      metric.finish({ status: 'success' });
      return mergedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Load geometry data from GeoJSON files
   */
  async loadGeometries() {
    const cacheKey = 'geometries';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const [boundaries, enhanced] = await Promise.all([
        fetch(getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson'))
          .then(res => res.json()),
        fetch(getDataPath('enhanced_unified_data_with_residual.geojson'))
          .then(res => res.json())
      ]);

      // Merge the geometries
      const mergedGeometries = this.mergeGeometryData(boundaries, enhanced);
      this.cache.set(cacheKey, mergedGeometries);
      
      return mergedGeometries;

    } catch (error) {
      console.error('Error loading geometries:', error);
      throw error;
    }
  }

  /**
   * Merge geometry data from multiple sources
   */
  mergeGeometryData(boundaries, enhanced) {
    const geometryMap = new Map();
    
    // Add base boundaries
    boundaries.features.forEach(feature => {
      const id = this.normalizeRegionId(
        feature.properties.shapeName || 
        feature.properties.region_id
      );
      if (id) {
        geometryMap.set(id, {
          geometry: feature.geometry,
          properties: { ...feature.properties }
        });
      }
    });

    // Enhance with additional data
    enhanced.features.forEach(feature => {
      const id = this.normalizeRegionId(
        feature.properties.region_id || 
        feature.properties.shapeName
      );
      if (id && geometryMap.has(id)) {
        const existing = geometryMap.get(id);
        geometryMap.set(id, {
          geometry: existing.geometry,
          properties: {
            ...existing.properties,
            ...feature.properties
          }
        });
      }
    });

    return geometryMap;
  }

  /**
   * Transform preprocessed data into required format
   */
  transformPreprocessedData(data, targetDate) {
    const timeSeriesData = data.time_series_data || [];
    const timeSeriesForDate = timeSeriesData.find(d => 
      d.month === targetDate
    ) || null;

    // Create features from market clusters
    const features = this.createFeaturesFromClusters(
      data.market_clusters,
      timeSeriesForDate
    );

    return {
      geoData: {
        type: 'FeatureCollection',
        features
      },
      marketClusters: data.market_clusters || [],
      detectedShocks: this.filterShocksByDate(data.market_shocks, targetDate),
      timeSeriesData,
      flowMaps: this.transformFlowData(data.flow_analysis),
      analysisResults: {
        spatialAutocorrelation: data.spatial_autocorrelation || {},
        metadata: data.metadata || {}
      }
    };
  }

  /**
   * Create GeoJSON features from market clusters
   */
  createFeaturesFromClusters(clusters, timeSeriesData) {
    return clusters.reduce((acc, cluster) => {
      // Add main market
      acc.push({
        type: 'Feature',
        properties: {
          id: cluster.main_market,
          isMainMarket: true,
          clusterSize: cluster.market_count,
          marketRole: 'hub',
          priceData: timeSeriesData,
          cluster_id: cluster.cluster_id
        },
        geometry: null
      });

      // Add connected markets
      cluster.connected_markets.forEach(market => {
        acc.push({
          type: 'Feature',
          properties: {
            id: market,
            isMainMarket: false,
            clusterSize: cluster.market_count,
            marketRole: 'peripheral',
            priceData: timeSeriesData,
            cluster_id: cluster.cluster_id
          },
          geometry: null
        });
      });

      return acc;
    }, []);
  }

  /**
   * Filter shocks by date
   */
  filterShocksByDate(shocks = [], targetDate) {
    if (!targetDate) return [];
    return shocks.filter(shock => shock.date.startsWith(targetDate));
  }

  /**
   * Transform flow data
   */
  transformFlowData(flows = []) {
    return flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      flow_weight: flow.total_flow,
      avg_flow: flow.avg_flow,
      flow_count: flow.flow_count,
      price_differential: flow.avg_price_differential
    }));
  }

  /**
   * Merge geometries into features
   */
  async mergeGeometries(transformedData, geometryMap, selectedDate) {
    const features = transformedData.geoData.features.map(feature => {
      const id = this.normalizeRegionId(feature.properties.id);
      const geometryData = geometryMap.get(id);
      
      if (geometryData) {
        return {
          ...feature,
          geometry: geometryData.geometry,
          properties: {
            ...feature.properties,
            ...geometryData.properties
          }
        };
      }
      return feature;
    });

    return {
      ...transformedData,
      geoData: {
        type: 'FeatureCollection',
        features
      }
    };
  }

  /**
   * Normalize region IDs for consistent matching
   */
  normalizeRegionId(id) {
    if (!id) return null;
    return id.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');
  }
}

export const spatialDataMerger = new SpatialDataMerger();