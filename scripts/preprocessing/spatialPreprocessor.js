// scripts/preprocessing/spatialPreprocessor.js

const fs = require('fs-extra');
const path = require('path');
const proj4 = require('proj4');
const turf = require('@turf/turf');
const { DateTime } = require('luxon');
const winston = require('winston');

// Import helper functions
const marketHelpers = require('./marketAnalysisHelpers');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'spatial-preprocess.log' })
  ]
});

class SpatialPreprocessor {
  constructor(config) {
    this.config = {
      projections: {
        WGS84: 'EPSG:4326',
        UTM_ZONE_38N: '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs',
        YEMEN_TM: '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs'
      },
      thresholds: {
        VOLATILITY: 0.05,
        PRICE_CHANGE: 0.15,
        MIN_DATA_POINTS: 3,
        MAX_OUTLIER_STDDEV: 3,
        MIN_CLUSTER_SIZE: 2,
        NEIGHBOR_THRESHOLD_KM: 200
      },
      ...config
    };

    // Initialize projections
    Object.entries(this.config.projections).forEach(([name, proj]) => {
      proj4.defs(name, proj);
    });

    this.cache = new Map();
    this.processedData = {
      clusters: [],
      timeSeriesData: {},
      spatialWeights: {},
      analyzedData: {},
      shocks: [],
      regionalPerformance: {}
    };
  }

  async processAll(inputPaths) {
    try {
      logger.info('Starting spatial preprocessing...');

      // Load all raw data
      const rawData = await this.loadRawData(inputPaths);
      
      // Process in parallel where possible
      await Promise.all([
        this.processSpatialWeights(rawData),
        this.processTimeSeries(rawData),
        this.processClusters(rawData)
      ]);

      // Sequential processing for dependent operations
      await this.processShocks(rawData);
      await this.analyzeRegionalPerformance();
      await this.generatePolicyImplications();

      // Save all processed data
      await this.saveProcessedData(inputPaths.outputDir);

      logger.info('Spatial preprocessing completed successfully');
      return this.processedData;

    } catch (error) {
      logger.error('Error during spatial preprocessing:', error);
      throw error;
    }
  }

  async loadRawData({ geoDataPath, flowsPath, weightsPath, timeSeriesPath }) {
    logger.info('Loading raw data...');

    const [geoData, flowsData, weightsData, timeSeriesData] = await Promise.all([
      fs.readJson(geoDataPath),
      fs.readJson(flowsPath),
      fs.readJson(weightsPath),
      fs.readJson(timeSeriesPath)
    ]);

    return {
      geoData: this.normalizeGeoData(geoData),
      flowsData: this.normalizeFlowsData(flowsData),
      weightsData: this.normalizeWeightsData(weightsData),
      timeSeriesData: this.normalizeTimeSeriesData(timeSeriesData)
    };
  }

  async processSpatialWeights(rawData) {
    logger.info('Processing spatial weights...');
    
    const { geoData } = rawData;
    const weights = {};

    // Calculate distances and weights between regions
    geoData.features.forEach((feature1) => {
      const region1 = feature1.properties.region_id;
      if (!weights[region1]) {
        weights[region1] = { neighbors: [], weights: [] };
      }

      geoData.features.forEach((feature2) => {
        const region2 = feature2.properties.region_id;
        if (region1 === region2) return;

        const distance = turf.distance(
          turf.centroid(feature1),
          turf.centroid(feature2),
          { units: 'kilometers' }
        );

        if (distance <= this.config.thresholds.NEIGHBOR_THRESHOLD_KM) {
          weights[region1].neighbors.push(region2);
          weights[region1].weights.push(1 / distance);
        }
      });
    });

    // Normalize weights
    Object.values(weights).forEach(region => {
      const sum = region.weights.reduce((a, b) => a + b, 0);
      region.weights = region.weights.map(w => w / sum);
    });

    this.processedData.spatialWeights = weights;
  }

  async processTimeSeries(rawData) {
    logger.info('Processing time series data...');
    
    const { timeSeriesData } = rawData;
    const processed = {};

    // Group by region and commodity
    timeSeriesData.features.forEach(feature => {
      const { region_id, commodity, date } = feature.properties;
      
      if (!processed[region_id]) {
        processed[region_id] = {};
      }
      if (!processed[region_id][commodity]) {
        processed[region_id][commodity] = [];
      }

      processed[region_id][commodity].push({
        date,
        price: feature.properties.price,
        usdPrice: feature.properties.usdprice,
        conflictIntensity: feature.properties.conflict_intensity
      });
    });

    // Calculate statistics for each region-commodity combination
    Object.entries(processed).forEach(([region, commodities]) => {
      Object.entries(commodities).forEach(([commodity, data]) => {
        const stats = this.calculateTimeSeriesStatistics(data);
        if (!this.processedData.timeSeriesData[region]) {
          this.processedData.timeSeriesData[region] = {};
        }
        this.processedData.timeSeriesData[region][commodity] = stats;
      });
    });
  }

