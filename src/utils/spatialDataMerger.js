import { getDataPath } from './dataUtils';
import { backgroundMonitor } from './backgroundMonitor';
import proj4 from 'proj4';

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';
const YEMEN_TM = 'EPSG:2098';

proj4.defs(UTM_ZONE_38N, '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs');
proj4.defs(YEMEN_TM, '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs');

// Comprehensive region mapping
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

export class SpatialDataMerger {
  constructor() {
    this.cache = new Map();
    this.geometryCache = new Map();
    this.mappingCache = new Map();
  }

  normalizeRegionId(id) {
    if (!id) return null;

    // Check cache first
    const cacheKey = typeof id === 'string' ? id.toLowerCase() : id;
    if (this.mappingCache.has(cacheKey)) {
      return this.mappingCache.get(cacheKey);
    }

    const normalized = String(id)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/['\u2018\u2019]/g, '') // Remove special quotes
      .replace(/[^a-z0-9]/g, '_')      // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')             // Collapse multiple underscores
      .replace(/^_|_$/g, '')           // Remove leading/trailing underscores
      .replace(/governorate$/, '')      // Remove trailing "governorate"
      .trim();

    // Find matching standard region
    let standardId = null;
    for (const [standard, variants] of Object.entries(REGION_MAPPINGS)) {
      if (standard === normalized || variants.some(v => this.normalizeString(v) === normalized)) {
        standardId = standard;
        break;
      }
    }

    // Cache the result
    this.mappingCache.set(cacheKey, standardId || normalized);
    return standardId || normalized;
  }

  normalizeString(str) {
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .trim();
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
    const processedIds = new Set();
    
    // Process boundaries first
    boundaries.features.forEach(feature => {
      const id = this.normalizeRegionId(feature.properties.shapeName);
      
      if (!id || excludedRegions.includes(id)) return;

      const transformedGeometry = this.transformGeometry(feature.geometry);
      if (transformedGeometry) {
        geometryMap.set(id, {
          geometry: transformedGeometry,
          properties: { ...feature.properties }
        });
        processedIds.add(id);
      }
    });

    // Merge enhanced data
    enhanced.features.forEach(feature => {
      const id = this.normalizeRegionId(feature.properties.region_id || feature.properties.shapeName);

      if (!id || excludedRegions.includes(id)) return;

      if (geometryMap.has(id)) {
        const existing = geometryMap.get(id);
        geometryMap.set(id, {
          geometry: existing.geometry,
          properties: {
            ...existing.properties,
            ...feature.properties,
            normalizedId: id
          }
        });
      } else if (!processedIds.has(id)) {
        const transformedGeometry = this.transformGeometry(feature.geometry);
        if (transformedGeometry) {
          geometryMap.set(id, {
            geometry: transformedGeometry,
            properties: {
              ...feature.properties,
              normalizedId: id
            }
          });
        }
      }
    });

    return geometryMap;
  }

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
            coordinates: this.transformCoordinates(geometry.coordinates)
          };
          break;
          
        case 'Polygon':
          transformedGeometry = {
            ...geometry,
            coordinates: geometry.coordinates.map(ring => 
              ring.map(coord => this.transformCoordinates(coord))
            )
          };
          break;
          
        case 'MultiPolygon':
          transformedGeometry = {
            ...geometry,
            coordinates: geometry.coordinates.map(polygon =>
              polygon.map(ring =>
                ring.map(coord => this.transformCoordinates(coord))
              )
            )
          };
          break;
          
        default:
          return geometry;
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
      switch (geometry.type) {
        case 'Point':
          return Array.isArray(geometry.coordinates) &&
                 geometry.coordinates.length === 2 &&
                 !isNaN(geometry.coordinates[0]) &&
                 !isNaN(geometry.coordinates[1]);
                 
        case 'Polygon':
          return Array.isArray(geometry.coordinates) && 
                 geometry.coordinates.length > 0 &&
                 Array.isArray(geometry.coordinates[0]);
                 
        case 'MultiPolygon':
          return Array.isArray(geometry.coordinates) &&
                 geometry.coordinates.length > 0 &&
                 Array.isArray(geometry.coordinates[0]) &&
                 Array.isArray(geometry.coordinates[0][0]);
                 
        default:
          return false;
      }
    } catch (error) {
      console.error('Geometry validation error:', error);
      return false;
    }
  }
}

export const spatialDataMerger = new SpatialDataMerger();
export const loadGeometries = spatialDataMerger.loadGeometries.bind(spatialDataMerger);