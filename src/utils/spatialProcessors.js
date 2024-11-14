// src/utils/spatialProcessors.js

import proj4 from 'proj4';
import JSON5 from 'json5';
import { backgroundMonitor } from './backgroundMonitor';

// Define Yemen local projection
const YEMEN_TM = "+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs";
const WGS84 = "EPSG:4326";

class EnhancedSpatialProcessor {
  constructor() {
    this.cache = new Map();
    this.featureMap = new Map();
    this.timeSeriesIndex = new Map();

    // Initialize projection
    proj4.defs("YEMEN_TM", YEMEN_TM);

    // Comprehensive region mapping
    this.regionMapping = {
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
  }

  /**
   * Normalizes the region ID based on predefined mappings.
   * @param {string} id - The original region ID.
   * @returns {string|null} - The normalized region ID or null if invalid.
   */
  normalizeRegionId(id) {
    if (!id) return null;

    const normalized = id.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/['\u2018\u2019]/g, '') // Remove special quotes
      .replace(/[^a-z0-9]/g, '_')      // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')             // Collapse multiple underscores
      .replace(/^_|_$/g, '');          // Remove leading/trailing underscores

    return this.regionMapping[normalized] || normalized;
  }

  /**
   * Transforms coordinates from Yemen TM to WGS84.
   * @param {Array} coords - The coordinates to transform.
   * @returns {Array|null} - The transformed coordinates or null if invalid.
   */
  transformCoordinates(coords) {
    try {
      if (!coords || !Array.isArray(coords)) return null;

      if (typeof coords[0] === 'number') {
        // Single Point
        return proj4("YEMEN_TM", WGS84, coords);
      } else if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
        // Array of Points
        return coords.map(point => proj4("YEMEN_TM", WGS84, point));
      } else {
        // Array of Rings or Polygons
        return coords.map(ring => ring.map(point => proj4("YEMEN_TM", WGS84, point)));
      }
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      throw error; // Rethrow to handle it at a higher level
    }
  }

  /**
   * Aggregates time series data on a monthly basis.
   * @param {Array} timeSeriesData - The raw time series data.
   * @param {string} interval - The aggregation interval (default: 'month').
   * @returns {Array} - The aggregated time series data.
   */
  aggregateTimeSeriesData(timeSeriesData, interval = 'month') {
    if (!Array.isArray(timeSeriesData)) return [];

    const aggregated = timeSeriesData.reduce((acc, entry) => {
      const date = new Date(entry.month);
      if (isNaN(date.getTime())) return acc; // Skip invalid dates

      const key = date.toISOString().slice(0, 7); // "YYYY-MM"

      if (!acc[key]) {
        acc[key] = {
          date: key,
          avgUsdPrice: 0,
          volatility: 0,
          sampleSize: 0,
          count: 0,
          minPrice: Infinity,
          maxPrice: -Infinity
        };
      }

      // Safely parse numerical values, replace NaN with 0
      const avgUsdPrice = typeof entry.avgUsdPrice === 'number' && !isNaN(entry.avgUsdPrice) ? entry.avgUsdPrice : 0;
      const volatility = typeof entry.volatility === 'number' && !isNaN(entry.volatility) ? entry.volatility : 0;
      const sampleSize = typeof entry.sampleSize === 'number' && !isNaN(entry.sampleSize) ? entry.sampleSize : 0;

      acc[key].avgUsdPrice += avgUsdPrice;
      acc[key].volatility += volatility;
      acc[key].sampleSize += sampleSize;
      acc[key].count++;
      acc[key].minPrice = Math.min(acc[key].minPrice, avgUsdPrice);
      acc[key].maxPrice = Math.max(acc[key].maxPrice, avgUsdPrice);

      return acc;
    }, {});

    return Object.values(aggregated)
      .map(entry => ({
        month: entry.date,
        avgUsdPrice: entry.count > 0 ? entry.avgUsdPrice / entry.count : 0,
        volatility: entry.count > 0 ? entry.volatility / entry.count : 0,
        sampleSize: Math.round(entry.sampleSize / entry.count) || 0,
        priceRange: {
          min: entry.minPrice === Infinity ? 0 : entry.minPrice,
          max: entry.maxPrice === -Infinity ? 0 : entry.maxPrice
        }
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Processes geometries from the provided geometry data.
   * @param {Object} geometryData - The raw geometry data.
   * @returns {Map} - A map of normalized region IDs to their geometry and properties.
   */
  processGeometries(geometryData) {
    if (!geometryData) return new Map();

    const geometryMap = new Map();

    try {
      if (geometryData.type === 'FeatureCollection' && Array.isArray(geometryData.features)) {
        geometryData.features.forEach(feature => {
          if (feature.properties && feature.geometry) {
            const regionId = this.normalizeRegionId(
              feature.properties.shapeName ||
              feature.properties.shapeID ||
              feature.properties.region_id
            );

            if (regionId) {
              geometryMap.set(regionId, {
                geometry: feature.geometry,
                properties: feature.properties
              });
            }
          }
        });
      } else if (typeof geometryData === 'object') {
        Object.entries(geometryData).forEach(([key, value]) => {
          const regionId = this.normalizeRegionId(key);
          if (regionId && value.geometry) {
            geometryMap.set(regionId, value);
          }
        });
      }

    } catch (error) {
      console.error('Error processing geometries:', error);
    }

    return geometryMap;
  }

  /**
   * Merges transformed data with geometries.
   * @param {Object} transformedData - The transformed data.
   * @param {Map} geometryMap - The map of geometries.
   * @param {string} selectedDate - The selected date for data filtering.
   * @returns {Object} - The merged data with spatial information.
   */
  mergeGeometries(transformedData, geometryMap, selectedDate) {
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
          excludedRegions: ['socotra', 'unknown', 'undefined', 'other'],
          projection: WGS84
        }
      }
    };
  }

  /**
   * Transforms and merges preprocessed data with spatial geometries.
   * @param {Object} preprocessedData - The raw preprocessed data.
   * @param {string} selectedDate - The selected date for data filtering.
   * @returns {Object} - The fully merged and processed spatial data.
   */
  async processSpatialData(preprocessedData, selectedDate) {
    const metric = backgroundMonitor.startMetric('process-spatial-data');

    try {
      // Process geometries
      const geometryMap = this.processGeometries(preprocessedData.geometries);

      // Aggregate time series data
      const timeSeriesData = this.aggregateTimeSeriesData(preprocessedData.time_series_data);

      // Create features from market clusters
      const features = this.createFeaturesFromClusters(preprocessedData.market_clusters, selectedDate);

      // Merge with geometries
      const mergedData = this.mergeGeometries({
        geoData: {
          type: 'FeatureCollection',
          features: features
        },
        marketClusters: preprocessedData.market_clusters || [],
        detectedShocks: this.filterShocksByDate(preprocessedData.market_shocks, selectedDate),
        timeSeriesData: timeSeriesData,
        flowMaps: this.transformFlowData(preprocessedData.flow_analysis),
        analysisResults: {
          spatialAutocorrelation: preprocessedData.spatial_autocorrelation || {},
          metadata: preprocessedData.metadata || {}
        }
      }, geometryMap, selectedDate);

      metric.finish({ status: 'success' });

      return mergedData;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Creates GeoJSON features from market clusters.
   * @param {Array} clusters - The market clusters data.
   * @param {string} selectedDate - The selected date for data filtering.
   * @returns {Array} - An array of GeoJSON features.
   */
  createFeaturesFromClusters(clusters, selectedDate) {
    if (!clusters) return [];

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
   * @param {Object} cluster - The market cluster.
   * @param {string} selectedDate - The selected date for data filtering.
   * @returns {Object|null} - The price data or null if not found.
   */
  getPriceDataForCluster(cluster, selectedDate) {
    if (!cluster.priceData) return null;

    // Assuming priceData is an object with dates as keys
    return cluster.priceData[selectedDate] || null;
  }

  /**
   * Filters shocks based on the selected date.
   * @param {Array} shocks - The market shocks data.
   * @param {string} selectedDate - The selected date for data filtering.
   * @returns {Array} - An array of filtered shocks.
   */
  filterShocksByDate(shocks = [], selectedDate) {
    if (!selectedDate || !shocks) return [];

    return shocks
      .filter(shock => {
        const regionId = this.normalizeRegionId(shock.region);
        return shock.date.startsWith(selectedDate) && regionId;
      })
      .map(shock => ({
        ...shock,
        region: this.normalizeRegionId(shock.region)
      }));
  }

  /**
   * Transforms flow data by normalizing region IDs and excluding certain regions.
   * @param {Array} flows - The flow analysis data.
   * @returns {Array} - An array of transformed flow data.
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
}

export const enhancedSpatialProcessor = new EnhancedSpatialProcessor();