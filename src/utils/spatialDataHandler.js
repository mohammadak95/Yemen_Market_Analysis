// src/utils/optimizedSpatialHandler.js
import Papa from 'papaparse';
import _ from 'lodash';

class OptimizedSpatialHandler {
  constructor() {
    this.cache = new Map();
    this.geometryCache = null;
    this.regionMapping = new Map();
    this.excludedRegions = new Set([
      'sa\'dah_governorate',
      // Add other excluded regions here
    ]);
  }

  async initializeGeometry() {
    if (this.geometryCache) return this.geometryCache;

    try {
      const response = await fetch('choropleth_data/geoBoundaries-YEM-ADM1.geojson');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const geojsonData = await response.json();
      
      this.geometryCache = new Map(
        geojsonData.features.map(feature => [
          this.normalizeRegionName(feature.properties?.shapeName),
          {
            geometry: feature.geometry,
            properties: feature.properties
          }
        ])
      );

      return this.geometryCache;
    } catch (error) {
      console.error('Geometry initialization failed:', error);
      throw error;
    }
  }

  async loadPreprocessedData(commodity) {
    const fileName = `preprocessed_yemen_market_data_${commodity.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')}.json`;
    
    try {
      const response = await fetch(fileName);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to load preprocessed data for ${commodity}:`, error);
      throw error;
    }
  }

  async loadFlowData() {
    try {
      const response = await fetch('network_data/time_varying_flows.csv');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const csvText = await response.text();
      
      return Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim().toLowerCase()
      }).data;
    } catch (error) {
      console.error('Failed to load flow data:', error);
      throw error;
    }
  }

  normalizeRegionName(name) {
    if (!name) return null;
    
    const normalized = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .trim();

    if (this.excludedRegions.has(normalized)) {
      return null;
    }

    // Comprehensive region mapping for Yemen
    const regionMapping = {
      "san'a'": "sana'a",
      "san_a__governorate": "sana'a",
      "sana_a": "sana'a",
      "sanaa": "sana'a",
      "sanʿaʾ": "sana'a",
      
      "lahij": "lahj",
      "lahij_governorate": "lahj",
      
      "_adan_governorate": "aden",
      "adan": "aden",
      "adan_governorate": "aden",
      
      "al_hudaydah_governorate": "al hudaydah",
      "hudaydah": "al hudaydah",
      
      "ta_izz_governorate": "taizz",
      "ta_izz": "taizz",
      
      "shabwah_governorate": "shabwah",
      
      "hadhramaut": "hadramaut",
      "hadramawt": "hadramaut",
      "hadhramaut_governorate": "hadramaut",
      
      "abyan_governorate": "abyan",
      
      "al_jawf_governorate": "al jawf",
      
      "ibb_governorate": "ibb",
      
      "al_bayda__governorate": "al bayda",
      "al_baida": "al bayda",
      
      "ad_dali__governorate": "al dhale'e",
      "al_dhale_e": "al dhale'e",
      
      "al_mahwit_governorate": "al mahwit",
      
      "hajjah_governorate": "hajjah",
      
      "dhamar_governorate": "dhamar",
      
      "_amran_governorate": "amran",
      
      "al_mahrah_governorate": "al maharah",
      
      "ma'rib_governorate": "marib",
      
      "raymah_governorate": "raymah",
      
      "amanat_al_asimah": "amanat al asimah",
      "amanat_al_asimah_governorate": "amanat al asimah"
    };

    // Check if the normalized name has a direct mapping
    if (regionMapping[normalized]) {
      return regionMapping[normalized];
    }

    // Check if any mapping value matches the normalized name
    const standardizedName = Object.entries(regionMapping).find(
      ([_, value]) => value.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalized
    );

    if (standardizedName) {
      return standardizedName[1];
    }

    // Log warning for unmapped regions in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Unmapped region: ${name} (normalized: ${normalized})`);
    }

    return normalized;
  }

  async getSpatialData(commodity, date) {
    const cacheKey = `${commodity}_${date}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    try {
      await this.initializeGeometry();
      const [preprocessed, flows] = await Promise.all([
        this.loadPreprocessedData(commodity),
        this.loadFlowData()
      ]);

      const filteredFlows = this.filterByDate(flows, date);
      const processedData = this.processMarketClusters(
        preprocessed.market_clusters,
        preprocessed.time_series_data,
        date
      );

      const result = {
        marketClusters: processedData.clusters,
        timeSeriesData: processedData.timeData,
        flowMaps: filteredFlows,
        geoJSON: this.createGeoJSON(processedData.features),
        metadata: preprocessed.metadata
      };

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Failed to get spatial data:', error);
      throw error;
    }
  }

  filterByDate(data, targetDate) {
    if (!targetDate || !Array.isArray(data)) return data;
    return data.filter(item => {
      const itemDate = item.date || item.month;
      return itemDate?.startsWith(targetDate);
    });
  }

  processMarketClusters(clusters, timeData, date) {
    const features = [];
    const processedClusters = [];
    const relevantTimeData = this.filterByDate(timeData, date);

    for (const cluster of clusters) {
      const clusterFeatures = this.processClusterFeatures(
        cluster,
        relevantTimeData
      );
      features.push(...clusterFeatures);
      
      processedClusters.push({
        ...cluster,
        processed_markets: clusterFeatures.map(f => f.properties.region_id)
      });
    }

    return {
      clusters: processedClusters,
      features,
      timeData: relevantTimeData
    };
  }

  processClusterFeatures(cluster, timeData) {
    const features = [];
    const addFeature = (marketId, isMain) => {
      const geometry = this.geometryCache.get(this.normalizeRegionName(marketId));
      if (!geometry) return;

      const marketData = timeData.find(d => 
        this.normalizeRegionName(d.region || d.admin1) === 
        this.normalizeRegionName(marketId)
      ) || {};

      features.push({
        type: 'Feature',
        properties: {
          region_id: marketId,
          isMainMarket: isMain,
          cluster_id: cluster.cluster_id,
          market_count: cluster.market_count,
          ...marketData
        },
        geometry: geometry.geometry
      });
    };

    addFeature(cluster.main_market, true);
    cluster.connected_markets.forEach(market => addFeature(market, false));

    return features;
  }

  createGeoJSON(features) {
    return {
      type: 'FeatureCollection',
      features: features.filter(f => f && f.geometry)
    };
  }

  clearCache() {
    this.cache.clear();
    this.geometryCache = null;
  }
}

export const spatialHandler = new OptimizedSpatialHandler();