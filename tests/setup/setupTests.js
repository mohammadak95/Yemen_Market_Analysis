// tests/setup/setupTests.js

const fs = require('fs-extra');
const path = require('path');

// Clean up test directories before running tests
beforeAll(async () => {
  const testTempDir = path.join(__dirname, '../../.temp-test');
  await fs.remove(testTempDir);
});

// Add custom matchers if needed
expect.extend({
  toHaveValidGeoJSON(received) {
    const isValid = typeof received === 'object' &&
      received.type === 'FeatureCollection' &&
      Array.isArray(received.features);

    return {
      message: () => 
        `expected ${received} to be valid GeoJSON`,
      pass: isValid
    };
  }
});

// Increase timeout for long-running tests
jest.setTimeout(30000);