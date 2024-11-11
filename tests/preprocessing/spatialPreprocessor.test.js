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

describe('EnhancedSpatialPreprocessor', () => {
  let preprocessor;
  let mockData;
  let tempDir;

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
        mockData.timeSeriesData.sanaa.wheat,
        { sanaa: { neighbors: ['aden'], weights: [1] } }
      );
      expect(result).toHaveProperty('I');
      expect(result).toHaveProperty('pValue');
      expect(result.I).toBeDefined();
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
        'wheat'
      );
      expect(transmission).toHaveProperty('marketPairs');
      expect(transmission).toHaveProperty('directTransmission');
      expect(transmission).toHaveProperty('transmissionSpeed');
    });
  });

  describe('Visualization Processing', () => {
    test('should prepare choropleth data', () => {
      const choropleth = preprocessor.preparePriceChoropleth(
        mockData.geoData,
        mockData.timeSeriesData.sanaa.wheat
      );
      expect(choropleth).toHaveProperty('type', 'FeatureCollection');
      expect(choropleth.features[0].properties).toHaveProperty('styleProperties');
    });

    test('should process flows for visualization', () => {
      const visualFlows = preprocessor.processFlowsForVisualization(
        mockData.flowData
      );
      expect(visualFlows).toHaveProperty('flows');
      expect(visualFlows).toHaveProperty('aggregates');
      expect(visualFlows.flows[0]).toHaveProperty('properties.style');
    });
  });

  describe('Full Processing Pipeline', () => {
    test('should process all data successfully', async () => {
      const inputPaths = {
        geoDataPath: path.join(tempDir, 'geo.json'),
        flowsPath: path.join(tempDir, 'flows.json'),
        timeSeriesPath: path.join(tempDir, 'timeSeries.json'),
        outputDir: path.join(tempDir, 'output')
      };

      const startTime = performance.now();
      const result = await preprocessor.processAll(inputPaths);
      const duration = performance.now() - startTime;

      expect(result).toHaveProperty('base');
      expect(result).toHaveProperty('derived');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('visualization');

      // Check processing time
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify output files
      expect(await fs.pathExists(path.join(tempDir, 'output'))).toBe(true);
    });

    test('should handle large datasets efficiently', async () => {
      // Generate large mock dataset
      const largeData = generateLargeMockData(1000); // 1000 features
      await fs.writeJson(path.join(tempDir, 'large-geo.json'), largeData.geoData);

      const startTime = performance.now();
      const result = await preprocessor.processAll({
        ...inputPaths,
        geoDataPath: path.join(tempDir, 'large-geo.json')
      });
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

      await expect(
        preprocessor.processAll({
          ...inputPaths,
          geoDataPath: path.join(tempDir, 'corrupt.json')
        })
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

// Helper function to generate large mock datasets
function generateLargeMockData(featureCount) {
  const features = [];
  for (let i = 0; i < featureCount; i++) {
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
        region_id: `region_${i}`,
        name: `Region ${i}`
      }
    });
  }

  return {
    geoData: {
      type: 'FeatureCollection',
      features
    }
  };
}