import { getDataPath } from './dataUtils';
import { backgroundMonitor } from './backgroundMonitor';
import { regionMapping, excludedRegions } from './appUtils';
import proj4 from 'proj4';

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';
const YEMEN_TM = 'EPSG:2098';

proj4.defs(
  UTM_ZONE_38N,
  '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs'
);
proj4.defs(
  YEMEN_TM,
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs'
);

export class SpatialDataMerger {
  constructor() {
    this.cache = new Map();
    this.geometryCache = new Map(); // Cache for coordinate transformations
  }

  async mergeData(preprocessedData, selectedCommodity, selectedDate) {
    const metric = backgroundMonitor.startMetric('merge-spatial-data');
    
    try {
      const geometries = await this.loadGeometries();
      const transformedData = this.transformPreprocessedData(preprocessedData, selectedDate);
      const mergedData = await this.mergeGeometries(transformedData, geometries, selectedDate);

      metric.finish({ status: 'success' });
      return mergedData;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  async loadGeometries() {
    const cacheKey = 'geometries';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const [boundaries, enhanced] = await Promise.all([
        fetch(getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson')).then(res => res.json()),
        fetch(getDataPath('enhanced_unified_data_with_residual.geojson')).then(res => res.json())
      ]);

      const mergedGeometries = this.mergeGeometryData(boundaries, enhanced);
      this.cache.set(cacheKey, mergedGeometries);
      
      return mergedGeometries;
    } catch (error) {
      console.error('Error loading geometries:', error);
      throw error;
    }
  }

  mergeGeometryData(boundaries, enhanced) {
    const geometryMap = new Map();
    
    boundaries.features.forEach(feature => {
      const id = this.normalizeRegionId(feature.properties.shapeName);
      
      if (excludedRegions.includes(id)) return;

      const transformedGeometry = this.transformGeometry(feature.geometry);
      if (id) {
        geometryMap.set(id, {
          geometry: transformedGeometry,
          properties: { ...feature.properties }
        });
      }
    });

    enhanced.features.forEach(feature => {
      const id = this.normalizeRegionId(feature.properties.region_id || feature.properties.shapeName);

      if (excludedRegions.includes(id)) return;

      if (id && geometryMap.has(id)) {
        const existing = geometryMap.get(id);
        const transformedGeometry = this.transformGeometry(feature.geometry);
        
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

  transformGeometry(geometry) {
    if (!geometry || !geometry.type || !geometry.coordinates) return geometry;

    const cacheKey = JSON.stringify(geometry);
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey);
    }

    let transformedGeometry = geometry;

    try {
      if (geometry.type === 'Point') {
        transformedGeometry = {
          ...geometry,
          coordinates: this.transformCoordinates(geometry.coordinates)
        };
      } else if (geometry.type === 'Polygon') {
        transformedGeometry = {
          ...geometry,
          coordinates: geometry.coordinates.map(ring => ring.map(coord => this.transformCoordinates(coord)))
        };
      }

      this.geometryCache.set(cacheKey, transformedGeometry);
      return transformedGeometry;
    } catch (error) {
      console.error('Geometry transformation error:', error);
      return geometry;
    }
  }

  transformCoordinates([x, y], sourceCRS = UTM_ZONE_38N) {
    try {
      if (this.coordinatesInWGS84([x, y])) {
        return [x, y];
      }
      return proj4(sourceCRS, WGS84, [x, y]);
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      return [x, y];
    }
  }

  coordinatesInWGS84(coords) {
    if (!Array.isArray(coords)) return false;
    const [lng, lat] = coords;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  normalizeRegionId(id) {
    if (!id) return null;

    const normalized = id.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return regionMapping[normalized] || normalized;
  }

  transformPreprocessedData(data, targetDate) {
    const timeSeriesData = data.time_series_data || [];
    const timeSeriesForDate = timeSeriesData.find(d => d.month === targetDate) || null;

    const features = this.createFeaturesFromClusters(data.market_clusters, timeSeriesForDate);

    const filteredFeatures = features.filter(feature => {
      const regionId = this.normalizeRegionId(feature.properties.id);
      return !excludedRegions.includes(regionId);
    });

    return {
      geoData: {
        type: 'FeatureCollection',
        features: filteredFeatures
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

  createFeaturesFromClusters(clusters, timeSeriesData) {
    if (!clusters) return [];

    return clusters.reduce((acc, cluster) => {
      const mainMarketId = this.normalizeRegionId(cluster.main_market);
      
      if (excludedRegions.includes(mainMarketId)) return acc;

      acc.push({
        type: 'Feature',
        properties: {
          id: mainMarketId,
          originalId: cluster.main_market,
          isMainMarket: true,
          clusterSize: cluster.market_count,
          marketRole: 'hub',
          priceData: timeSeriesData,
          cluster_id: cluster.cluster_id
        },
        geometry: null
      });

      cluster.connected_markets.forEach(market => {
        const marketId = this.normalizeRegionId(market);
        
        if (!excludedRegions.includes(marketId)) {
          acc.push({
            type: 'Feature',
            properties: {
              id: marketId,
              originalId: market,
              isMainMarket: false,
              clusterSize: cluster.market_count,
              marketRole: 'peripheral',
              priceData: timeSeriesData,
              cluster_id: cluster.cluster_id
            },
            geometry: null
          });
        }
      });

      return acc;
    }, []);
  }

  filterShocksByDate(shocks = [], targetDate) {
    if (!targetDate || !shocks) return [];
    
    return shocks
      .filter(shock => {
        const regionId = this.normalizeRegionId(shock.region);
        return shock.date.startsWith(targetDate) && !excludedRegions.includes(regionId);
      })
      .map(shock => ({
        ...shock,
        region: this.normalizeRegionId(shock.region)
      }));
  }

  transformFlowData(flows = []) {
    if (!flows) return [];

    return flows
      .filter(flow => {
        const sourceId = this.normalizeRegionId(flow.source);
        const targetId = this.normalizeRegionId(flow.target);
        return !excludedRegions.includes(sourceId) && !excludedRegions.includes(targetId);
      })
      .map(flow => ({
        source: this.normalizeRegionId(flow.source),
        target: this.normalizeRegionId(flow.target),
        flow_weight: flow.total_flow,
        avg_flow: flow.avg_flow,
        flow_count: flow.flow_count,
        price_differential: flow.avg_price_differential,
        original_source: flow.source,
        original_target: flow.target
      }));
  }

  async mergeGeometries(transformedData, geometryMap, selectedDate) {
    const features = transformedData.geoData.features.map(feature => {
      const id = this.normalizeRegionId(feature.properties.id);
      const geometryData = geometryMap.get(id);
      
      if (geometryData) {
        const properties = {
          ...feature.properties,
          ...geometryData.properties,
          normalizedId: id,
          originalId: feature.properties.id
        };

        return {
          ...feature,
          geometry: geometryData.geometry,
          properties
        };
      }

      console.warn(`No geometry found for region: ${id} (original: ${feature.properties.id})`);
      return feature;
    });

    // Filter out features without geometry
    const validFeatures = features.filter(feature => feature.geometry !== null);

    return {
      ...transformedData,
      geoData: {
        type: 'FeatureCollection',
        features: validFeatures,
        metadata: {
          processedDate: new Date().toISOString(),
          totalFeatures: validFeatures.length,
          excludedRegions: excludedRegions,
          projection: WGS84
        }
      }
    };
  }

  validateGeometry(geometry) {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return false;
    }

    try {
      if (geometry.type === 'Point') {
        return Array.isArray(geometry.coordinates) &&
               geometry.coordinates.length === 2 &&
               !isNaN(geometry.coordinates[0]) &&
               !isNaN(geometry.coordinates[1]);
      } else if (geometry.type === 'Polygon') {
        return Array.isArray(geometry.coordinates) && 
               geometry.coordinates.length > 0 &&
               Array.isArray(geometry.coordinates[0]);
      }
      return false;
    } catch (error) {
      console.error('Geometry validation error:', error);
      return false;
    }
  }
}

export const spatialDataMerger = new SpatialDataMerger();
export const loadGeometries = spatialDataMerger.loadGeometries.bind(spatialDataMerger);
