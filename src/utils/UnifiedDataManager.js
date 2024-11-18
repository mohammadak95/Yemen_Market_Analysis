// src/utils/UnifiedDataManager.js

import Papa from 'papaparse';
import _ from 'lodash';
import pLimit from 'p-limit';
import { monitoringSystem } from './MonitoringSystem';
import { preprocessedDataManager } from './PreprocessedDataManager';
import { configUtils } from './systemConfig';
import { getDataPath } from './dataUtils';
import { constructDataPath } from './DataLoader';

/**
 * UnifiedDataManager is responsible for loading, caching, and processing
 * various data sources related to commodities. It ensures efficient data
 * retrieval and integration, leveraging a centralized monitoring system
 * for performance tracking and error handling.
 */
class UnifiedDataManager {
  constructor() {
    this._isInitialized = false;
    this.cache = new Map();
    this.jsonCache = new Map();
    
    // Enhanced configuration
    this.config = {
        batchSize: 1000,
        retryAttempts: 3,
        retryDelay: 1000,
        concurrencyLimit: 5,
        cacheTimeout: 30 * 60 * 1000 // 30 minutes
    };

    this.limit = pLimit(this.config.concurrencyLimit);
    this.pendingRequests = new Map();
}

  /**
   * Initialize the data manager and its dependencies.
   * This method must be called before any data loading operations.
   */
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

  /**
   * Add statistics to the cache stats.
   *
   * @param {string} key - The cache key.
   * @param {Object} stats - The statistics to add.
   */
  addToCacheStats(key, stats) {
    const currentStats = this.getCacheStats();
    currentStats[key] = stats;
    monitoringSystem.log(`Cache stats updated for key: ${key}`, stats, 'addToCacheStats');
  }

