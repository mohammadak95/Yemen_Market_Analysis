// src/utils/spatialDataMerger.js

import { getDataPath } from './dataUtils';
import { backgroundMonitor } from './backgroundMonitor';
import proj4 from 'proj4';
import JSON5 from 'json5';

const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';

proj4.defs(UTM_ZONE_38N, '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs');

const REGION_MAPPINGS = {
  "sanaa": ["san'a'", "san_a__governorate", "sana'a", "sanʿaʾ", "amanat al asimah", "sana'a city", "amanat_al_asimah"],
  "lahj": ["lahij_governorate", "lahij", "lahj_governorate"],
  "aden": ["_adan_governorate", "aden", "'adan governorate", "adan_governorate"],
  "hodeidah": ["al_hudaydah_governorate", "al hudaydah", "hudaydah", "al_hudaydah"],
  "taizz": ["taizz_governorate", "taizz", "taiz", "ta'izz"],
  "shabwah": ["shabwah_governorate", "shabwah", "shabwa"],
  "hadramaut": ["hadhramaut", "hadramaut", "hadhramout"],
  "abyan": ["abyan_governorate", "abyan"],
  "al_jawf": ["al_jawf_governorate", "al jawf"],
  "ibb": ["ibb_governorate", "ibb"],
  "al_bayda": ["al_bayda__governorate", "al bayda", "al_bayda_governorate"],
  "al_dhale": ["ad_dali__governorate", "al dhale'e", "al_dhale_e", "ad dali governorate"],
  "al_mahwit": ["al_mahwit_governorate", "al mahwit"],
  "hajjah": ["hajjah_governorate", "hajjah"],
  "dhamar": ["dhamar_governorate", "dhamar"],
  "amran": ["_amran_governorate", "amran", "'amran"],
  "al_maharah": ["al_mahrah_governorate", "al maharah", "mahra"],
  "marib": ["ma'rib_governorate", "marib", "ma'rib", "marib_governorate"],
  "raymah": ["raymah_governorate", "raymah"],
  "socotra": ["socotra", "soqotra", "suqutra"]
};

// Regions to exclude from processing
const excludedRegions = [
  'socotra',
  'unknown',
  'undefined',
  'other'
];

class SpatialDataMerger {
  constructor() {
    this.cache = new Map();
    this.geometryCache = new Map();
    this.mappingCache = new Map();
  }

  /**
   * Normalizes region IDs using predefined mappings.
   */
  normalizeRegionId(id) {
    if (!id) return null;

    const cacheKey = id.toLowerCase();
    if (this.mappingCache.has(cacheKey)) {
      return this.mappingCache.get(cacheKey);
    }

    const normalized = this.normalizeString(id);

    let standardId = null;
    for (const [standard, variants] of Object.entries(REGION_MAPPINGS)) {
      if (standard === normalized || variants.some((v) => this.normalizeString(v) === normalized)) {
        standardId = standard;
        break;
      }
    }

    this.mappingCache.set(cacheKey, standardId || normalized);
    return standardId || normalized;
  }

  /**
   * Normalizes a string by removing diacritics and special characters.
   */
  normalizeString(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['\u2018\u2019]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .trim();
  }

  /**
   * Merges preprocessed data with spatial geometries.
   */
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

  /**
   * Loads geometries from GeoJSON files and merges them.
   */
  async loadGeometries() {
    const cacheKey = 'geometries';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const [boundariesResponse, enhancedResponse] = await Promise.all([
        fetch(getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson')),
        fetch(getDataPath('enhanced_unified_data_with_residual.geojson')),
      ]);

      const boundariesText = await boundariesResponse.text();
      const boundaries = JSON5.parse(boundariesText);

      const enhancedText = await enhancedResponse.text();
      const enhanced = JSON5.parse(enhancedText);

      const mergedGeometries = this.mergeGeometryData(boundaries, enhanced);
      this.cache.set(cacheKey, mergedGeometries);

      return mergedGeometries;
    } catch (error) {
      console.error('Error loading geometries:', error);
      throw error;
    }
  }

  /**
   * Merges geometry data from multiple sources.
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
        const transformedGeometry = this.transformGeometry(feature.geometry);
        geometryMap.set(id, {
          geometry: transformedGeometry,
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
   * Transforms geometry coordinates to WGS84.
   */
  transformGeometry(geometry) {
    if (!geometry || !geometry.type || !geometry.coordinates) return null;

    const cacheKey = JSON.stringify(geometry);
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey);
    }

