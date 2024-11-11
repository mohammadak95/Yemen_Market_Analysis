// scripts/preprocessing/enhancedSpatialPreprocessor.js

const fs = require('fs-extra');
const path = require('path');
const proj4 = require('proj4');
const turf = require('@turf/turf');
const { DateTime } = require('luxon');
const winston = require('winston');
const chroma = require('chroma-js');
const csv = require('csv-parse/sync');

/**
 * Class representing an enhanced spatial preprocessor.
 */
class EnhancedSpatialPreprocessor {
  /**
   * Create an EnhancedSpatialPreprocessor.
   * @param {Object} config - Configuration object.
   */
  constructor(config) {
    this.config = {
      ...config,
      thresholds: {
        VOLATILITY: 0.05,
        PRICE_CHANGE: 0.15,
        MIN_DATA_POINTS: 3,
        MAX_OUTLIER_STDDEV: 3,
        MIN_CLUSTER_SIZE: 2,
        NEIGHBOR_THRESHOLD_KM: 200,
        INTEGRATION_THRESHOLD: 0.7,
        SHOCK_SIGNIFICANCE: 0.05
      },
      colorScales: {
        PRICES: chroma.scale(['#f7fbff', '#08519c']).mode('lab'),
        CLUSTERS: chroma.scale(['#fee6ce', '#f03b20']).mode('lab'),
        SHOCKS: chroma.scale(['#ffffcc', '#bd0026']).mode('lab')
      }
    };

    this.logger = winston.createLogger({
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

    this.processedData = {
      base: {},
      derived: {},
      analysis: {},
      visualization: {}
    };

    this.fileQueue = new FileOperationQueue(5); // Example concurrency
  }

  /**
   * Processes all stages of spatial data preprocessing.
   * @param {Object} inputPaths - Paths to input data files and output directory.
   * @returns {Object} The processed data object.
   * @throws Will throw an error if any preprocessing stage fails.
   */
  async processAll(inputPaths) {
    try {
      this.logger.info('Starting enhanced spatial preprocessing...');
      this.logger.debug('Input paths:', inputPaths);

      // Stage 1: Load and normalize base data
      await this.processBaseData(inputPaths);
      this.logger.debug('Base data processed:', 
        this.debugObject(this.processedData.base));

      // Stage 2: Generate derived datasets
      await this.processDerivedData();
      this.logger.debug('Derived data processed:', 
        this.debugObject(this.processedData.derived));

      // Stage 3: Perform complex analysis
      await this.processAnalysis();
      this.logger.debug('Analysis completed:', 
        this.debugObject(this.processedData.analysis));

      // Stage 4: Prepare visualization data
      await this.processVisualizationData();
      this.logger.debug('Visualization data prepared:', 
        this.debugObject(this.processedData.visualization));

      await this.saveProcessedData(inputPaths.outputDir);
      return this.processedData;
    } catch (error) {
      this.logger.error('Preprocessing failed:', {
        error: error.message,
        stack: error.stack,
        lastState: this.debugObject(this.processedData)
      });
      throw error;
    }
  }

  /**
   * Processes the base data by loading and normalizing raw datasets.
   * @param {Object} inputPaths - Paths to input data files.
   */
  async processBaseData(inputPaths) {
    this.logger.info('Processing base data...');

    try {
      const [geoData, flowData, timeSeriesData, weightsData] = await Promise.all([
        this.fileQueue.add(() => this.loadGeoData(inputPaths.geoDataPath)),
        this.fileQueue.add(() => this.loadFlowData(inputPaths.flowsPath)),
        this.fileQueue.add(() => this.loadTimeSeriesData(inputPaths.timeSeriesPath)),
        this.fileQueue.add(() => this.loadWeightsData(inputPaths.weightsPath))
      ]);

      this.processedData.base = {
        geo: geoData,
        flows: flowData,
        timeSeries: timeSeriesData,
        weights: weightsData
      };
    } catch (error) {
      this.logger.error('Error processing base data:', error);
      throw error;
    }
  }

  /**
   * Generates derived datasets from the base data.
   */
  async processDerivedData() {
    this.logger.info('Processing derived data...');

    try {
      const [
        spatialWeights,
        marketClusters,
        timeSeriesStats,
        regionalConnections
      ] = await Promise.all([
        this.calculateSpatialWeights(),
        this.identifyMarketClusters(),
        this.calculateTimeSeriesStatistics(),
        this.analyzeRegionalConnections()
      ]);

      this.processedData.derived = {
        spatialWeights,
        marketClusters,
        timeSeriesStats,
        regionalConnections
      };
    } catch (error) {
      this.logger.error('Error processing derived data:', error);
      throw error;
    }
  }

  /**
   * Performs complex analysis on the derived data.
   */
  async processAnalysis() {
    this.logger.info('Processing analysis data...');

    try {
      const [
        marketIntegration,
        shockAnalysis,
        volatilityAnalysis,
        performanceMetrics
      ] = await Promise.all([
        this.analyzeMarketIntegration(),
        this.analyzeMarketShocks(),
        this.analyzeVolatility(),
        this.calculatePerformanceMetrics()
      ]);

      // Calculate regional resilience scores
      const resilienceScores = await this.calculateResilienceScores({
        marketIntegration,
        shockAnalysis,
        volatilityAnalysis,
        performanceMetrics
      });

      // Generate policy implications
      const policyImplications = this.generatePolicyImplications({
        resilienceScores,
        marketIntegration,
        shockAnalysis
      });

      this.processedData.analysis = {
        marketIntegration,
        shockAnalysis,
        volatilityAnalysis,
        performanceMetrics,
        resilienceScores,
        policyImplications
      };
    } catch (error) {
      this.logger.error('Error processing analysis data:', error);
      throw error;
    }
  }

  /**
   * Prepares visualization-ready datasets.
   */
  async processVisualizationData() {
    this.logger.info('Processing visualization data...');

    try {
      const { timeSeries } = this.processedData.base;

      // Generate visualization-ready datasets
      const [
        choroplethData,
        flowMapsData,
        timeSeriesCharts,
        clusterVisuals
      ] = await Promise.all([
        this.prepareChoroplethData(),
        this.prepareFlowMapsData(),
        this.prepareTimeSeriesCharts(timeSeries),
        this.prepareClusterVisuals()
      ]);

      // Pre-calculate color scales and breakpoints
      const colorScales = this.calculateColorScales({
        choroplethData,
        flowMapsData,
        clusterVisuals
      });

      this.processedData.visualization = {
        choroplethData,
        flowMapsData,
        timeSeriesCharts,
        clusterVisuals,
        colorScales,
        legends: this.generateLegends(colorScales)
      };
    } catch (error) {
      this.logger.error('Error processing visualization data:', error);
      throw error;
    }
  }

  /**
   * Saves the processed data to the specified output directory.
   * @param {string} outputDir - The directory where processed data will be saved.
   */
  async saveProcessedData(outputDir) {
    try {
      await fs.ensureDir(outputDir);
      const outputPath = path.join(outputDir, 'processedData.json');
      await fs.writeJson(outputPath, this.processedData, { spaces: 2 });
      this.logger.info(`Processed data saved to ${outputPath}`);
    } catch (error) {
      this.logger.error('Failed to save processed data:', error);
      throw error;
    }
  }

  /**
   * Generates policy implications based on analysis results.
   * @param {Object} params - The analysis metrics.
   * @returns {Object} Policy implications per region.
   */
  generatePolicyImplications({ resilienceScores, marketIntegration, shockAnalysis }) {
    const implications = {};

    Object.keys(resilienceScores).forEach(region => {
      const score = resilienceScores[region].total;
      if (score < 0.5) {
        implications[region] = 'High resilience needed. Consider diversifying markets.';
      } else if (score < 0.8) {
        implications[region] = 'Moderate resilience. Monitor market stability.';
      } else {
        implications[region] = 'Good resilience. Maintain current strategies.';
      }
    });

    return implications;
  }

  /**
   * Analyzes market integration metrics.
   * @returns {Object} Market integration analysis.
   */
  async analyzeMarketIntegration() {
    const { flows, weights, timeSeries } = this.processedData.base;
    const integration = {};

    try {
      // Calculate spatial correlation indices
      for (const commodity of Object.keys(timeSeries)) {
        integration[commodity] = {
          moranI: this.calculateMoransI(timeSeries[commodity], weights),
          priceTransmission: this.calculatePriceTransmission(flows, commodity),
          marketCoverage: this.calculateMarketCoverage(flows, commodity),
          integrationEfficiency: this.calculateIntegrationEfficiency(
            timeSeries[commodity],
            weights
          )
        };
      }

      return integration;
    } catch (error) {
      this.logger.error('Error analyzing market integration:', error);
      throw error;
    }
  }

  /**
   * Analyzes market shocks.
   * @returns {Object} Market shock analysis.
   */
  async analyzeMarketShocks() {
    const { timeSeries } = this.processedData.base;
    const shocks = {};

    try {
      for (const [commodity, data] of Object.entries(timeSeries)) {
        shocks[commodity] = {
          priceShocks: this.detectPriceShocks(data),
          volatilityShocks: this.detectVolatilityShocks(data),
          structuralBreaks: this.detectStructuralBreaks(data),
          shockPropagation: this.analyzeShockPropagation(
            data,
            this.processedData.derived.marketClusters
          )
        };
      }

      return shocks;
    } catch (error) {
      this.logger.error('Error analyzing market shocks:', error);
      throw error;
    }
  }

  /**
   * Calculates resilience scores based on various metrics.
   * @param {Object} metrics - The analysis metrics.
   * @returns {Object} Resilience scores per region.
   */
  async calculateResilienceScores(metrics) {
    const scores = {};
    const weights = {
      integration: 0.3,
      stability: 0.3,
      connectivity: 0.2,
      recovery: 0.2
    };

    try {
      for (const region of Object.keys(this.processedData.base.geo.features)) {
        scores[region] = {
          total: this.calculateWeightedScore(region, metrics, weights),
          components: {
            integration: this.calculateIntegrationScore(region, metrics),
            stability: this.calculateStabilityScore(region, metrics),
            connectivity: this.calculateConnectivityScore(region, metrics),
            recovery: this.calculateRecoveryScore(region, metrics)
          }
        };
      }

      return scores;
    } catch (error) {
      this.logger.error('Error calculating resilience scores:', error);
      throw error;
    }
  }

  /**
   * Prepares choropleth data for visualization.
   * @returns {Object} Choropleth data per commodity.
   */
  async prepareChoroplethData() {
    const choroplethData = {};
    const { geo, timeSeries } = this.processedData.base;
    const { marketIntegration } = this.processedData.analysis;

    try {
      for (const commodity of Object.keys(timeSeries)) {
        choroplethData[commodity] = {
          prices: this.preparePriceChoropleth(geo, timeSeries[commodity]),
          integration: this.prepareIntegrationChoropleth(
            geo,
            marketIntegration[commodity]
          ),
          resilience: this.prepareResilienceChoropleth(
            geo,
            this.processedData.analysis.resilienceScores
          )
        };
      }

      return choroplethData;
    } catch (error) {
      this.logger.error('Error preparing choropleth data:', error);
      throw error;
    }
  }

  /**
   * Prepares flow maps data for visualization.
   * @returns {Object} Flow maps data.
   */
  async prepareFlowMapsData() {
    const { flows } = this.processedData.base;
    const { marketClusters } = this.processedData.derived;

    try {
      return {
        flows: this.processFlowsForVisualization(flows),
        clusters: this.processClusterFlows(flows, marketClusters),
        directions: this.calculateFlowDirections(flows),
        weights: this.calculateFlowWeights(flows)
      };
    } catch (error) {
      this.logger.error('Error preparing flow maps data:', error);
      throw error;
    }
  }

  /**
   * Prepares time series charts for visualization.
   * @param {Object} timeSeriesData - Time series data per region.
   * @returns {Object} Time series charts data.
   */
  async prepareTimeSeriesCharts(timeSeriesData) {
    const charts = {};

    try {
      for (const [region, commodities] of Object.entries(timeSeriesData)) {
        charts[region] = {
          prices: this.prepareLineSeries(commodities, 'price'),
          volatility: this.prepareLineSeries(commodities, 'volatility'),
          shocks: this.prepareShockOverlay(commodities)
        };
      }

      return charts;
    } catch (error) {
      this.logger.error('Error preparing time series charts:', error);
      throw error;
    }
  }

  /**
   * Prepares cluster visuals for visualization.
   * @returns {Array} Cluster visuals data.
   */
  prepareClusterVisuals() {
    const clusters = this.processedData.derived.marketClusters;
    return clusters.map((cluster, index) => ({
      id: `cluster-${index}`,
      mainMarket: cluster.mainMarket,
      color: this.config.colorScales.CLUSTERS(index / Math.max(clusters.length - 1, 1)),
      markets: Array.from(cluster.markets),
      flows: this.processClusterFlows(cluster),
      metrics: cluster.metrics,
      visualProperties: {
        radius: Math.sqrt(cluster.markets.size) * 10,
        opacity: 0.7,
        zIndex: cluster.metrics.totalFlow
      }
    }));
  }

  /**
   * Generates legends based on color scales.
   * @param {Object} colorScales - Color scales used in visualization.
   * @returns {Object} Legends for visualization.
   */
  generateLegends(colorScales) {
    const legends = {};

    try {
      for (const [dataType, scale] of Object.entries(colorScales)) {
        legends[dataType] = {
          type: this.determineLegendType(dataType),
          items: this.generateLegendItems(scale, dataType),
          title: this.getLegendTitle(dataType),
          format: this.getLegendFormat(dataType)
        };
      }

      return legends;
    } catch (error) {
      this.logger.error('Error generating legends:', error);
      throw error;
    }
  }

  /**
   * Analyzes market integration efficiency.
   * @param {Object} timeSeriesData - Time series data per commodity.
   * @param {Object} weights - Spatial weights data.
   * @returns {Object} Integration efficiency metrics.
   */
  calculateIntegrationEfficiency(timeSeriesData, weights) {
    const correlations = [];
    const regions = Object.keys(timeSeriesData);

    try {
      regions.forEach((region1, i) => {
        regions.slice(i + 1).forEach(region2 => {
          const series1 = timeSeriesData[region1];
          const series2 = timeSeriesData[region2];

          if (series1 && series2) {
            const correlation = this.calculatePriceCorrelation(
              series1.map(d => d.price),
              series2.map(d => d.price)
            );
            correlations.push(correlation);
          }
        });
      });

      return {
        meanCorrelation: this.calculateMean(correlations),
        efficiency: correlations.length > 0 ? 
          correlations.filter(c => c > this.config.thresholds.INTEGRATION_THRESHOLD).length / correlations.length : 
          0
      };
    } catch (error) {
      this.logger.error('Error calculating integration efficiency:', error);
      throw error;
    }
  }

  /**
   * Calculates market coverage for a commodity.
   * @param {Array} flows - Array of flow objects.
   * @param {string} commodity - Commodity name.
   * @returns {number} Number of unique markets.
   */
  calculateMarketCoverage(flows, commodity) {
    const uniqueMarkets = new Set();
    flows.forEach(flow => {
      if (flow.commodity === commodity) {
        uniqueMarkets.add(flow.source);
        uniqueMarkets.add(flow.target);
      }
    });
    return uniqueMarkets.size;
  }

  /**
   * Detects structural breaks in time series data.
   * @param {Array} data - Array of data points.
   * @returns {Array} Array of detected breaks.
   */
  detectStructuralBreaks(data) {
    const breaks = [];
    const windowSize = 6; // 6-month window
    const prices = data.map(d => d.price);

    try {
      for (let i = windowSize; i < prices.length - windowSize; i++) {
        const window1 = prices.slice(i - windowSize, i);
        const window2 = prices.slice(i, i + windowSize);

        const mean1 = this.calculateMean(window1);
        const mean2 = this.calculateMean(window2);
        const std1 = this.calculateStandardDeviation(window1);
        const std2 = this.calculateStandardDeviation(window2);

        // Check for significant changes in mean or variance
        if (Math.abs(mean1 - mean2) > 2 * Math.max(std1, std2) ||
            Math.abs(std1 - std2) > Math.max(std1, std2)) {
          breaks.push({
            date: data[i].date,
            type: Math.abs(mean1 - mean2) > 2 * Math.max(std1, std2) ? 'level' : 'volatility',
            magnitude: Math.abs(mean1 - mean2) / mean1
          });
        }
      }

      return breaks;
    } catch (error) {
      this.logger.error('Error detecting structural breaks:', error);
      return breaks;
    }
  }

  /**
   * Analyzes shock propagation within market clusters.
   * @param {Array} data - Time series data per market.
   * @param {Array} clusters - Array of market clusters.
   * @returns {Object} Shock propagation analysis.
   */
  analyzeShockPropagation(data, clusters) {
    const shockPropagation = {
      directEffects: {},
      indirectEffects: {},
      propagationPaths: []
    };

    try {
      clusters.forEach(cluster => {
        const { markets } = cluster;
        markets.forEach(market => {
          const shocks = this.detectPriceShocks(data[market] || []);
          if (shocks.length > 0) {
            // Track direct effects
            shockPropagation.directEffects[market] = shocks;

            // Analyze propagation through connected markets
            const propagation = this.analyzePropagationPath(market, shocks, cluster);
            shockPropagation.propagationPaths.push(...propagation);

            // Track indirect effects
            propagation.forEach(path => {
              if (!shockPropagation.indirectEffects[path.target]) {
                shockPropagation.indirectEffects[path.target] = [];
              }
              shockPropagation.indirectEffects[path.target].push({
                sourceMarket: market,
                shock: path.shock,
                lag: path.lag
              });
            });
          }
        });
      });

      return shockPropagation;
    } catch (error) {
      this.logger.error('Error analyzing shock propagation:', error);
      return shockPropagation;
    }
  }

  /**
   * Calculates performance metrics for each region.
   * @returns {Object} Performance metrics per region.
   */
  calculatePerformanceMetrics() {
    const { flows, timeSeries } = this.processedData.base;
    const metrics = {};

    try {
      Object.keys(timeSeries).forEach(region => {
        const marketMetrics = {
          flowMetrics: this.calculateFlowMetrics(flows, region),
          priceMetrics: this.calculatePriceMetrics(timeSeries[region]),
          connectivityMetrics: this.calculateConnectivityMetrics(flows, region)
        };

        metrics[region] = {
          ...marketMetrics,
          compositeScore: this.calculateCompositeScore(marketMetrics)
        };
      });

      return metrics;
    } catch (error) {
      this.logger.error('Error calculating performance metrics:', error);
      throw error;
    }
  }

  /**
   * Calculates the weighted score for a region based on metrics.
   * @param {string} region - Region identifier.
   * @param {Object} metrics - Analysis metrics.
   * @param {Object} weights - Weights for each metric component.
   * @returns {number} Weighted score.
   */
  calculateWeightedScore(region, metrics, weights) {
    const integration = metrics.marketIntegration[region]?.integrationEfficiency || 0;
    const stability = metrics.volatilityAnalysis[region]?.volatility || 0;
    const connectivity = metrics.regionalConnections[region]?.flowMetrics?.netFlow || 0;
    const recovery = metrics.performanceMetrics[region]?.compositeScore || 0;

    return (
      (integration * weights.integration) +
      (stability * weights.stability) +
      (connectivity * weights.connectivity) +
      (recovery * weights.recovery)
    );
  }

  /**
   * Prepares price choropleth data.
   * @param {Object} geoData - GeoJSON data.
   * @param {Array} priceData - Price data per region.
   * @returns {Object} Price choropleth data.
   */
  preparePriceChoropleth(geoData, priceData) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return geoData.features.map(feature => ({
      region_id: feature.properties.region_id,
      price: this.calculateMean(priceData[feature.properties.region_id]?.map(d => d.price) || [])
    }));
  }

  /**
   * Prepares integration choropleth data.
   * @param {Object} geoData - GeoJSON data.
   * @param {Object} integrationData - Integration data per region.
   * @returns {Object} Integration choropleth data.
   */
  prepareIntegrationChoropleth(geoData, integrationData) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return geoData.features.map(feature => ({
      region_id: feature.properties.region_id,
      integration: integrationData[feature.properties.region_id]?.meanCorrelation || 0
    }));
  }