  /**
   * Process items in batches.
   *
   * @param {Array} items - The items to process.
   * @param {Function} processor - The processor function to apply to each item.
   * @param {number} [batchSize=this.config.batchSize] - The size of each batch.
   * @returns {Array} - The processed results.
   */
  async processBatch(items, processor, batchSize = this.config.batchSize) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
    }
    return results;
  }

  /**
   * Load all required data for a specific commodity and date.
   * This includes preprocessed data, time-varying flows, TV-MII results,
   * price differentials, ECM data, and enhanced unified data.
   *
   * @param {string} commodity - The commodity name.
   * @param {string} [date] - The specific date for data filtering.
   * @param {Object} [options={}] - Additional options for data processing.
   * @returns {Object} - The integrated and processed data.
   */
  async loadSpatialData(commodity, date, options = {}) {
    if (!this._isInitialized) {
        throw new Error('UnifiedDataManager must be initialized first.');
    }

    const metric = monitoringSystem.startMetric('load-spatial-data');
    const cacheKey = this.generateCacheKey(commodity, date);

    try {
        // Check cache first
        const cachedData = this.getCachedData(cacheKey);
        if (cachedData) {
            metric.finish({ status: 'success', cached: true });
            return cachedData;
        }

        // Load all data in parallel with batching
        const [
            preprocessedData,
            timeVaryingFlows,
            tvMiiResults,
            priceDifferentials,
            ecmData,
            enhancedUnified
        ] = await this.processBatch([
            () => this.loadPreprocessedData(commodity),
            () => this.loadTimeVaryingFlows(commodity),
            () => this.loadTVMIIData(commodity),
            () => this.loadPriceDifferentials(commodity),
            () => this.loadECMData(commodity),
            () => this.loadEnhancedUnifiedData(commodity, date)
        ], processor => processor());

        const processedData = await this.processIntegratedData({
            preprocessedData,
            timeVaryingFlows,
            tvMiiResults,
            priceDifferentials,
            ecmData,
            enhancedUnified
        }, date, options);

        this.setCachedData(cacheKey, processedData);
        
        metric.finish({ status: 'success', cached: false });
        return processedData;

    } catch (error) {
        metric.finish({ status: 'error', error: error.message });
        monitoringSystem.error(`Failed to load spatial data for ${commodity} on ${date}.`, error);
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
      monitoringSystem.log(`Loading preprocessed data for commodity: ${commodity}`, {}, 'loadPreprocessedData');

      const preprocessedData = await preprocessedDataManager.loadPreprocessedData(commodity);
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
    const cacheKey = `flows_${commodity}`;

    try {
        // Check for pending request
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // Check cache
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        const request = (async () => {
            const fileName = configUtils.getConfig('data.files.timeVaryingFlows');
            const filePath = constructDataPath(fileName);

            const response = await fetch(filePath, {
                headers: {
                    'Accept': 'text/csv',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

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
                        
                        // Cache the results
                        this.cache.set(cacheKey, filteredData);
                        monitoringSystem.log(`Time varying flows data parsed for ${commodity}`, {
                            rowCount: filteredData.length
                        }, 'loadTimeVaryingFlows');
                        
                        resolve(filteredData);
                    },
                    error: (err) => reject(err)
                });
            });
        })();

        this.pendingRequests.set(cacheKey, request);
        const result = await request;
        this.pendingRequests.delete(cacheKey);

        metric.finish({ status: 'success' });
        return result;

    } catch (error) {
        this.pendingRequests.delete(cacheKey);
        metric.finish({ status: 'error', error: error.message });
        monitoringSystem.error(`Error loading time varying flows for ${commodity}.`, error);
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
      const tvMmiData = await this.loadJSONFile(filePath);

      // Filter by commodity
      const filteredResults = tvMmiData.filter(item =>
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
    // Combine preprocessed and enhanced data
    const integratedData = {
      timeSeriesData: preprocessedData.timeSeriesData,
      marketClusters: preprocessedData.marketClusters,
      flowAnalysis: preprocessedData.flowAnalysis,
      spatialAutocorrelation: preprocessedData.spatialAutocorrelation,
      seasonalAnalysis: preprocessedData.seasonalAnalysis,
      marketIntegration: preprocessedData.marketIntegration,
      timeVaryingFlows: timeVaryingFlows, // Added line
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
      const pValueThreshold = configUtils.getConfig('spatial.analysis.pValueThreshold');

      const processed = results.map(result => ({
        priceDifferential: {
          dates: result.price_differential.dates,
          values: result.price_differential.values
        },
        diagnostics: result.diagnostics,
        regressionResults: result.regression_results,
        significance: result.regression_results.p_value < pValueThreshold
      }));

      const summary = {
        averageDifferential: _.meanBy(processed, item => _.mean(item.priceDifferential.values)),
        significantDifferences: processed.filter(item => item.significance).length,
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
      const processed = data.map(entry => ({
        commodity: entry.commodity,
        direction: entry.direction,
        alpha: entry.alpha,
        irf: entry.irf,
        diagnostics: entry.diagnostics,
        moranI: entry.moran_i,
        significance: entry.moran_i.p_value < configUtils.getConfig('spatial.analysis.pValueThreshold')
      }));

      const summary = {
        averageAlpha: _.meanBy(processed, 'alpha'),
        significantMoranI: processed.filter(r => r.significance).length,
        totalEntries: processed.length
      };

      return { processed, summary };
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
      const pValueThreshold = configUtils.getConfig('spatial.analysis.pValueThreshold');

      const northToSouthSignificant = northToSouth.filter(r => r.moran_i.p_value < pValueThreshold).length;
      const southToNorthSignificant = southToNorth.filter(r => r.moran_i.p_value < pValueThreshold).length;

      const comparison = {
        northToSouth: {
          averageAlpha: _.meanBy(northToSouth, 'alpha'),
          significantMoranI: northToSouthSignificant,
          totalEntries: northToSouth.length
        },
        southToNorth: {
          averageAlpha: _.meanBy(southToNorth, 'alpha'),
          significantMoranI: southToNorthSignificant,
          totalEntries: southToNorth.length
        },
        differenceInAverages: _.meanBy(northToSouth, 'alpha') - _.meanBy(southToNorth, 'alpha'),
        totalSignificantDifferences: northToSouthSignificant - southToNorthSignificant
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
    if (this.cache.size === 0 && this.jsonCache.size === 0) return;
    this.cache.clear();
    this.jsonCache.clear();
    monitoringSystem.log('Cache cleared', {
      previousSize: this.cache.size + this.jsonCache.size
    });
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

  /**
   * Cleanup expired entries from the cache.
   */
  async cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTimeout) {
        this.cache.delete(key);
      }
    }
    for (const [key, entry] of this.jsonCache.entries()) {
      if (now - entry.timestamp > this.config.cacheTimeout) {
        this.jsonCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const unifiedDataManager = new UnifiedDataManager();