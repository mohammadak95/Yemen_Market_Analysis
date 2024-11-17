// src/utils/UnifiedDataManager.js

import Papa from 'papaparse';
import _ from 'lodash';
import pLimit from 'p-limit';
import { monitoringSystem } from './MonitoringSystem';
import { preprocessedDataManager } from './PreprocessedDataManager';
import { configUtils } from './systemConfig';
import { getDataPath } from './dataUtils';

class UnifiedDataManager {
  constructor() {
    this._isInitialized = false;
    this.cache = new Map();          // Cache for processed data
    this.jsonCache = new Map();      // Cache for JSON files

    // Setup concurrency control based on configuration
    const concurrencyLimit = configUtils.getConfig('data.concurrency.limit') || 5;
    this.limit = pLimit(concurrencyLimit);
  }

  async init() {
    if (this._isInitialized) return;

    const metric = monitoringSystem.startMetric('init-unified-manager');
    try {
      // Initialize preprocessed data manager
      await preprocessedDataManager.init();

      // Validate configuration
      configUtils.validateConfig();

      this._isInitialized = true;
      metric.finish({ status: 'success' });
      monitoringSystem.log('UnifiedDataManager initialized successfully.', {}, 'init');
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error('Initialization failed.', error, 'init');
      throw error;
    }
  }
  
