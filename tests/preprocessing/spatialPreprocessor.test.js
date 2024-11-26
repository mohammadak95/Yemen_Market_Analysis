/**
 * @jest-environment node
 */

// tests/preprocessing/spatialPreprocessor.test.js

const path = require('path');
const fs = require('fs-extra');
const EnhancedSpatialPreprocessor = require('../../scripts/preprocessing/enhancedSpatialPreprocessor');
const { performance } = require('perf_hooks');

// Mock data utilities
const generateMockData = () => ({
  geoData: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[44.0, 15.0], [44.1, 15.0], [44.1, 15.1], [44.0, 15.1], [44.0, 15.0]]]
        },
        properties: {
          region_id: 'sanaa',
          name: 'Sanaa'
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[44.2, 15.2], [44.3, 15.2], [44.3, 15.3], [44.2, 15.3], [44.2, 15.2]]]
        },
        properties: {
          region_id: 'aden',
          name: 'Aden'
        }
      }
    ]
  },
  flowData: [
    {
      source: 'sanaa',
      target: 'aden',
      source_lat: 15.0,
      source_lng: 44.0,
      target_lat: 15.2,
      target_lng: 44.2,
      flow_weight: 10,
      price_differential: 5,
      commodity: 'wheat',
      date: '2024-01-01'
    }
  ],
  timeSeriesData: {
    sanaa: {
      wheat: [
        { date: '2024-01-01', price: 100, conflict_intensity: 0.2 },
        { date: '2024-01-02', price: 105, conflict_intensity: 0.3 }
      ]
    },
    aden: {
      wheat: [
        { date: '2024-01-01', price: 95, conflict_intensity: 0.1 },
        { date: '2024-01-02', price: 98, conflict_intensity: 0.2 }
      ]
    }
  }
});

// Helper function to generate large mock datasets
function generateLargeMockData(featureCount) {
  const features = [];
  const flowData = [];
  const timeSeriesData = {};

  for (let i = 0; i < featureCount; i++) {
    const regionId = `region_${i}`;
    
    // Generate features
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[
          44 + Math.random(),
          15 + Math.random(),
          44 + Math.random() + 0.1,
          15 + Math.random() + 0.1,
          44 + Math.random()
        ]]]
      },
      properties: {
        region_id: regionId,
        name: `Region ${i}`
      }
    });

    // Generate flows
    if (i > 0) {
      flowData.push({
        source: `region_${i-1}`,
        target: regionId,
        flow_weight: Math.random() * 10,
        price_differential: Math.random() * 5,
        commodity: 'wheat',
        date: '2024-01-01'
      });
    }

    // Generate time series
    timeSeriesData[regionId] = {
      wheat: [
        { date: '2024-01-01', price: 100 + Math.random() * 10, conflict_intensity: Math.random() },
        { date: '2024-01-02', price: 105 + Math.random() * 10, conflict_intensity: Math.random() }
      ]
    };
  }

  return {
    geoData: {
      type: 'FeatureCollection',
      features
    },
    flowData,
    timeSeriesData
  };
}