    try {
      let transformedGeometry;

      switch (geometry.type) {
        case 'Point':
          transformedGeometry = {
            ...geometry,
            coordinates: this.transformCoordinates(geometry.coordinates),
          };
          break;

        case 'Polygon':
          transformedGeometry = {
            ...geometry,
            coordinates: geometry.coordinates.map((ring) =>
              ring.map((coord) => this.transformCoordinates(coord))
            ),
          };
          break;

        case 'MultiPolygon':
          transformedGeometry = {
            ...geometry,
            coordinates: geometry.coordinates.map((polygon) =>
              polygon.map((ring) => ring.map((coord) => this.transformCoordinates(coord)))
            ),
          };
          break;

        default:
          return geometry;
      }

      this.geometryCache.set(cacheKey, transformedGeometry);
      return transformedGeometry;
    } catch (error) {
      console.error('Geometry transformation error:', error);
      throw error;
    }
  }

  /**
   * Transforms coordinates from source CRS to WGS84.
   */
  transformCoordinates([x, y], sourceCRS = UTM_ZONE_38N) {
    try {
      if (this.coordinatesInWGS84([x, y])) {
        return [x, y];
      }
      return proj4(sourceCRS, WGS84, [x, y]);
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      throw error;
    }
  }

  /**
   * Checks if coordinates are already in WGS84.
   */
  coordinatesInWGS84(coords) {
    if (!Array.isArray(coords)) return false;
    const [lng, lat] = coords;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  /**
   * Transforms preprocessed data into required format.
   */
  transformPreprocessedData(data, targetDate) {
    const timeSeriesData = data.time_series_data || [];

    // Create features from market clusters
    const features = this.createFeaturesFromClusters(
      data.market_clusters,
      targetDate
    );

    return {
      geoData: {
        type: 'FeatureCollection',
        features
      },
      marketClusters: data.market_clusters || [],
      detectedShocks: this.filterShocksByDate(data.market_shocks, targetDate),
      timeSeriesData: timeSeriesData,
      flowMaps: this.transformFlowData(data.flow_analysis),
      analysisResults: {
        spatialAutocorrelation: data.spatial_autocorrelation || {},
        metadata: data.metadata || {}
      }
    };
  }

  /**
   * Creates GeoJSON features from market clusters.
   */
  createFeaturesFromClusters(clusters = [], selectedDate) {
    return clusters.reduce((acc, cluster) => {
      const mainMarketId = this.normalizeRegionId(cluster.main_market);
      if (!mainMarketId) return acc;

      // Main Market Feature
      acc.push({
        type: 'Feature',
        properties: {
          id: mainMarketId,
          originalId: cluster.main_market,
          isMainMarket: true,
          clusterSize: cluster.market_count,
          marketRole: 'hub',
          priceData: this.getPriceDataForCluster(cluster, selectedDate),
          cluster_id: cluster.cluster_id
        },
        geometry: null // Geometry will be merged later
      });

      // Peripheral Markets Features
      cluster.connected_markets.forEach(market => {
        const marketId = this.normalizeRegionId(market);
        if (marketId) {
          acc.push({
            type: 'Feature',
            properties: {
              id: marketId,
              originalId: market,
              isMainMarket: false,
              clusterSize: cluster.market_count,
              marketRole: 'peripheral',
              priceData: this.getPriceDataForCluster(cluster, selectedDate),
              cluster_id: cluster.cluster_id
            },
            geometry: null // Geometry will be merged later
          });
        }
      });

      return acc;
    }, []);
  }

  /**
   * Retrieves price data for a given cluster and date.
   */
  getPriceDataForCluster(cluster, selectedDate) {
    if (!cluster.priceData) return null;

    // Assuming priceData is an object with dates as keys
    return cluster.priceData[selectedDate] || null;
  }

  /**
   * Filters shocks based on the selected date.
   */
  filterShocksByDate(shocks = [], targetDate) {
    if (!targetDate || !shocks) return [];

    return shocks
      .filter(shock => {
        const regionId = this.normalizeRegionId(shock.region);
        return shock.date.startsWith(targetDate) && regionId;
      })
      .map(shock => ({
        ...shock,
        region: this.normalizeRegionId(shock.region)
      }));
  }

  /**
   * Transforms flow analysis data.
   */
  transformFlowData(flows = []) {
    if (!flows) return [];

    return flows
      .filter(flow => {
        const sourceId = this.normalizeRegionId(flow.source);
        const targetId = this.normalizeRegionId(flow.target);
        return sourceId && targetId;
      })
      .map(flow => ({
        source: this.normalizeRegionId(flow.source),
        target: this.normalizeRegionId(flow.target),
        flow_weight: typeof flow.total_flow === 'number' && !isNaN(flow.total_flow) ? flow.total_flow : 0,
        avg_flow: typeof flow.avg_flow === 'number' && !isNaN(flow.avg_flow) ? flow.avg_flow : 0,
        flow_count: typeof flow.flow_count === 'number' && !isNaN(flow.flow_count) ? flow.flow_count : 0,
        price_differential: typeof flow.avg_price_differential === 'number' && !isNaN(flow.avg_price_differential) ? flow.avg_price_differential : 0,
        original_source: flow.source,
        original_target: flow.target
      }));
  }

  /**
   * Merges geometries into features.
   */
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
}

export const spatialDataMerger = new SpatialDataMerger();