  async loadSpatialData(commodity, date, options = {}) {
    if (!this._isInitialized) {
      const error = new Error('UnifiedDataManager must be initialized first.');
      monitoringSystem.error(error.message, error, 'loadSpatialData');
      throw error;
    }

    const metric = monitoringSystem.startMetric('load-spatial-data');
    const cacheKey = this.generateCacheKey(commodity, date);

    try {
      // Check cache first
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        monitoringSystem.log(`Cache hit for key: ${cacheKey}`, {}, 'cache');
        metric.finish({ status: 'success', cached: true });
        return cachedData;
      }

      monitoringSystem.log(`Cache miss for key: ${cacheKey}. Loading data...`, {}, 'cache');

      // Load all required data in parallel with concurrency control
      const [
        preprocessedData,
        timeVaryingFlows,
        tvMiiResults,
        priceDifferentials,
        ecmData,
        enhancedUnified
      ] = await Promise.all([
        this.loadPreprocessedData(commodity),
        this.loadTimeVaryingFlows(commodity),
        this.loadTVMIIData(commodity),
        this.loadPriceDifferentials(commodity),
        this.loadECMData(commodity),
        this.loadEnhancedUnifiedData(commodity, date)
      ]);

      // Combine and process all data
      const processedData = await this.processIntegratedData({
        preprocessedData,
        timeVaryingFlows,
        tvMiiResults,
        priceDifferentials,
        ecmData,
        enhancedUnified
      }, date, options);

      // Cache the results
      this.setCachedData(cacheKey, processedData);
      monitoringSystem.log(`Data cached with key: ${cacheKey}`, {}, 'cache');

      metric.finish({ status: 'success', cached: false });
      return processedData;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error(`Failed to load spatial data for ${commodity} on ${date}.`, error, 'loadSpatialData');
      throw error;
    }
  }

  /**
   * Load preprocessed data for a specific commodity.
   *
   * @param {string} commodity - The commodity name.
   * @returns {Object} - The preprocessed data.
   */
  async loadPreprocessedData(commodity) {
    try {
      // Retrieve the preprocessed pattern from configuration
      const preprocessedPattern = configUtils.getConfig('data.preprocessedPattern');
      const fileName = preprocessedPattern.replace('{commodity}', commodity);
      const filePath = getDataPath(fileName);

      monitoringSystem.log(`Loading preprocessed data from ${filePath}`, {}, 'loadPreprocessedData');

      const preprocessedData = await preprocessedDataManager.loadPreprocessedData(filePath);
      monitoringSystem.log(`Preprocessed data loaded for ${commodity}`, {}, 'loadPreprocessedData');
      return preprocessedData;
    } catch (error) {
      monitoringSystem.error(`Error loading preprocessed data for ${commodity}.`, error, 'loadPreprocessedData');
      throw error;
    }
  }

  /**
   * Load time varying flows data for a specific commodity.
   *
   * @param {string} commodity - The commodity name.
   * @returns {Array} - The time varying flows data.
   */
  async loadTimeVaryingFlows(commodity) {
    const metric = monitoringSystem.startMetric('load-time-varying-flows');
    try {
      const fileName = configUtils.getConfig('data.files.timeVaryingFlows');
      const filePath = getDataPath(fileName);
      const response = await fetch(filePath);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
      }

      const text = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const filteredData = results.data.filter(row =>
              row.commodity?.toLowerCase() === commodity.toLowerCase()
            );
            monitoringSystem.log(`Time varying flows data parsed for ${commodity}`, {}, 'loadTimeVaryingFlows');
            resolve(filteredData);
          },
          error: (err) => {
            monitoringSystem.error(`PapaParse error for ${fileName}: ${err.message}`, err, 'loadTimeVaryingFlows');
            reject(err);
          }
        });
      });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error(`Error loading time varying flows for ${commodity}.`, error, 'loadTimeVaryingFlows');
      throw error;
    }
  }

  /**
   * Load TV-MII data for a specific commodity.
   *
   * @param {string} commodity - The commodity name.
   * @returns {Array} - The TV-MII results.
   */
  async loadTVMIIData(commodity) {
    const metric = monitoringSystem.startMetric('load-tvmii-data');
    try {
      const fileName = configUtils.getConfig('data.files.tvMiiResults');
      const filePath = getDataPath(fileName);
      const marketResults = await this.loadJSONFile(filePath);
      const filteredResults = marketResults.filter(item =>
        item.commodity?.toLowerCase() === commodity.toLowerCase()
      );
      monitoringSystem.log(`TV-MII data loaded for ${commodity}`, {}, 'loadTVMIIData');
      return filteredResults;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error(`Error loading TV-MII data for ${commodity}.`, error, 'loadTVMIIData');
      throw error;
    }
  }

  /**
   * Load price differentials data for a specific commodity.
   *
   * @param {string} commodity - The commodity name.
   * @returns {Object} - The price differentials data.
   */
  async loadPriceDifferentials(commodity) {
    const metric = monitoringSystem.startMetric('load-price-differentials');
    try {
      const fileName = configUtils.getConfig('data.files.priceDifferentials');
      const filePath = getDataPath(fileName);
      const data = await this.loadJSONFile(filePath);

      const filteredData = {};
      Object.entries(data.markets || {}).forEach(([market, marketData]) => {
        const commodityResults = marketData.commodity_results[commodity];
        if (commodityResults) {
          filteredData[market] = {
            commodity_results: {
              [commodity]: commodityResults
            }
          };
        }
      });

      monitoringSystem.log(`Price differentials data loaded for ${commodity}`, {}, 'loadPriceDifferentials');
      return filteredData;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error(`Error loading price differentials for ${commodity}.`, error, 'loadPriceDifferentials');
      throw error;
    }
  }

  /**
   * Load ECM analysis data for a specific commodity.
   *
   * @param {string} commodity - The commodity name.
   * @returns {Object} - The ECM data.
   */
  async loadECMData(commodity) {
    const metric = monitoringSystem.startMetric('load-ecm-data');
    try {
      const ecmNorthSouthFile = configUtils.getConfig('data.files.ecmNorthSouth');
      const ecmSouthNorthFile = configUtils.getConfig('data.files.ecmSouthNorth');
      const northToSouthPath = getDataPath(ecmNorthSouthFile);
      const southToNorthPath = getDataPath(ecmSouthNorthFile);

      const [northToSouth, southToNorth] = await Promise.all([
        this.loadJSONFile(northToSouthPath),
        this.loadJSONFile(southToNorthPath)
      ]);

      const filteredNorthToSouth = northToSouth.filter(item =>
        item.commodity?.toLowerCase() === commodity.toLowerCase()
      );
      const filteredSouthToNorth = southToNorth.filter(item =>
        item.commodity?.toLowerCase() === commodity.toLowerCase()
      );

      monitoringSystem.log(`ECM data loaded for ${commodity}`, {}, 'loadECMData');
      return {
        northToSouth: filteredNorthToSouth,
        southToNorth: filteredSouthToNorth
      };
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error(`Error loading ECM data for ${commodity}.`, error, 'loadECMData');
      throw error;
    }
  }

  /**
   * Load enhanced unified data for a specific commodity and date.
   *
   * @param {string} commodity - The commodity name.
   * @param {string} [date] - The specific date for data filtering.
   * @returns {Object} - The enhanced unified data.
   */
  async loadEnhancedUnifiedData(commodity, date) {
    const metric = monitoringSystem.startMetric('load-enhanced-unified');
    try {
      const fileName = configUtils.getConfig('data.files.enhancedUnified');
      const filePath = getDataPath(fileName);
      const response = await fetch(filePath);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
      }

      const text = await response.text();
      const data = JSON.parse(text);

      // Filter features by commodity and date
      data.features = data.features.filter(feature => {
        const props = feature.properties;
        return props.commodity?.toLowerCase() === commodity.toLowerCase() &&
               (!date || props.date === date);
      });

      monitoringSystem.log(`Enhanced unified data loaded for ${commodity} on ${date}`, {}, 'loadEnhancedUnifiedData');
      return data;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      monitoringSystem.error(`Error loading enhanced unified data for ${commodity} on ${date}.`, error, 'loadEnhancedUnifiedData');
      throw error;
    }
  }

  /**
   * Process and integrate all loaded data sources into a unified structure.
   *
   * @param {Object} data - The loaded data from various sources.
   * @param {string} [date] - The specific date for data filtering.
   * @param {Object} [options={}] - Additional options for data processing.
   * @returns {Object} - The integrated and processed data.
   */
  async processIntegratedData(data, date, options = {}) {
    const {
      preprocessedData,
      timeVaryingFlows,
      tvMiiResults,
      priceDifferentials,
      ecmData,
      enhancedUnified
    } = data;

    try {
      // If date filtering is needed, it should have been handled during data loading
      // Combine preprocessed and enhanced data
      const integratedData = {
        timeSeriesData: preprocessedData.timeSeriesData,
        marketClusters: preprocessedData.marketClusters,
        flowAnalysis: preprocessedData.flowAnalysis,
        spatialAutocorrelation: preprocessedData.spatialAutocorrelation,
        seasonalAnalysis: preprocessedData.seasonalAnalysis,
        marketIntegration: preprocessedData.marketIntegration,
        tvmii: {
          marketResults: tvMiiResults,
          analysis: this.processTVMIIAnalysis(tvMiiResults)
        },
        priceDifferentials: {
          raw: priceDifferentials,
          analysis: this.processPriceDifferentials(priceDifferentials)
        },
        ecm: {
          northToSouth: ecmData.northToSouth,
          southToNorth: ecmData.southToNorth,
          analysis: this.processECMResults(ecmData)
        },
        enhancedSpatial: enhancedUnified,
        metadata: {
          ...preprocessedData.metadata,
          processedAt: new Date().toISOString(),
          options
        }
      };

      monitoringSystem.log('Data integration complete.', integratedData, 'processIntegratedData');
      return integratedData;
    } catch (error) {
      monitoringSystem.error('Error during data integration.', error, 'processIntegratedData');
      throw error;
    }
  }

  /**
   * Process TV-MII analysis results.
   *
   * @param {Array} tvMiiResults - The TV-MII results data.
   * @returns {Array} - The processed TV-MII analysis.
   */
  processTVMIIAnalysis(tvMiiResults) {
    try {
      // Group by market pair
      const marketPairResults = _.groupBy(tvMiiResults, 'market_pair');

      const processedAnalysis = Object.entries(marketPairResults).map(([pair, results]) => {
        const pValueThreshold = configUtils.getConfig('spatial.analysis.pValueThreshold');
        const timeSeriesMetrics = results.map(r => ({
          date: r.date,
          tvmii: r.tv_mii,
          significance: r.p_value < pValueThreshold
        }));

        return {
          marketPair: pair,
          timeSeriesMetrics,
          summary: {
            averageIntegration: _.meanBy(results, 'tv_mii'),
            significantPeriods: results.filter(r => r.p_value < pValueThreshold).length,
            totalPeriods: results.length
          }
        };
      });

      monitoringSystem.log('TV-MII analysis processed.', processedAnalysis, 'processTVMIIAnalysis');
      return processedAnalysis;
    } catch (error) {
      monitoringSystem.error('Error processing TV-MII analysis.', error, 'processTVMIIAnalysis');
      throw error;
    }
  }

  /**
   * Process price differentials analysis.
   *
   * @param {Object} priceDiffs - The price differentials data.
   * @returns {Object} - The processed price differentials analysis.
   */
  processPriceDifferentials(priceDiffs) {
    try {
      const processedDiffs = {};
      Object.entries(priceDiffs).forEach(([market, data]) => {
        const commodityResults = data.commodity_results;
        Object.entries(commodityResults).forEach(([commodity, results]) => {
          if (!processedDiffs[market]) {
            processedDiffs[market] = {};
          }
          processedDiffs[market][commodity] = this.processMarketPairDiffs(results);
        });
      });
      monitoringSystem.log('Price differentials analysis processed.', processedDiffs, 'processPriceDifferentials');
      return processedDiffs;
    } catch (error) {
      monitoringSystem.error('Error processing price differentials.', error, 'processPriceDifferentials');
      throw error;
    }
  }

  /**
   * Process ECM results.
   *
   * @param {Object} ecmData - The ECM data.
   * @returns {Object} - The processed ECM analysis.
   */
  processECMResults(ecmData) {
    try {
      const northToSouthAnalysis = this.processDirectionalECM(ecmData.northToSouth);
      const southToNorthAnalysis = this.processDirectionalECM(ecmData.southToNorth);
      const comparison = this.compareDirectionalResults(ecmData.northToSouth, ecmData.southToNorth);

      const processedECM = {
        northToSouth: northToSouthAnalysis,
        southToNorth: southToNorthAnalysis,
        comparison
      };

      monitoringSystem.log('ECM analysis processed.', processedECM, 'processECMResults');
      return processedECM;
    } catch (error) {
      monitoringSystem.error('Error processing ECM results.', error, 'processECMResults');
      throw error;
    }
  }

  /**
   * Helper method to process market pair differentials.
   *
   * @param {Array} results - The market pair differential results.
   * @returns {Object} - The processed market pair differentials.
   */
  processMarketPairDiffs(results) {
    try {
      const processed = results.map(result => ({
        source: result.source,
        target: result.target,
        flowWeight: result.flow_weight,
        priceDifferential: result.price_differential,
        significance: result.p_value < configUtils.getConfig('spatial.analysis.pValueThreshold')
      }));

      const summary = {
        averageDifferential: _.meanBy(processed, 'priceDifferential'),
        significantDifferences: processed.filter(r => r.significance).length,
        totalDifferences: processed.length
      };

      return { processed, summary };
    } catch (error) {
      monitoringSystem.error('Error processing market pair differentials.', error, 'processMarketPairDiffs');
      throw error;
    }
  }

  /**
   * Helper method to process directional ECM data.
   *
   * @param {Array} data - The ECM data for a specific direction.
   * @returns {Object} - The processed directional ECM data.
   */
  processDirectionalECM(data) {
    try {
      const analysis = data.map(entry => ({
        commodity: entry.commodity,
        direction: entry.direction,
        ecmValue: entry.ecm_value,
        significance: entry.p_value < configUtils.getConfig('spatial.analysis.pValueThreshold')
      }));

      const summary = {
        averageECM: _.meanBy(analysis, 'ecmValue'),
        significantECM: analysis.filter(a => a.significance).length,
        totalEntries: analysis.length
      };

      return { analysis, summary };
    } catch (error) {
      monitoringSystem.error('Error processing directional ECM data.', error, 'processDirectionalECM');
      throw error;
    }
  }

  /**
   * Helper method to compare ECM results between two directions.
   *
   * @param {Array} northToSouth - ECM data from north to south.
   * @param {Array} southToNorth - ECM data from south to north.
   * @returns {Object} - The comparison analysis.
   */
  compareDirectionalResults(northToSouth, southToNorth) {
    try {
      const comparison = {
        northToSouth: {
          averageECM: _.meanBy(northToSouth, 'ecm_value'),
          significantECM: northToSouth.filter(r => r.p_value < configUtils.getConfig('spatial.analysis.pValueThreshold')).length
        },
        southToNorth: {
          averageECM: _.meanBy(southToNorth, 'ecm_value'),
          significantECM: southToNorth.filter(r => r.p_value < configUtils.getConfig('spatial.analysis.pValueThreshold')).length
        },
        differenceInAverages: _.meanBy(northToSouth, 'ecm_value') - _.meanBy(southToNorth, 'ecm_value'),
        totalDifferenceInSignificantECM: northToSouth.filter(r => r.p_value < configUtils.getConfig('spatial.analysis.pValueThreshold')).length -
                                           southToNorth.filter(r => r.p_value < configUtils.getConfig('spatial.analysis.pValueThreshold')).length
      };

      monitoringSystem.log('ECM directional comparison completed.', comparison, 'compareDirectionalResults');
      return comparison;
    } catch (error) {
      monitoringSystem.error('Error comparing directional ECM results.', error, 'compareDirectionalResults');
      throw error;
    }
  }

  /**
   * Load a JSON file with caching and retry logic.
   *
   * @param {string} filePath - The path to the JSON file.
   * @returns {Object} - The parsed JSON data.
   */
  async loadJSONFile(filePath) {
    if (this.jsonCache.has(filePath)) {
      monitoringSystem.log(`JSON cache hit for ${filePath}`, {}, 'loadJSONFile');
      return this.jsonCache.get(filePath);
    }

    const RETRY_ATTEMPTS = configUtils.getConfig('data.retry.attempts') || 3;
    const RETRY_DELAY = configUtils.getConfig('data.retry.delay') || 1000; // in ms

    try {
      const data = await this.limit(async () => {
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
          try {
            const response = await fetch(filePath);
            if (!response.ok) {
              throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
            }
            const data = await response.json();
            this.jsonCache.set(filePath, data);
            monitoringSystem.log(`JSON data loaded and cached for ${filePath}`, {}, 'loadJSONFile');
            return data;
          } catch (error) {
            if (attempt < RETRY_ATTEMPTS) {
              monitoringSystem.warn(`Attempt ${attempt} failed for ${filePath}: ${error.message}. Retrying in ${RETRY_DELAY}ms...`, {}, 'loadJSONFile');
              await this.delay(RETRY_DELAY);
            } else {
              monitoringSystem.error(`All ${RETRY_ATTEMPTS} attempts failed for ${filePath}.`, error, 'loadJSONFile');
              throw error;
            }
          }
        }
      });

      return data;
    } catch (error) {
      monitoringSystem.error(`Error loading JSON file at ${filePath}.`, error, 'loadJSONFile');
      throw error;
    }
  }

  /**
   * Generate a cache key based on commodity, date, and cache version.
   *
   * @param {string} commodity - The commodity name.
   * @param {string} [date] - The specific date.
   * @returns {string} - The generated cache key.
   */
  generateCacheKey(commodity, date) {
    const cacheVersion = configUtils.getConfig('cache.version');
    return `${commodity}_${date || 'latest'}_${cacheVersion}`;
  }

  /**
   * Retrieve cached data based on the provided key.
   *
   * @param {string} key - The cache key.
   * @returns {any} - The cached data or undefined if not found.
   */
  getCachedData(key) {
    return this.cache.get(key);
  }

  /**
   * Cache the processed data with the specified key.
   *
   * @param {string} key - The cache key.
   * @param {any} data - The data to cache.
   */
  setCachedData(key, data) {
    this.cache.set(key, data);
  }

  /**
   * Clear all caches, including unified and JSON caches.
   */
  clearCache() {
    this.cache.clear();
    this.jsonCache.clear();
    preprocessedDataManager.clearCache();
    monitoringSystem.log('All caches cleared.', {}, 'clearCache');
  }

  /**
   * Get statistics about the current cache state.
   *
   * @returns {Object} - An object containing cache statistics.
   */
  getCacheStats() {
    return {
      unified: {
        size: this.cache.size,
        keys: Array.from(this.cache.keys())
      },
      json: {
        size: this.jsonCache.size,
        keys: Array.from(this.jsonCache.keys())
      },
      preprocessed: preprocessedDataManager.getCacheStats()
    };
  }

  /**
   * Utility method to introduce a delay.
   *
   * @param {number} ms - Milliseconds to delay.
   * @returns {Promise} - A promise that resolves after the specified delay.
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const unifiedDataManager = new UnifiedDataManager();