describe('EnhancedSpatialPreprocessor', () => {
  let preprocessor;
  let mockData;
  let tempDir;
  let inputPaths;

  beforeAll(async () => {
    // Create temporary directory for test data
    tempDir = path.join(__dirname, '../../.temp-test');
    await fs.ensureDir(tempDir);
    
    // Initialize mock data
    mockData = generateMockData();
    
    // Write mock data files
    await Promise.all([
      fs.writeJson(path.join(tempDir, 'geo.json'), mockData.geoData),
      fs.writeJson(path.join(tempDir, 'flows.json'), mockData.flowData),
      fs.writeJson(path.join(tempDir, 'timeSeries.json'), mockData.timeSeriesData)
    ]);

    // Set up input paths
    inputPaths = {
      geoDataPath: path.join(tempDir, 'geo.json'),
      flowsPath: path.join(tempDir, 'flows.json'),
      timeSeriesPath: path.join(tempDir, 'timeSeries.json'),
      outputDir: path.join(tempDir, 'output')
    };
  });

  beforeEach(() => {
    preprocessor = new EnhancedSpatialPreprocessor({
      cache: {
        enabled: true,
        directory: path.join(tempDir, 'cache'),
        maxAge: 3600000
      },
      optimization: {
        parallelization: true,
        chunkSize: 100,
        memoryLimit: 1024 * 1024 * 100 // 100MB for testing
      },
      monitoring: {
        enabled: true,
        logLevel: 'debug',
        performanceMetrics: true
      }
    });
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  describe('Data Loading', () => {
    test('should load and validate GeoJSON data', async () => {
      const result = await preprocessor.loadGeoData(path.join(tempDir, 'geo.json'));
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(2);
      expect(result.features[0].properties.region_id).toBe('sanaa');
    });

    test('should handle missing or invalid files', async () => {
      await expect(
        preprocessor.loadGeoData('nonexistent.json')
      ).rejects.toThrow();
    });
  });

  describe('Spatial Analysis', () => {
    test('should calculate Moran\'s I correctly', () => {
      const result = preprocessor.calculateMoransI(
        mockData.timeSeriesData.sanaa.wheat.map(d => d.price),
        { sanaa: { neighbors: ['aden'], weights: [1] } }
      );
      expect(typeof result).toBe('object');
      expect(result.I).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
    });

    test('should detect price shocks', () => {
      const shocks = preprocessor.detectPriceShocks(mockData.timeSeriesData.sanaa.wheat);
      expect(Array.isArray(shocks)).toBe(true);
      if (shocks.length > 0) {
        expect(shocks[0]).toHaveProperty('magnitude');
        expect(shocks[0]).toHaveProperty('date');
        expect(shocks[0]).toHaveProperty('type');
      }
    });

    test('should calculate price transmission', () => {
      const transmission = preprocessor.calculatePriceTransmission(
        mockData.flowData,
        mockData.timeSeriesData,
        'wheat'
      );
      expect(typeof transmission).toBe('object');
      expect(transmission.marketPairs).toBeDefined();
      expect(transmission.directTransmission).toBeDefined();
      expect(transmission.transmissionSpeed).toBeDefined();
    });
  });

  describe('Visualization Processing', () => {
    test('should prepare choropleth data', () => {
      const choropleth = preprocessor.preparePriceChoropleth(
        mockData.geoData,
        mockData.timeSeriesData
      );
      expect(choropleth).toBeDefined();
      expect(Array.isArray(choropleth)).toBe(true);
      expect(choropleth[0]).toHaveProperty('region_id');
      expect(choropleth[0]).toHaveProperty('price');
    });

    test('should process flows for visualization', () => {
      const visualFlows = preprocessor.processFlowsForVisualization(
        mockData.flowData
      );
      expect(Array.isArray(visualFlows)).toBe(true);
      if (visualFlows.length > 0) {
        expect(visualFlows[0]).toHaveProperty('source');
        expect(visualFlows[0]).toHaveProperty('target');
        expect(visualFlows[0]).toHaveProperty('weight');
        expect(visualFlows[0]).toHaveProperty('color');
      }
    });
  });

  describe('Full Processing Pipeline', () => {
    test('should process all data successfully', async () => {
      const startTime = performance.now();
      const result = await preprocessor.processAll(inputPaths);
      const duration = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(result.base).toBeDefined();
      expect(result.derived).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.visualization).toBeDefined();

      // Check processing time
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify output files
      expect(await fs.pathExists(path.join(tempDir, 'output'))).toBe(true);
    });

    test('should handle large datasets efficiently', async () => {
      // Generate large mock dataset
      const largeData = generateLargeMockData(1000); // 1000 features
      const largePaths = {
        ...inputPaths,
        geoDataPath: path.join(tempDir, 'large-geo.json'),
        flowsPath: path.join(tempDir, 'large-flows.json'),
        timeSeriesPath: path.join(tempDir, 'large-timeSeries.json')
      };

      await Promise.all([
        fs.writeJson(largePaths.geoDataPath, largeData.geoData),
        fs.writeJson(largePaths.flowsPath, largeData.flowData),
        fs.writeJson(largePaths.timeSeriesPath, largeData.timeSeriesData)
      ]);

      const startTime = performance.now();
      const result = await preprocessor.processAll(largePaths);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      expect(result.base.geo.features).toHaveLength(1000);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle corrupt data gracefully', async () => {
      // Write corrupt GeoJSON
      await fs.writeFile(
        path.join(tempDir, 'corrupt.json'),
        'invalid json content'
      );

      const corruptPaths = {
        ...inputPaths,
        geoDataPath: path.join(tempDir, 'corrupt.json')
      };

      await expect(
        preprocessor.processAll(corruptPaths)
      ).rejects.toThrow();
    });

    test('should recover from memory pressure', async () => {
      // Set very low memory limit
      preprocessor.config.optimization.memoryLimit = 1024 * 10; // 10KB

      const result = await preprocessor.processAll(inputPaths);
      expect(result).toBeDefined();
    });
  });
});
