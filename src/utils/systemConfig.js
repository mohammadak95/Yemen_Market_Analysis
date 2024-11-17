// src/utils/systemConfig.js

export const systemConfig = {
    // Data Management Configuration
    data: {
      preprocessedPattern: 'preprocessed_yemen_market_data_{commodity}.json',
      files: {
        timeVaryingFlows: 'time_varying_flows.csv',
        tvMiiResults: 'tv_mii_market_results.json',
        priceDifferentials: 'price_differential_results.json',
        ecmNorthSouth: 'ecm_results_north_to_south.json',
        ecmSouthNorth: 'ecm_results_south_to_north.json',
        spatialResults: 'spatial_analysis_results.json',
        enhancedUnified: 'enhanced_unified_data_with_residual.geojson',
        geoBoundaries: 'geoBoundaries-YEM-ADM1.geojson',
        spatialWeights: 'transformed_spatial_weights.json'
      },
      batchSize: 1000,
      streamingThreshold: 10000
    },
  
    // Spatial Analysis Configuration
    spatial: {
      analysis: {
        minTimeSeriesLength: 12,
        maxClusterSize: 20,
        minClusterSize: 2,
        flowThreshold: 0.1,
        pValueThreshold: 0.05,
        minCoverage: 0.8
      },
      visualization: {
        modes: {
          PRICES: 'prices',
          FLOWS: 'flows',
          CLUSTERS: 'clusters',
          SHOCKS: 'shocks'
        }
      }
    },
  
    // Cache Configuration
    cache: {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      version: '1.0.0'
    },
  
    // Monitoring Configuration
    monitoring: {
      performance: {
        loadingThreshold: 2000, // 2 seconds
        renderingThreshold: 16, // 16ms (60fps)
        memoryThreshold: 100 * 1024 * 1024 // 100MB
      },
      logging: {
        levels: ['error', 'warn', 'info', 'debug'],
        maxEntries: 1000
      }
    },
  
    // Validation Configuration
    validation: {
      requiredFields: {
        timeSeries: ['date', 'value', 'region'],
        spatial: ['geometry', 'properties'],
        marketPairs: ['source', 'target', 'flow_weight']
      },
      thresholds: {
        minDataPoints: 12,
        maxOutlierDeviation: 3,
        minMarketPairs: 2
      }
    },
  
    // Development Configuration
    development: {
      debug: process.env.NODE_ENV === 'development',
      profiling: process.env.ENABLE_PROFILING === 'true',
      mockData: process.env.USE_MOCK_DATA === 'true'
    }
  };
  
  // Configuration accessor with validation
  export const getConfig = (path) => {
    return path.split('.').reduce((obj, key) => obj?.[key], systemConfig);
  };
  
  // Configuration validator
  export const validateConfig = (config = systemConfig) => {
    const requiredPaths = [
      'data.files',
      'spatial.analysis',
      'cache.maxSize',
      'monitoring.performance',
      'validation.requiredFields'
    ];
  
    const missingPaths = requiredPaths.filter(path => !getConfig(path));
    
    if (missingPaths.length > 0) {
      throw new Error(`Missing required configuration paths: ${missingPaths.join(', ')}`);
    }
  
    return true;
  };
  
  // Export configuration utilities
  export const configUtils = {
    getConfig,
    validateConfig,
    systemConfig
  };