  async processClusters(rawData) {
    logger.info('Processing market clusters...');
    
    const { flowsData, spatialWeights } = rawData;
    const clusters = [];
    const visited = new Set();

    const dfs = (region, cluster) => {
      if (visited.has(region)) return;
      
      visited.add(region);
      cluster.markets.add(region);
      
      spatialWeights[region]?.neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, cluster);
        }
      });
    };

    // Identify clusters
    Object.keys(spatialWeights).forEach(region => {
      if (visited.has(region)) return;

      const cluster = {
        markets: new Set(),
        flows: [],
        metrics: {}
      };

      dfs(region, cluster);

      if (cluster.markets.size >= this.config.thresholds.MIN_CLUSTER_SIZE) {
        // Calculate cluster metrics
        cluster.flows = flowsData.filter(flow => 
          cluster.markets.has(flow.source) || cluster.markets.has(flow.target)
        );

        cluster.metrics = this.calculateClusterMetrics(cluster);
        clusters.push(cluster);
      }
    });

    this.processedData.clusters = clusters;
  }

  calculateClusterMetrics(cluster) {
    const { markets, flows } = cluster;
    
    // Calculate flow statistics
    const totalFlow = flows.reduce((sum, flow) => sum + flow.flow_weight, 0);
    const avgFlow = totalFlow / markets.size;
    
    // Identify main market
    const marketScores = new Map();
    flows.forEach(flow => {
      if (markets.has(flow.source)) {
        marketScores.set(flow.source, 
          (marketScores.get(flow.source) || 0) + flow.flow_weight
        );
      }
    });

    const mainMarket = [...marketScores.entries()]
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return {
      mainMarket,
      marketCount: markets.size,
      totalFlow,
      avgFlow,
      density: flows.length / (markets.size * (markets.size - 1))
    };
  }

  async saveProcessedData(outputDir) {
    logger.info('Saving processed data...');

    const files = {
      'spatial-weights.json': this.processedData.spatialWeights,
      'market-clusters.json': this.processedData.clusters,
      'time-series-analysis.json': this.processedData.timeSeriesData,
      'market-shocks.json': this.processedData.shocks,
      'regional-performance.json': this.processedData.regionalPerformance
    };

    await Promise.all(
      Object.entries(files).map(([filename, data]) =>
        fs.writeJson(
          path.join(outputDir, filename),
          data,
          { spaces: 2 }
        )
      )
    );

    logger.info('All processed data saved successfully');
  }

  // Helper methods for data normalization
  normalizeGeoData(geoData) {
    return {
      ...geoData,
      features: geoData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          region_id: this.normalizeRegionName(feature.properties.region_id),
          date: new Date(feature.properties.date).toISOString()
        }
      }))
    };
  }

  normalizeFlowsData(flowsData) {
    return flowsData.map(flow => ({
      ...flow,
      source: this.normalizeRegionName(flow.source),
      target: this.normalizeRegionName(flow.target),
      flow_weight: parseFloat(flow.flow_weight) || 0,
      date: new Date(flow.date).toISOString()
    }));
  }

  normalizeWeightsData(weightsData) {
    const normalized = {};
    Object.entries(weightsData).forEach(([region, data]) => {
      normalized[this.normalizeRegionName(region)] = {
        neighbors: data.neighbors.map(n => this.normalizeRegionName(n)),
        weight: parseFloat(data.weight) || 0
      };
    });
    return normalized;
  }

  normalizeRegionName(name) {
    if (!name) return '';

    const specialCases = {
      "san'a'": 'sanaa',
      'san_a__governorate': 'sanaa',
      "sana'a": 'sanaa',
      'sanʿaʾ': 'sanaa',
      'amanat_al_asimah': 'amanat al asimah',
      'lahij': 'lahj',
      '_adan': 'aden',
      'ta_izz': 'taizz'
    };

    const normalized = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`]/g, '')
      .replace(/[\s_-]+/g, '_')
      .trim();

    return specialCases[normalized] || normalized;
  }
}

module.exports = SpatialPreprocessor;