  /**
   * Prepares resilience choropleth data.
   * @param {Object} geoData - GeoJSON data.
   * @param {Object} resilienceScores - Resilience scores per region.
   * @returns {Object} Resilience choropleth data.
   */
  prepareResilienceChoropleth(geoData, resilienceScores) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return geoData.features.map(feature => ({
      region_id: feature.properties.region_id,
      resilience: resilienceScores[feature.properties.region_id]?.total || 0
    }));
  }

  /**
   * Processes flows for visualization.
   * @param {Array} flows - Array of flow objects.
   * @returns {Array} Processed flows data.
   */
  processFlowsForVisualization(flows) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      weight: flow.flow_weight,
      color: this.getFlowColor(flow.price_differential)
    }));
  }

  /**
   * Processes cluster flows for visualization.
   * @param {Array} flows - Array of flow objects.
   * @param {Array} clusters - Array of cluster objects.
   * @returns {Array} Processed cluster flows data.
   */
  processClusterFlows(flows, clusters) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return clusters.map(cluster => ({
      clusterId: cluster.id,
      flows: flows.filter(flow => cluster.markets.includes(flow.source) || cluster.markets.includes(flow.target))
    }));
  }

  /**
   * Calculates flow directions for visualization.
   * @param {Array} flows - Array of flow objects.
   * @returns {Array} Flow directions data.
   */
  calculateFlowDirections(flows) {
    return flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      angle: Math.atan2(
        flow.target_lat - flow.source_lat,
        flow.target_lng - flow.source_lng
      ) * 180 / Math.PI,
      distance: this.calculateDistance(
        [flow.source_lng, flow.source_lat],
        [flow.target_lng, flow.target_lat]
      )
    }));
  }

  /**
   * Prepares shock overlay data for visualization.
   * @param {Array} commodities - Array of commodity data.
   * @returns {Array} Shock overlay data.
   */
  prepareShockOverlay(commodities) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return commodities.flatMap(commodity => {
      const shocks = this.detectPriceShocks(commodity.data);
      return shocks.map(shock => ({
        date: shock.date,
        type: shock.type,
        magnitude: shock.magnitude,
        style: {
          point: {
            radius: Math.min(10, shock.magnitude * 20),
            fillColor: shock.type === 'surge' ? '#d73027' : '#4575b4',
            fillOpacity: 0.6,
            weight: 1
          },
          label: {
            text: `${shock.type === 'surge' ? '▲' : '▼'} ${(shock.magnitude * 100).toFixed(1)}%`
          }
        }
      }));
    });
  }

  /**
   * Calculates correlation between two price series.
   * @param {Array} prices1 - First price series.
   * @param {Array} prices2 - Second price series.
   * @returns {number} Correlation coefficient.
   */
  calculatePriceCorrelation(prices1, prices2) {
    if (prices1.length !== prices2.length || prices1.length === 0) return 0;

    const mean1 = this.calculateMean(prices1);
    const mean2 = this.calculateMean(prices2);
    const std1 = this.calculateStandardDeviation(prices1, mean1);
    const std2 = this.calculateStandardDeviation(prices2, mean2);

    if (std1 === 0 || std2 === 0) return 0;

    const covariance = prices1.reduce((acc, val, idx) => acc + ((val - mean1) * (prices2[idx] - mean2)), 0) / (prices1.length - 1);
    return covariance / (std1 * std2);
  }

  /**
   * Calculates Moran's I statistic for spatial autocorrelation.
   * @param {Object} timeSeries - Time series data per region.
   * @param {Object} weights - Spatial weights data.
   * @returns {number} Moran's I value.
   */
  calculateMoransI(timeSeries, weights) {
    // Implement Moran's I calculation based on specific requirements
    // Placeholder implementation
    return 0;
  }

  /**
   * Calculates price transmission based on flows and commodity.
   * @param {Array} flows - Array of flow objects.
   * @param {string} commodity - Commodity name.
   * @returns {number} Price transmission metric.
   */
  calculatePriceTransmission(flows, commodity) {
    // Placeholder implementation
    // Replace with actual logic as needed
    const relevantFlows = flows.filter(flow => flow.commodity === commodity);
    if (relevantFlows.length === 0) return 0;
    const totalPriceDiff = relevantFlows.reduce((sum, flow) => sum + flow.price_differential, 0);
    return totalPriceDiff / relevantFlows.length;
  }

  /**
   * Calculates the number of unique markets covered by flows for a commodity.
   * @param {Array} flows - Array of flow objects.
   * @param {string} commodity - Commodity name.
   * @returns {number} Number of unique markets.
   */
  calculateMarketCoverage(flows, commodity) {
    const uniqueMarkets = new Set();
    flows.forEach(flow => {
      if (flow.commodity === commodity) {
        uniqueMarkets.add(flow.source);
        uniqueMarkets.add(flow.target);
      }
    });
    return uniqueMarkets.size;
  }

  /**
   * Calculates flow weights for visualization.
   * @param {Array} flows - Array of flow objects.
   * @returns {Object} Flow weights data.
   */
  calculateFlowWeights(flows) {
    const weights = {};
    flows.forEach(flow => {
      const key = `${flow.source}-${flow.target}`;
      weights[key] = {
        weight: flow.flow_weight,
        normalized: this.normalizeFlowWidth(flow.flow_weight)
      };
    });
    return weights;
  }

  /**
   * Calculates flow directions and distances.
   * @param {Array} flows - Array of flow objects.
   * @returns {Array} Flow directions data.
   */
  calculateFlowDirections(flows) {
    return flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      angle: Math.atan2(
        flow.target_lat - flow.source_lat,
        flow.target_lng - flow.source_lng
      ) * 180 / Math.PI,
      distance: this.calculateDistance(
        [flow.source_lng, flow.source_lat],
        [flow.target_lng, flow.target_lat]
      )
    }));
  }

  /**
   * Calculates distance between two coordinates.
   * @param {Array} coord1 - [longitude, latitude] of first point.
   * @param {Array} coord2 - [longitude, latitude] of second point.
   * @returns {number} Distance in kilometers.
   */
  calculateDistance(coord1, coord2) {
    try {
      return turf.distance(
        turf.point(coord1),
        turf.point(coord2),
        { units: 'kilometers' }
      );
    } catch (error) {
      this.logger.error('Error calculating distance:', error);
      return 0;
    }
  }

  /**
   * Detects price shocks in the data.
   * @param {Array} data - Array of data points.
   * @returns {Array} Detected price shocks.
   */
  detectPriceShocks(data) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return [];
  }

  /**
   * Detects volatility shocks in the data.
   * @param {Array} data - Array of data points.
   * @returns {Array} Detected volatility shocks.
   */
  detectVolatilityShocks(data) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return [];
  }

  /**
   * Prepares line series data for visualization.
   * @param {Object} commodities - Commodity data per region.
   * @param {string} metric - Metric type ('price' or 'volatility').
   * @returns {Object} Line series data.
   */
  prepareLineSeries(commodities, metric) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return {};
  }

  /**
   * Generates legend items based on color scales.
   * @param {Function} scale - Chroma color scale function.
   * @param {string} dataType - Type of data ('continuous', 'categorical', etc.).
   * @returns {Array} Array of legend items.
   */
  generateLegendItems(scale, dataType) {
    const numItems = dataType === 'categorical' ? 5 : 7;
    const items = [];

    try {
      for (let i = 0; i < numItems; i++) {
        const value = dataType === 'categorical' ? 
          i / (numItems - 1) : 
          i / (numItems - 1);
          
        items.push({
          value,
          color: this.config.colorScales[dataType.toUpperCase()](value),
          label: this.formatLegendLabel(value, dataType)
        });
      }

      return items;
    } catch (error) {
      this.logger.error('Error generating legend items:', error);
      return items;
    }
  }

  /**
   * Formats legend labels based on data type.
   * @param {number} value - Value to format.
   * @param {string} dataType - Type of data.
   * @returns {string} Formatted label.
   */
  formatLegendLabel(value, dataType) {
    const formats = {
      currency: (v) => `$${(v * 100).toFixed(2)}`,
      text: (v) => `Category ${Math.round(v * 10)}`,
      percentage: (v) => `${(v * 100).toFixed(1)}%`,
      number: (v) => v.toFixed(2)
    };
    return formats[dataType] ? formats[dataType](value) : value.toString();
  }

  /**
   * Determines the legend type based on data type.
   * @param {string} dataType - Type of data.
   * @returns {string} Legend type.
   */
  determineLegendType(dataType) {
    const types = {
      prices: 'continuous',
      clusters: 'categorical',
      shocks: 'diverging',
      flows: 'continuous'
    };
    return types[dataType] || 'continuous';
  }

  /**
   * Gets the legend title based on data type.
   * @param {string} dataType - Type of data.
   * @returns {string} Legend title.
   */
  getLegendTitle(dataType) {
    const titles = {
      prices: 'Price Distribution',
      clusters: 'Market Clusters',
      shocks: 'Price Shocks',
      flows: 'Trade Flow Intensity'
    };
    return titles[dataType] || dataType;
  }

  /**
   * Gets the legend format based on data type.
   * @param {string} dataType - Type of data.
   * @returns {string} Legend format.
   */
  getLegendFormat(dataType) {
    const formats = {
      prices: 'currency',
      clusters: 'text',
      shocks: 'percentage',
      flows: 'number'
    };
    return formats[dataType] || 'number';
  }

  /**
   * Calculates color scales for visualization.
   * @param {Object} datasets - Datasets used for color scale calculation.
   * @returns {Object} Color scales.
   */
  calculateColorScales({ choroplethData, flowMapsData, clusterVisuals }) {
    try {
      return {
        prices: this.calculatePriceScale(choroplethData),
        flows: this.calculateFlowScale(flowMapsData),
        clusters: this.calculateClusterScale(clusterVisuals)
      };
    } catch (error) {
      this.logger.error('Error calculating color scales:', error);
      return {};
    }
  }

  /**
   * Calculates price color scale.
   * @param {Object} choroplethData - Choropleth data.
   * @returns {Function} Chroma color scale function.
   */
  calculatePriceScale(choroplethData) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return chroma.scale(['#f7fbff', '#08519c']).mode('lab');
  }

  /**
   * Calculates flow color scale.
   * @param {Object} flowMapsData - Flow maps data.
   * @returns {Function} Chroma color scale function.
   */
  calculateFlowScale(flowMapsData) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return chroma.scale(['#fee6ce', '#f03b20']).mode('lab');
  }

  /**
   * Calculates cluster color scale.
   * @param {Array} clusterVisuals - Cluster visuals data.
   * @returns {Function} Chroma color scale function.
   */
  calculateClusterScale(clusterVisuals) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return chroma.scale(['#ffffcc', '#bd0026']).mode('lab');
  }

  /**
   * Calculates spatial weights based on geographical data.
   * @returns {Object} Spatial weights data.
   */
  async calculateSpatialWeights() {
    try {
      this.logger.info('Calculating spatial weights');
      const { geo: { features } } = this.processedData.base;

      if (!features?.length) {
        this.logger.error('No features found for spatial weights calculation');
        return {};
      }

      const weights = this.initializeWeights(features);

      // Calculate distances and weights between regions
      features.forEach((feature1) => {
        const region1 = feature1.properties.region_id;
        if (!region1) return;

        features.forEach((feature2) => {
          const region2 = feature2.properties.region_id;
          if (!region2 || region1 === region2) return;

          const distance = turf.distance(
            turf.centroid(feature1),
            turf.centroid(feature2),
            { units: 'kilometers' }
          );

          if (distance <= this.config.thresholds.NEIGHBOR_THRESHOLD_KM) {
            weights[region1].neighbors.push(region2);
            weights[region1].weights = weights[region1].weights || [];
            weights[region1].weights.push(1 / distance);
          }
        });
      });

      // Normalize weights
      Object.values(weights).forEach(region => {
        if (region.weights?.length > 0) {
          const sum = region.weights.reduce((a, b) => a + b, 0);
          region.weights = region.weights.map(w => w / sum);
        }
      });

      this.logger.info(`Calculated weights for ${Object.keys(weights).length} regions`);
      return weights;
    } catch (error) {
      this.logger.error('Error calculating spatial weights:', error);
      return {};
    }
  }

  /**
   * Identifies market clusters based on spatial weights and trade flows.
   * @returns {Array} Array of market clusters.
   */
  async identifyMarketClusters() {
    const { flows } = this.processedData.base;
    const { spatialWeights } = this.processedData.derived;
    
    try {
      // First pass: identify initial clusters based on spatial weights
      const initialClusters = this.findInitialClusters(spatialWeights);
      
      // Second pass: refine clusters based on trade flows
      const refinedClusters = this.refineClustersWithFlows(initialClusters, flows);
      
      // Calculate cluster metrics
      const clustersWithMetrics = this.calculateClusterMetrics(refinedClusters, flows);
      
      // Sort clusters by importance
      return this.sortClustersByImportance(clustersWithMetrics);
    } catch (error) {
      this.logger.error('Error identifying market clusters:', error);
      return [];
    }
  }

  /**
   * Finds initial clusters using Depth-First Search based on spatial weights.
   * @param {Object} spatialWeights - Spatial weights data.
   * @returns {Array} Initial clusters.
   */
  findInitialClusters(spatialWeights) {
    const clusters = [];
    const visited = new Set();

    const dfs = (regionId, currentCluster) => {
      if (visited.has(regionId)) return;
      
      visited.add(regionId);
      currentCluster.markets.add(regionId);
      
      const neighbors = spatialWeights[regionId]?.neighbors || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, currentCluster);
        }
      });
    };

    // Identify connected components using DFS
    Object.keys(spatialWeights).forEach(regionId => {
      if (!visited.has(regionId)) {
        const cluster = {
          markets: new Set(),
          flows: [],
          mainMarket: null,
          metrics: {}
        };
        
        dfs(regionId, cluster);
        
        if (cluster.markets.size >= this.config.thresholds.MIN_CLUSTER_SIZE) {
          clusters.push(cluster);
        }
      }
    });

    return clusters;
  }

  /**
   * Refines clusters based on trade flows.
   * @param {Array} clusters - Initial clusters.
   * @param {Array} flows - Array of flow objects.
   * @returns {Array} Refined clusters.
   */
  refineClustersWithFlows(clusters, flows) {
    return clusters.map(cluster => {
      // Get all flows involving markets in this cluster
      const clusterFlows = flows.filter(flow => 
        cluster.markets.has(flow.source) || cluster.markets.has(flow.target)
      );

      // Calculate flow weights for each market
      const marketWeights = new Map();
      clusterFlows.forEach(flow => {
        if (cluster.markets.has(flow.source)) {
          marketWeights.set(flow.source, 
            (marketWeights.get(flow.source) || 0) + flow.flow_weight
          );
        }
        if (cluster.markets.has(flow.target)) {
          marketWeights.set(flow.target, 
            (marketWeights.get(flow.target) || 0) + flow.flow_weight
          );
        }
      });

      // Identify main market based on flow weights
      const mainMarket = Array.from(marketWeights.entries())
        .sort(([, a], [, b]) => b - a)[0]?.[0] || Array.from(cluster.markets)[0];

      return {
        ...cluster,
        mainMarket,
        flows: clusterFlows
      };
    });
  }

  /**
   * Calculates metrics for each cluster.
   * @param {Array} clusters - Refined clusters.
   * @param {Array} allFlows - All flow objects.
   * @returns {Array} Clusters with calculated metrics.
   */
  calculateClusterMetrics(clusters, allFlows) {
    return clusters.map(cluster => {
      const { markets, flows } = cluster;
      
      // Calculate basic metrics
      const totalFlow = flows.reduce((sum, flow) => sum + flow.flow_weight, 0);
      const avgFlow = totalFlow / markets.size;
      const internalFlows = flows.filter(flow => 
        markets.has(flow.source) && markets.has(flow.target)
      );
      const externalFlows = flows.filter(flow => 
        (markets.has(flow.source) && !markets.has(flow.target)) ||
        (!markets.has(flow.source) && markets.has(flow.target))
      );

      // Calculate market importance scores
      const marketScores = new Map();
      flows.forEach(flow => {
        if (markets.has(flow.source)) {
          marketScores.set(flow.source, 
            (marketScores.get(flow.source) || 0) + flow.flow_weight
          );
        }
        if (markets.has(flow.target)) {
          marketScores.set(flow.target, 
            (marketScores.get(flow.target) || 0) + flow.flow_weight
          );
        }
      });

      // Calculate price integration
      const priceCorrelations = this.calculateClusterPriceCorrelations(cluster);

      return {
        ...cluster,
        metrics: {
          size: markets.size,
          totalFlow,
          avgFlow,
          density: flows.length / (markets.size * (markets.size - 1)),
          internalFlowRatio: flows.length > 0 ? internalFlows.length / flows.length : 0,
          externalConnections: externalFlows.length,
          marketImportance: Object.fromEntries(marketScores),
          priceIntegration: priceCorrelations,
          relativeSize: markets.size / Object.keys(allFlows).length
        }
      };
    });
  }

  /**
   * Calculates price correlations within a cluster.
   * @param {Object} cluster - Cluster object.
   * @returns {Object} Price correlation metrics.
   */
  calculateClusterPriceCorrelations(cluster) {
    const { flows } = cluster;
    const correlations = [];
    
    // Calculate pairwise price correlations within cluster
    flows.forEach(flow => {
      if (flow.source_price != null && flow.target_price != null) { // Use != null to check for both null and undefined
        const priceDiff = Math.abs(
          (flow.source_price - flow.target_price) / 
          ((flow.source_price + flow.target_price) / 2)
        );
        correlations.push(priceDiff);
      }
    });

    return {
      mean: this.calculateMean(correlations),
      std: this.calculateStandardDeviation(correlations)
    };
  }

  /**
   * Sorts clusters based on importance metrics.
   * @param {Array} clusters - Clusters with metrics.
   * @returns {Array} Sorted clusters.
   */
  sortClustersByImportance(clusters) {
    return clusters.sort((a, b) => {
      // Complex sorting based on multiple metrics
      const scoreA = (
        a.metrics.totalFlow * 0.4 +
        a.metrics.size * 0.3 +
        a.metrics.density * 0.2 +
        a.metrics.externalConnections * 0.1
      );
      const scoreB = (
        b.metrics.totalFlow * 0.4 +
        b.metrics.size * 0.3 +
        b.metrics.density * 0.2 +
        b.metrics.externalConnections * 0.1
      );
      return scoreB - scoreA;
    });
  }

  /**
   * Calculates statistics for time series data.
   * @returns {Object} Time series statistics per region and commodity.
   */
  async calculateTimeSeriesStatistics() {
    const { timeSeries } = this.processedData.base;
    const stats = {};

    try {
      for (const [region, commodities] of Object.entries(timeSeries)) {
        stats[region] = {};
        for (const [commodity, data] of Object.entries(commodities)) {
          stats[region][commodity] = {
            price: {
              mean: this.calculateMean(data.map(d => d.price)),
              std: this.calculateStandardDeviation(data.map(d => d.price)),
              trend: this.calculateTrend(data.map(d => d.price)),
              volatility: this.calculateVolatility(data)
            },
            usdPrice: {
              mean: this.calculateMean(data.map(d => d.usdPrice)),
              std: this.calculateStandardDeviation(data.map(d => d.usdPrice))
            },
            conflictIntensity: {
              mean: this.calculateMean(data.map(d => d.conflictIntensity)),
              max: Math.max(...data.map(d => d.conflictIntensity))
            }
          };
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Error calculating time series statistics:', error);
      throw error;
    }
  }

  /**
   * Analyzes regional connections based on trade flows.
   * @returns {Object} Regional connections analysis.
   */
  async analyzeRegionalConnections() {
    const { flows } = this.processedData.base;
    const connections = {};

    try {
      // Group flows by region
      Object.keys(this.processedData.base.timeSeries).forEach(region => {
        const incomingFlows = flows.filter(f => f.target === region);
        const outgoingFlows = flows.filter(f => f.source === region);

        connections[region] = {
          totalIncoming: incomingFlows.reduce((sum, f) => sum + f.flow_weight, 0),
          totalOutgoing: outgoingFlows.reduce((sum, f) => sum + f.flow_weight, 0),
          incomingConnections: new Set(incomingFlows.map(f => f.source)),
          outgoingConnections: new Set(outgoingFlows.map(f => f.target)),
          flowMetrics: this.calculateRegionalFlowMetrics(incomingFlows, outgoingFlows)
        };
      });

      return connections;
    } catch (error) {
      this.logger.error('Error analyzing regional connections:', error);
      throw error;
    }
  }

  /**
   * Calculates flow metrics for a region.
   * @param {Array} incomingFlows - Array of incoming flow objects.
   * @param {Array} outgoingFlows - Array of outgoing flow objects.
   * @returns {Object} Flow metrics.
   */
  calculateRegionalFlowMetrics(incomingFlows, outgoingFlows) {
    return {
      netFlow: outgoingFlows.reduce((sum, f) => sum + f.flow_weight, 0) -
               incomingFlows.reduce((sum, f) => sum + f.flow_weight, 0),
      flowDiversity: {
        incoming: incomingFlows.length,
        outgoing: outgoingFlows.length
      },
      priceDispersion: {
        incoming: this.calculateStandardDeviation(incomingFlows.map(f => f.price_differential)),
        outgoing: this.calculateStandardDeviation(outgoingFlows.map(f => f.price_differential))
      }
    };
  }

  /**
   * Analyzes volatility in the data.
   * @returns {Object} Volatility analysis per region and commodity.
   */
  async analyzeVolatility() {
    const { timeSeries } = this.processedData.base;
    const volatilityAnalysis = {};

    try {
      Object.entries(timeSeries).forEach(([region, commodities]) => {
        volatilityAnalysis[region] = {};
        Object.entries(commodities).forEach(([commodity, data]) => {
          const returns = this.calculateReturns(data.map(d => d.price));
          const volatility = this.calculateStandardDeviation(returns);
          volatilityAnalysis[region][commodity] = {
            volatility,
            annualizedVolatility: volatility * Math.sqrt(12), // Assuming monthly data
            maxDrawdown: this.calculateMaxDrawdown(data.map(d => d.price)),
            metrics: this.calculateVolatilityMetrics(returns)
          };
        });
      });

      return volatilityAnalysis;
    } catch (error) {
      this.logger.error('Error analyzing volatility:', error);
      throw error;
    }
  }

  /**
   * Calculates performance metrics for a region.
   * @param {Array} flows - Array of flow objects.
   * @param {string} region - Region identifier.
   * @returns {Object} Flow metrics.
   */
  calculateFlowMetrics(flows, region) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return {
      totalFlow: flows.filter(flow => flow.source === region || flow.target === region)
                     .reduce((sum, flow) => sum + flow.flow_weight, 0),
      averageFlow: 0
    };
  }

  /**
   * Calculates price metrics for a region.
   * @param {Array} timeSeriesData - Time series data for a commodity.
   * @returns {Object} Price metrics.
   */
  calculatePriceMetrics(timeSeriesData) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return {};
  }

  /**
   * Calculates connectivity metrics for a region.
   * @param {Array} flows - Array of flow objects.
   * @param {string} region - Region identifier.
   * @returns {Object} Connectivity metrics.
   */
  calculateConnectivityMetrics(flows, region) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return {};
  }

  /**
   * Calculates composite score based on various metrics.
   * @param {Object} marketMetrics - Market metrics.
   * @returns {number} Composite score.
   */
  calculateCompositeScore(marketMetrics) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return 0;
  }

  /**
   * Calculates resilience scores for regions.
   * @param {Object} metrics - Analysis metrics.
   * @param {Object} weights - Weights for each component.
   * @returns {Object} Resilience scores.
   */
  async calculateResilienceScores(metrics, weights = null) {
    const scores = {};
    weights = weights || {
      integration: 0.3,
      stability: 0.3,
      connectivity: 0.2,
      recovery: 0.2
    };

    try {
      Object.keys(this.processedData.base.geo.features).forEach(region => {
        const integration = metrics.marketIntegration[region]?.integrationEfficiency || 0;
        const stability = metrics.volatilityAnalysis[region]?.volatility || 0;
        const connectivity = metrics.regionalConnections[region]?.flowMetrics?.netFlow || 0;
        const recovery = metrics.performanceMetrics[region]?.compositeScore || 0;

        scores[region] = {
          total: (
            (integration * weights.integration) +
            (stability * weights.stability) +
            (connectivity * weights.connectivity) +
            (recovery * weights.recovery)
          ),
          components: {
            integration,
            stability,
            connectivity,
            recovery
          }
        };
      });

      return scores;
    } catch (error) {
      this.logger.error('Error calculating resilience scores:', error);
      throw error;
    }
  }

  /**
   * Normalizes GeoJSON data.
   * @param {Object} geoData - Raw GeoJSON data.
   * @returns {Object} Normalized GeoJSON data.
   */
  normalizeGeoData(geoData) {
    return {
      type: 'FeatureCollection',
      features: geoData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          region_id: this.normalizeRegionName(feature.properties.region_id || feature.properties.admin1),
          name: feature.properties.shapeName || feature.properties.name
        }
      }))
    };
  }

  /**
   * Normalizes flow data.
   * @param {Array} flowsData - Raw flow data.
   * @returns {Array} Normalized flow data.
   */
  normalizeFlowsData(flowsData) {
    return flowsData.map(flow => {
      // Validate required fields
      if (!flow.source || !flow.target || !flow.date) {
        this.logger.warn('Invalid flow data:', flow);
        return null;
      }

      return {
        ...flow,
        source: this.normalizeRegionName(flow.source),
        target: this.normalizeRegionName(flow.target),
        source_lat: parseFloat(flow.source_lat),
        source_lng: parseFloat(flow.source_lng),
        target_lat: parseFloat(flow.target_lat),
        target_lng: parseFloat(flow.target_lng),
        flow_weight: parseFloat(flow.flow_weight) || 0,
        price_differential: parseFloat(flow.price_differential) || 0,
        date: this.normalizeDate(flow.date),
        source_price: parseFloat(flow.source_price) || null,
        target_price: parseFloat(flow.target_price) || null,
        commodity: flow.commodity?.toLowerCase() || ''
      };
    }).filter(flow => flow !== null); // Remove invalid entries
  }

  /**
   * Normalizes weights data.
   * @param {Object} weightsData - Raw weights data.
   * @returns {Object} Normalized weights data.
   */
  normalizeWeightsData(weightsData) {
    const normalized = {};
    Object.entries(weightsData).forEach(([region, data]) => {
      const normalizedRegion = this.normalizeRegionName(region);
      normalized[normalizedRegion] = {
        neighbors: Array.isArray(data.neighbors) 
          ? data.neighbors.map(n => this.normalizeRegionName(n))
          : [],
        weights: Array.isArray(data.weights)
          ? data.weights.map(w => parseFloat(w) || 0)
          : [],
        totalWeight: parseFloat(data.totalWeight) || 0
      };
    });
    return normalized;
  }

  /**
   * Normalizes time series data.
   * @param {Object} timeSeriesData - Raw time series data.
   * @returns {Object} Normalized time series data.
   * @throws Will throw an error if the data structure is invalid.
   */
  normalizeTimeSeriesData(timeSeriesData) {
    if (!timeSeriesData?.features) {
      throw new Error('Invalid time series data structure');
    }

    const normalized = {};
    
    try {
      timeSeriesData.features.forEach(feature => {
        const { properties } = feature;
        const regionId = this.normalizeRegionName(properties.region_id);
        const commodity = properties.commodity?.toLowerCase();
        
        if (!regionId || !commodity) return;
        
        if (!normalized[regionId]) {
          normalized[regionId] = {};
        }
        if (!normalized[regionId][commodity]) {
          normalized[regionId][commodity] = [];
        }
        
        normalized[regionId][commodity].push({
          date: this.normalizeDate(properties.date),
          price: this.normalizeNumber(properties.price),
          usdPrice: this.normalizeNumber(properties.usdprice),
          conflictIntensity: this.normalizeNumber(properties.conflict_intensity),
          residual: this.normalizeNumber(properties.residual)
        });
      });

      // Sort time series data by date
      Object.values(normalized).forEach(commodities => {
        Object.values(commodities).forEach(series => {
          series.sort((a, b) => new Date(a.date) - new Date(b.date));
        });
      });

      return normalized;
    } catch (error) {
      this.logger.error('Error normalizing time series data:', error);
      throw error;
    }
  }

  /**
   * Loads GeoJSON data from a file.
   * @param {string} filepath - Path to the GeoJSON file.
   * @returns {Object} Loaded GeoJSON data.
   */
  async loadGeoData(filepath) {
    return await this.fileQueue.add(() => this.safeFileOperation(async () => {
      const data = await fs.readJson(filepath);
      const schema = { type: 'string', features: 'array' };
      if (!this.validateDataStructure(data, schema)) {
        throw new Error('Invalid GeoJSON structure');
      }
      return this.normalizeGeoData(data);
    }, {})); // Provide an empty FeatureCollection as fallback
  }

  /**
   * Loads flow data from a CSV file.
   * @param {string} filepath - Path to the CSV file.
   * @returns {Array} Loaded and normalized flow data.
   */
  async loadFlowData(filepath) {
    return await this.fileQueue.add(() => this.safeFileOperation(async () => {
      const csvContent = await fs.readFile(filepath, 'utf-8');
      const records = csv.parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      });
      return this.normalizeFlowsData(records);
    }, [])); // Provide an empty array as fallback
  }

  /**
   * Loads time series data from a JSON file.
   * @param {string} filepath - Path to the JSON file.
   * @returns {Object} Loaded and normalized time series data.
   */
  async loadTimeSeriesData(filepath) {
    return await this.fileQueue.add(() => this.safeFileOperation(async () => {
      const data = await fs.readJson(filepath);
      return this.normalizeTimeSeriesData(data);
    }, {})); // Provide an empty object as fallback
  }

  /**
   * Loads weights data from a JSON file.
   * @param {string} filepath - Path to the JSON file.
   * @returns {Object} Loaded and normalized weights data.
   */
  async loadWeightsData(filepath) {
    return await this.fileQueue.add(() => this.safeFileOperation(async () => {
      const data = await fs.readJson(filepath);
      return this.normalizeWeightsData(data);
    }, {})); // Provide an empty object as fallback
  }

  /**
   * Safely performs a file operation with error handling and fallback.
   * @param {Function} operation - Asynchronous operation to perform.
   * @param {*} fallback - Fallback value if the operation fails.
   * @returns {*} Result of the operation or fallback.
   */
  async safeFileOperation(operation, fallback = null) {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`File operation failed: ${error.message}`);
      if (error.code === 'ENOENT') {
        this.logger.warn('File not found, using fallback data');
        return fallback;
      }
      throw error;
    }
  }

  /**
   * Validates the data structure against a schema.
   * @param {Object} data - Data to validate.
   * @param {Object} schema - Schema definition.
   * @returns {boolean} Whether the data matches the schema.
   */
  validateDataStructure(data, schema) {
    if (!data) return false;
    
    return Object.entries(schema).every(([key, type]) => {
      if (type === 'array') return Array.isArray(data[key]);
      if (type === 'object') return typeof data[key] === 'object' && data[key] !== null;
      return typeof data[key] === type;
    });
  }

  /**
   * Normalizes region names to a standard format.
   * @param {string} name - Original region name.
   * @returns {string} Normalized region name.
   */
  normalizeRegionName(name) {
    if (!name) return '';

    // Externalize special cases for scalability
    const specialCases = {
      "san'a'": 'sanaa',
      'san_a__governorate': 'sanaa',
      "sana'a": 'sanaa',
      'sanʿaʾ': 'sanaa',
      'amanat_al_asimah': 'amanat_al_asimah',
      'lahij': 'lahj',
      '_adan': 'aden',
      'ta_izz': 'taizz',
      'al_hudaydah': 'al_hudaydah',
      'al_jawf': 'al_jawf',
      'shabwah': 'shabwa',
      'hadhramaut': 'hadramaut',
      'al_bayda': 'al_bayda',
      'al_mahwit': 'al_mahwit',
      'ad_dali': 'ad_dali',
      'amran': 'amran',
      'ibb': 'ibb',
      'abyan': 'abyan',
      'soqatra': 'socotra',
      'ma_rib': 'marib',
      'raymah': 'raymah',
      'al_maharah': 'al_maharah',
      'hajjah': 'hajjah'
      // Add more mappings as needed
    };

    try {
      const normalized = String(name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/['`'']/g, '') // Remove quotes
        .replace(/[\s_-]+/g, '_') // Replace spaces/hyphens with underscore
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .trim();

      return specialCases[normalized] || normalized;
    } catch (error) {
      this.logger.error(`Error normalizing region name "${name}":`, error);
      return String(name).toLowerCase().trim();
    }
  }

  /**
   * Calculates the mean of an array of numbers.
   * @param {Array<number>} values - Array of numbers.
   * @returns {number} Mean value.
   */
  calculateMean(values) {
    if (!values?.length) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculates the standard deviation of an array of numbers.
   * @param {Array<number>} values - Array of numbers.
   * @param {number} [mean=null] - Precomputed mean value.
   * @returns {number} Standard deviation.
   */
  calculateStandardDeviation(values, mean = null) {
    if (!values?.length) return 0;
    const m = mean !== null ? mean : this.calculateMean(values);
    const squaredDiffs = values.map(v => Math.pow(v - m, 2));
    return Math.sqrt(this.calculateMean(squaredDiffs));
  }

  /**
   * Removes outliers from an array of numbers based on standard deviation.
   * @param {Array<number>} values - Array of numbers.
   * @returns {Array<number>} Array without outliers.
   */
  removeOutliers(values) {
    if (!values?.length) return [];
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStandardDeviation(values, mean);
    return values.filter(v => 
      Math.abs(v - mean) <= this.config.thresholds.MAX_OUTLIER_STDDEV * stdDev
    );
  }

  /**
   * Calculates returns from price data.
   * @param {Array<number>} prices - Array of prices.
   * @returns {Array<number>} Array of returns.
   */
  calculateReturns(prices) {
    if (!prices?.length) return [];
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i-1] === 0) {
        returns.push(0);
      } else {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
      }
    }
    return returns;
  }

  /**
   * Calculates the trend of a price series.
   * @param {Array<number>} values - Array of prices.
   * @returns {number} Trend coefficient.
   */
  calculateTrend(values) {
    if (!values?.length || values.length < 2) return 0;
    
    const xMean = (values.length - 1) / 2;
    const yMean = this.calculateMean(values);
    
    let numerator = 0;
    let denominator = 0;
    
    values.forEach((y, x) => {
      const xDiff = x - xMean;
      const yDiff = y - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    });
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Normalizes flow width for visualization.
   * @param {number} weight - Flow weight.
   * @param {number} [minWidth=1] - Minimum width.
   * @param {number} [maxWidth=10] - Maximum width.
   * @returns {number} Normalized flow width.
   */
  normalizeFlowWidth(weight, minWidth = 1, maxWidth = 10) {
    if (weight <= 0) return minWidth;
    return this.clamp(
      Math.log(weight + 1) * 2,
      minWidth,
      maxWidth
    );
  }

  /**
   * Calculates flow opacity based on weight.
   * @param {Object} flow - Flow object.
   * @returns {number} Flow opacity.
   */
  calculateFlowOpacity(flow) {
    const baseOpacity = 0.7;
    const weight = this.normalizeNumber(flow.flow_weight);
    return this.clamp(
      baseOpacity * (weight / 100),
      0.2,
      0.9
    );
  }

  /**
   * Determines the flow color based on price differential.
   * @param {number} priceDiff - Price differential.
   * @returns {string} Flow color.
   */
  getFlowColor(priceDiff) {
    const normalizedDiff = this.clamp(
      Math.abs(priceDiff) / this.config.thresholds.PRICE_CHANGE,
      0,
      1
    );
    return priceDiff > 0 
      ? this.config.colorScales.PRICES(normalizedDiff).hex()
      : this.config.colorScales.SHOCKS(normalizedDiff).hex();
  }

  /**
   * Clamps a value between a minimum and maximum.
   * @param {number} value - Value to clamp.
   * @param {number} min - Minimum value.
   * @param {number} max - Maximum value.
   * @returns {number} Clamped value.
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Normalizes a number, returning a default value if invalid.
   * @param {*} value - Value to normalize.
   * @param {number} [defaultValue=0] - Default value if normalization fails.
   * @returns {number} Normalized number.
   */
  normalizeNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Calculates the maximum drawdown from price data.
   * @param {Array<number>} prices - Array of prices.
   * @returns {number} Maximum drawdown.
   */
  calculateMaxDrawdown(prices) {
    if (!prices?.length) return 0;
    
    let maxDrawdown = 0;
    let peak = prices[0];
    
    prices.forEach(price => {
      if (price > peak) {
        peak = price;
      } else {
        const drawdown = (peak - price) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    });
    
    return maxDrawdown;
  }

  /**
   * Calculates volatility metrics from returns.
   * @param {Array<number>} returns - Array of returns.
   * @returns {Object} Volatility metrics.
   */
  calculateVolatilityMetrics(returns) {
    const metrics = {
      mean: this.calculateMean(returns),
      std: this.calculateStandardDeviation(returns),
      skewness: 0,
      kurtosis: 0,
      extremeEvents: 0
    };

    try {
      if (returns.length > 0) {
        let sumCubed = 0;
        let sumFourth = 0;
        let extremeCount = 0;
        
        returns.forEach(ret => {
          const normalized = (ret - metrics.mean) / metrics.std;
          sumCubed += Math.pow(normalized, 3);
          sumFourth += Math.pow(normalized, 4);
          
          if (Math.abs(normalized) > 2) { // Count 2-sigma events
            extremeCount++;
          }
        });
        
        metrics.skewness = sumCubed / returns.length;
        metrics.kurtosis = (sumFourth / returns.length) - 3; // Excess kurtosis
        metrics.extremeEvents = returns.length > 0 ? extremeCount / returns.length : 0;
      }

      return metrics;
    } catch (error) {
      this.logger.error('Error calculating volatility metrics:', error);
      return metrics;
    }
  }

  /**
   * Calculates regional resilience scores.
   * @param {string} region - Region identifier.
   * @param {Object} metrics - Analysis metrics.
   * @returns {number} Integration score.
   */
  calculateIntegrationScore(region, metrics) {
    // Implement based on specific requirements
    // Placeholder implementation
    return metrics.marketIntegration[region]?.integrationEfficiency || 0;
  }

  /**
   * Calculates regional stability score.
   * @param {string} region - Region identifier.
   * @param {Object} metrics - Analysis metrics.
   * @returns {number} Stability score.
   */
  calculateStabilityScore(region, metrics) {
    // Implement based on specific requirements
    // Placeholder implementation
    return metrics.volatilityAnalysis[region]?.volatility || 0;
  }

  /**
   * Calculates regional connectivity score.
   * @param {string} region - Region identifier.
   * @param {Object} metrics - Analysis metrics.
   * @returns {number} Connectivity score.
   */
  calculateConnectivityScore(region, metrics) {
    // Implement based on specific requirements
    // Placeholder implementation
    return metrics.regionalConnections[region]?.flowMetrics?.netFlow || 0;
  }

  /**
   * Calculates regional recovery score.
   * @param {string} region - Region identifier.
   * @param {Object} metrics - Analysis metrics.
   * @returns {number} Recovery score.
   */
  calculateRecoveryScore(region, metrics) {
    // Implement based on specific requirements
    // Placeholder implementation
    return metrics.performanceMetrics[region]?.compositeScore || 0;
  }

  /**
   * Analyzes shock propagation paths.
   * @param {string} market - Market identifier.
   * @param {Array} shocks - Array of shocks affecting the market.
   * @param {Object} cluster - Cluster object containing the market.
   * @returns {Array} Propagation paths.
   */
  analyzePropagationPath(market, shocks, cluster) {
    // Implement based on specific requirements
    // Placeholder implementation
    return [];
  }

  /**
   * Calculates composite score based on various metrics.
   * @param {Object} marketMetrics - Market metrics.
   * @returns {number} Composite score.
   */
  calculateCompositeScore(marketMetrics) {
    // Implement based on specific requirements
    // Placeholder implementation
    return 0;
  }

  /**
   * Initializes spatial weights for regions.
   * @param {Array} features - GeoJSON features.
   * @returns {Object} Initialized spatial weights.
   */
  initializeWeights(features) {
    const weights = {};
    features.forEach(feature => {
      const regionId = feature.properties?.region_id;
      if (regionId && !weights[regionId]) {
        weights[regionId] = {
          neighbors: [],
          weights: []
        };
      }
    });
    return weights;
  }

  /**
   * Validates GeoJSON features.
   * @param {Array} features - GeoJSON features.
   * @returns {Array} Validated features.
   */
  validateFeatures(features) {
    if (!Array.isArray(features)) {
      throw new Error('Features must be an array');
    }
    
    return features.filter(feature => {
      try {
        return (
          feature &&
          feature.properties &&
          feature.geometry &&
          Array.isArray(feature.geometry.coordinates) &&
          feature.properties.region_id &&
          !isNaN(parseFloat(feature.properties.price))
        );
      } catch (error) {
        this.logger.warn('Invalid feature detected:', error);
        return false;
      }
    });
  }

  /**
   * Calculates Morans I statistic.
   * @param {Object} timeSeries - Time series data.
   * @param {Object} weights - Spatial weights data.
   * @returns {number} Morans I value.
   */
  calculateMoransI(timeSeries, weights) {
    // Placeholder implementation
    // Implement actual Morans I calculation based on specific requirements
    return 0;
  }

  /**
   * Calculates price transmission metric.
   * @param {Array} flows - Array of flow objects.
   * @param {string} commodity - Commodity name.
   * @returns {number} Price transmission metric.
   */
  calculatePriceTransmission(flows, commodity) {
    const relevantFlows = flows.filter(flow => flow.commodity === commodity);
    if (relevantFlows.length === 0) return 0;
    const totalPriceDiff = relevantFlows.reduce((sum, flow) => sum + flow.price_differential, 0);
    return totalPriceDiff / relevantFlows.length;
  }

  /**
   * Calculates price correlation between two series.
   * @param {Array<number>} prices1 - First price series.
   * @param {Array<number>} prices2 - Second price series.
   * @returns {number} Correlation coefficient.
   */
  calculatePriceCorrelation(prices1, prices2) {
    if (prices1.length !== prices2.length || prices1.length === 0) return 0;

    const mean1 = this.calculateMean(prices1);
    const mean2 = this.calculateMean(prices2);
    const std1 = this.calculateStandardDeviation(prices1, mean1);
    const std2 = this.calculateStandardDeviation(prices2, mean2);

    if (std1 === 0 || std2 === 0) return 0;

    const covariance = prices1.reduce((acc, val, idx) => acc + ((val - mean1) * (prices2[idx] - mean2)), 0) / (prices1.length - 1);
    return covariance / (std1 * std2);
  }

  /**
   * Calculates regional flow metrics.
   * @param {Array} incomingFlows - Array of incoming flow objects.
   * @param {Array} outgoingFlows - Array of outgoing flow objects.
   * @returns {Object} Regional flow metrics.
   */
  calculateRegionalFlowMetrics(incomingFlows, outgoingFlows) {
    return {
      netFlow: outgoingFlows.reduce((sum, f) => sum + f.flow_weight, 0) -
               incomingFlows.reduce((sum, f) => sum + f.flow_weight, 0),
      flowDiversity: {
        incoming: incomingFlows.length,
        outgoing: outgoingFlows.length
      },
      priceDispersion: {
        incoming: this.calculateStandardDeviation(incomingFlows.map(f => f.price_differential)),
        outgoing: this.calculateStandardDeviation(outgoingFlows.map(f => f.price_differential))
      }
    };
  }

  /**
   * Calculates standard deviation from returns.
   * @param {Array<number>} returns - Array of returns.
   * @returns {number} Standard deviation.
   */
  calculateVolatility(returns) {
    return this.calculateStandardDeviation(returns);
  }

  /**
   * Processes cluster flows for visualization.
   * @param {Object} cluster - Cluster object.
   * @returns {Array} Processed cluster flows.
   */
  processClusterFlows(cluster) {
    return cluster.flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      weight: flow.flow_weight,
      style: this.calculateFlowStyle({
        ...flow,
        isIntraCluster: true
      })
    }));
  }

  /**
   * Calculates flow style properties.
   * @param {Object} flow - Flow object.
   * @returns {Object} Flow style properties.
   */
  calculateFlowStyle(flow) {
    return {
      stroke: this.getFlowColor(flow.price_differential),
      strokeWidth: this.normalizeFlowWidth(flow.flow_weight),
      opacity: this.calculateFlowOpacity(flow)
    };
  }

  /**
   * Detects price shocks in the data.
   * @param {Array} data - Array of data points.
   * @returns {Array} Detected price shocks.
   */
  detectPriceShocks(data) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return [];
  }

  /**
   * Detects volatility shocks in the data.
   * @param {Array} data - Array of data points.
   * @returns {Array} Detected volatility shocks.
   */
  detectVolatilityShocks(data) {
    // Implement the method based on specific requirements
    // Placeholder implementation
    return [];
  }

  /**
   * Calculates the correlation between two price series.
   * @param {Array<number>} series1 - First price series.
   * @param {Array<number>} series2 - Second price series.
   * @returns {number} Correlation coefficient.
   */
  calculateCorrelation(series1, series2) {
    if (series1.length !== series2.length || !series1.length) return 0;

    const mean1 = this.calculateMean(series1);
    const mean2 = this.calculateMean(series2);
    const std1 = this.calculateStandardDeviation(series1);
    const std2 = this.calculateStandardDeviation(series2);

    if (std1 === 0 || std2 === 0) return 0;

    const n = series1.length;
    let sum = 0;

    for (let i = 0; i < n; i++) {
      sum += ((series1[i] - mean1) / std1) * ((series2[i] - mean2) / std2);
    }

    return sum / (n - 1);
  }

  /**
   * Debugs an object by limiting its depth and summarizing its content.
   * @param {*} obj - Object to debug.
   * @param {number} [depth=0] - Current depth.
   * @returns {string} Debugged object as string.
   */
  debugObject(obj, depth = 0) {
    if (depth > 3) return 'MAX_DEPTH';
    
    const indent = '  '.repeat(depth);
    let result = '';
    
    if (Array.isArray(obj)) {
      result = `Array(${obj.length})`;
      if (obj.length > 0) {
        result += `: ${this.debugObject(obj[0], depth + 1)}...`;
      }
    } else if (obj === null) {
      result = 'null';
    } else if (typeof obj === 'object') {
      result = '{\n';
      Object.entries(obj).slice(0, 3).forEach(([key, value]) => {
        result += `${indent}  ${key}: ${this.debugObject(value, depth + 1)}\n`;
      });
      if (Object.keys(obj).length > 3) {
        result += `${indent}  ...(${Object.keys(obj).length - 3} more)\n`;
      }
      result += `${indent}}`;
    } else {
      result = String(obj);
    }
    
    return result;
  }
}


/**
 * Class representing a file operation queue to manage concurrency.
 */
class FileOperationQueue {
  /**
   * Create a FileOperationQueue.
   * @param {number} [concurrency=3] - Number of concurrent operations.
   */
  constructor(concurrency = 3) {
    this.queue = [];
    this.running = 0;
    this.concurrency = concurrency;
  }

  /**
   * Adds an operation to the queue.
   * @param {Function} operation - Asynchronous operation to add.
   * @returns {Promise} Promise resolving to the operation's result.
   */
  add(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Processes the queue by executing operations up to the concurrency limit.
   */
  async processQueue() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;

    const { operation, resolve, reject } = this.queue.shift();
    this.running++;

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

module.exports = EnhancedSpatialPreprocessor;