// scripts/runBuild.js

const path = require('path');
const buildSpatialData = require('./build');
const fs = require('fs-extra');
const yargs = require('yargs');
const { performance } = require('perf_hooks');

// Performance monitoring
class BuildMonitor {
  constructor() {
    this.startTime = performance.now();
    this.steps = new Map();
    this.currentStep = null;
  }

  startStep(name) {
    this.currentStep = name;
    this.steps.set(name, performance.now());
    console.log(`Starting step: ${name}`);
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

// Build configurations
const BUILD_MODES = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  FAST: 'fast',
  MEMORY_OPTIMIZED: 'memory-optimized',
  PERFORMANCE: 'performance'
};

const BUILD_CONFIGS = {
  [BUILD_MODES.DEVELOPMENT]: {
    cache: {
      enabled: true,
      directory: '.cache',
      maxAge: 1 * 60 * 60 * 1000 // 1 hour
    },
    optimization: {
      parallelization: true,
      chunkSize: 500,
      memoryLimit: 512 * 1024 * 1024, // 512MB
      workers: 2
    },
    monitoring: {
      enabled: true,
      logLevel: 'debug',
      performanceMetrics: true
    }
  },
  [BUILD_MODES.PRODUCTION]: {
    cache: {
      enabled: true,
      directory: '.cache',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    optimization: {
      parallelization: true,
      chunkSize: 1000,
      memoryLimit: 1024 * 1024 * 1024, // 1GB
      workers: 'auto'
    },
    monitoring: {
      enabled: true,
      logLevel: 'info',
      performanceMetrics: true
    }
  },
  [BUILD_MODES.FAST]: {
    cache: {
      enabled: true,
      directory: '.cache',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    optimization: {
      parallelization: true,
      chunkSize: 2000,
      memoryLimit: 2048 * 1024 * 1024, // 2GB
      workers: 'max'
    },
    monitoring: {
      enabled: false,
      logLevel: 'warn',
      performanceMetrics: false
    }
  },
  [BUILD_MODES.MEMORY_OPTIMIZED]: {
    cache: {
      enabled: true,
      directory: '.cache',
      maxAge: 24 * 60 * 60 * 1000
    },
    optimization: {
      parallelization: true,
      chunkSize: 250,
      memoryLimit: 256 * 1024 * 1024, // 256MB
      workers: 1
    },
    monitoring: {
      enabled: true,
      logLevel: 'info',
      performanceMetrics: true
    }
  },
  [BUILD_MODES.PERFORMANCE]: {
    cache: {
      enabled: false,
      directory: '.cache',
      maxAge: 0
    },
    optimization: {
      parallelization: true,
      chunkSize: 5000,
      memoryLimit: 4096 * 1024 * 1024, // 4GB
      workers: 'max'
    },
    monitoring: {
      enabled: true,
      logLevel: 'debug',
      performanceMetrics: true
    }
  }
};

async function runBuild(options) {
  console.log('Starting build with options:', options);
  
  const buildConfig = {
    ...BUILD_CONFIGS[options.mode],
    ...options.config
  };

  // Create monitor instance
  const monitor = new BuildMonitor();
  monitor.startStep('Build Setup');

  try {
    // Ensure output directory exists
    await fs.ensureDir(options.outputDir);

    // Ensure cache directory exists
    await fs.ensureDir(path.join(options.outputDir, '../.cache'));

    // Save build configuration
    await fs.writeJson(
      path.join(options.outputDir, 'build-config.json'),
      buildConfig,
      { spaces: 2 }
    );

    monitor.endStep('Build Setup');
    monitor.startStep('Data Processing');

    // Run build with monitoring
    const result = await buildSpatialData({
      ...buildConfig,
      inputPaths: options.inputPaths,
      outputDir: options.outputDir,
      monitor
    });

    monitor.endStep('Data Processing');

    // Record final stats
    const duration = monitor.getTotalTime();
    const buildStats = {
      duration,
      steps: Array.from(monitor.steps.entries()),
      memory: process.memoryUsage()
    };

    await fs.writeJson(
      path.join(options.outputDir, 'build-stats.json'),
      buildStats,
      { spaces: 2 }
    );

    console.log(`Build completed in ${duration}ms`);
    return result;

  } catch (error) {
    monitor.endStep('Failed Build');
    console.error('Build failed:', error);
    
    // Save detailed error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      buildStats: {
        duration: monitor.getTotalTime(),
        steps: Array.from(monitor.steps.entries()),
        lastStep: monitor.currentStep
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage()
      },
      buildConfig
    };

    try {
      await fs.writeJson(
        path.join(options.outputDir, 'build-error-report.json'),
        errorReport,
        { spaces: 2 }
      );
    } catch (writeError) {
      console.error('Failed to write error report:', writeError);
    }

    throw error;
  }
}

// CLI configuration
const argv = yargs
  .option('mode', {
    alias: 'm',
    description: 'Build mode',
    choices: Object.values(BUILD_MODES),
    default: BUILD_MODES.DEVELOPMENT
  })
  .option('output', {
    alias: 'o',
    description: 'Output directory',
    default: './public/data'
  })
  .option('workers', {
    alias: 'w',
    description: 'Number of workers (override config)',
    type: 'number'
  })
  .option('memory-limit', {
    description: 'Memory limit in MB (override config)',
    type: 'number'
  })
  .option('chunk-size', {
    description: 'Processing chunk size (override config)',
    type: 'number'
  })
  .help()
  .argv;

// Run build with CLI arguments
const buildOptions = {
  mode: argv.mode,
  outputDir: path.resolve(argv.output),
  inputPaths: {
    geoDataPath: path.resolve('./results/choropleth_data/geoBoundaries-YEM-ADM1.geojson'),
    flowsPath: path.resolve('./results/network_data/time_varying_flows.csv'),
    weightsPath: path.resolve('./results/spatial_weights/transformed_spatial_weights.json'),
    timeSeriesPath: path.resolve('./results/enhanced_unified_data_with_residual.geojson')
  },
  config: {
    optimization: {
      ...(argv.workers && { workers: argv.workers }),
      ...(argv['memory-limit'] && { memoryLimit: argv['memory-limit'] * 1024 * 1024 }),
      ...(argv['chunk-size'] && { chunkSize: argv['chunk-size'] })
    }
  }
};

if (require.main === module) {
  runBuild(buildOptions)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Build runner failed:', error);
      process.exit(1);
    });
}

module.exports = runBuild;