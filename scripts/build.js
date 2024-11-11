// scripts/build.js

const path = require('path');
const EnhancedSpatialPreprocessor = require('./preprocessing/enhancedSpatialPreprocessor');
const fs = require('fs-extra');
const os = require('os');
const cluster = require('cluster');
const { performance } = require('perf_hooks');

// Utility functions for data size calculation
function calculateDataSize(data) {
  try {
    const jsonString = JSON.stringify(data);
    return {
      bytes: Buffer.byteLength(jsonString, 'utf8'),
      formatted: formatBytes(Buffer.byteLength(jsonString, 'utf8')),
      entries: countEntries(data)
    };
  } catch (error) {
    console.error('Error calculating data size:', error);
    return { bytes: 0, formatted: '0 B', entries: 0 };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function countEntries(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  let count = 0;
  
  function recurse(current) {
    if (Array.isArray(current)) {
      count += current.length;
      current.forEach(item => {
        if (typeof item === 'object' && item !== null) recurse(item);
      });
    } else {
      count += Object.keys(current).length;
      Object.values(current).forEach(value => {
        if (typeof value === 'object' && value !== null) recurse(value);
      });
    }
  }
  
  recurse(obj);
  return count;
}

function getTimeRange(timeSeriesData) {
  if (!timeSeriesData || Object.keys(timeSeriesData).length === 0) {
    return { start: null, end: null };
  }

  let minDate = Infinity;
  let maxDate = -Infinity;

  Object.values(timeSeriesData).forEach(series => {
    Object.keys(series).forEach(date => {
      const timestamp = new Date(date).getTime();
      if (timestamp < minDate) minDate = timestamp;
      if (timestamp > maxDate) maxDate = timestamp;
    });
  });

  return {
    start: new Date(minDate).toISOString(),
    end: new Date(maxDate).toISOString()
  };
}

// Performance monitoring
class BuildMonitor {
  constructor() {
    this.startTime = performance.now();
    this.steps = new Map();
  }

  startStep(name) {
    this.steps.set(name, performance.now());
  }

  endStep(name) {
    const startTime = this.steps.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`Step "${name}" completed in ${duration.toFixed(2)}ms`);
      this.steps.delete(name);
      return duration;
    }
    return 0;
  }

  getTotalTime() {
    return performance.now() - this.startTime;
  }
}

function generateDataStats(processedData) {
  const stats = {};
  
  try {
    if (processedData.base) {
      stats.baseDataSize = calculateDataSize(processedData.base);
      stats.commodities = Object.keys(processedData.base.timeSeries || {});
      stats.timeRange = getTimeRange(processedData.base.timeSeries);
      stats.regions = processedData.base.geo?.features?.length || 0;
    }

    if (processedData.derived) {
      stats.derivedDataSize = calculateDataSize(processedData.derived);
      stats.clusters = processedData.derived.marketClusters?.length || 0;
    }

    if (processedData.analysis) {
      stats.analysisDataSize = calculateDataSize(processedData.analysis);
      stats.shocks = Object.values(processedData.analysis.shockAnalysis || {})
        .reduce((total, commodity) => total + (commodity.priceShocks?.length || 0), 0);
    }

    return stats;
  } catch (error) {
    console.error('Error generating data stats:', error);
    return {
      error: 'Failed to generate complete statistics',
      partial: stats
    };
  }
}

async function buildSpatialData() {
  const monitor = new BuildMonitor();
  const numCPUs = os.cpus().length;

  const inputPaths = {
    geoDataPath: path.resolve(__dirname, '../results/choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
    flowsPath: path.resolve(__dirname, '../results/network_data/time_varying_flows.csv'),
    weightsPath: path.resolve(__dirname, '../results/spatial_weights/transformed_spatial_weights.json'),
    timeSeriesPath: path.resolve(__dirname, '../results/enhanced_unified_data_with_residual.geojson'),
    outputDir: path.resolve(__dirname, '../public/data'),
    cacheDir: path.resolve(__dirname, '../.cache')
  };

  const config = {
    cache: {
      enabled: true,
      directory: inputPaths.cacheDir,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    optimization: {
      parallelization: true,
      chunkSize: 1000,
      memoryLimit: Math.floor(os.freemem() * 0.8), // 80% of free memory
      workers: Math.max(1, numCPUs - 1) // Leave one CPU free
    },
    monitoring: {
      enabled: true,
      logLevel: 'info',
      performanceMetrics: true
    }
  };

  try {
    // Ensure directories exist
    monitor.startStep('Directory Setup');
    await Promise.all([
      fs.ensureDir(inputPaths.outputDir),
      fs.ensureDir(inputPaths.cacheDir)
    ]);
    monitor.endStep('Directory Setup');

    // Initialize preprocessor
    monitor.startStep('Preprocessor Initialization');
    const preprocessor = new EnhancedSpatialPreprocessor(config);
    monitor.endStep('Preprocessor Initialization');

    // Process data
    monitor.startStep('Data Processing');
    const processedData = await preprocessor.processAll(inputPaths);
    monitor.endStep('Data Processing');

    // Generate and save metadata
    monitor.startStep('Metadata Generation');
    const stats = generateDataStats(processedData);
    const buildMetadata = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      dataStats: stats,
      performance: {
        totalTime: monitor.getTotalTime(),
        cpusUsed: config.optimization.workers,
        memoryUsed: process.memoryUsage(),
      },
      configuration: {
        parallelization: config.optimization.parallelization,
        chunkSize: config.optimization.chunkSize,
        cacheEnabled: config.cache.enabled
      }
    };

    await fs.writeJson(
      path.join(inputPaths.outputDir, 'build-metadata.json'),
      buildMetadata,
      { spaces: 2 }
    );
    monitor.endStep('Metadata Generation');

    // Clean up old cache files
    monitor.startStep('Cache Cleanup');
    await cleanupCache(inputPaths.cacheDir, config.cache.maxAge);
    monitor.endStep('Cache Cleanup');

    console.log(`Build completed successfully in ${monitor.getTotalTime().toFixed(2)}ms`);
    return processedData;

  } catch (error) {
    console.error('Error during spatial data preprocessing:', error);
    
    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage()
      }
    };

    await fs.writeJson(
      path.join(inputPaths.outputDir, 'build-error-report.json'),
      errorReport,
      { spaces: 2 }
    );

    process.exit(1);
  }
}

async function cleanupCache(cacheDir, maxAge) {
  const files = await fs.readdir(cacheDir);
  const now = Date.now();

  await Promise.all(files.map(async file => {
    const filePath = path.join(cacheDir, file);
    const stats = await fs.stat(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      await fs.unlink(filePath);
      console.log(`Removed cached file: ${file}`);
    }
  }));
}

// Execute build process
if (require.main === module) {
  console.log('Starting spatial data build process...');
  buildSpatialData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Build process failed:', error);
      process.exit(1);
    });
}

module.exports = buildSpatialData;