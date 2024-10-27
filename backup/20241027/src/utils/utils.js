// src/utils/utils.js

// ==========================
// Imports
// ==========================
import proj4 from 'proj4';

// ==========================
// Environment Variables
// ==========================
const ENV = process.env.NODE_ENV;
const PUBLIC_URL = process.env.PUBLIC_URL || '';

const isGitHubPages = PUBLIC_URL.includes('github.io');
const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

// ==========================
// Region Mapping and Exclusion
// ==========================
export const regionMapping = {
  'Abyan Governorate': 'abyan',
  '‘Adan Governorate': 'aden',
  "Al Bayda' Governorate": 'al bayda',
  "Ad Dali' Governorate": 'al dhale\'e',
  'Al Hudaydah Governorate': 'al hudaydah',
  'Al Jawf Governorate': 'al jawf',
  'Al Mahrah Governorate': 'al maharah',
  'Al Mahwit Governorate': 'al mahwit',
  'Sanʿaʾ': 'amanat al asimah',
  "'Amran Governorate": 'amran',
  'Dhamar Governorate': 'dhamar',
  'Hadhramaut': 'hadramaut',
  'Hajjah Governorate': 'hajjah',
  'Ibb Governorate': 'ibb',
  'Lahij Governorate': 'lahj',
  "Ma'rib Governorate": 'marib',
  'Raymah Governorate': 'raymah',
  'Sanʿaʾ Governorate': 'sana\'a',
  'Shabwah Governorate': 'shabwah',
  'Socotra': 'socotra',
  "Ta'izz Governorate": 'taizz',
};

export const excludedRegions = ['Sa\'dah Governorate'];

// ==========================
// Projection Definitions
// ==========================
proj4.defs('EPSG:2085', '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +towgs84=-76,-138,67,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:2098', '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs');
const WGS84 = 'EPSG:4326';

// ==========================
// Coordinate Transformation Functions
// ==========================
/**
 * Transforms coordinates from EPSG:2085 to WGS84.
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @returns {Array<number>} - The transformed [longitude, latitude].
 */
export const transformFromEPSG2085 = (x, y) => proj4('EPSG:2085', WGS84, [x, y]);

/**
 * Transforms coordinates from EPSG:2098 to WGS84.
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @returns {Array<number>} - The transformed [longitude, latitude].
 */
export const transformFromEPSG2098 = (x, y) => proj4('EPSG:2098', WGS84, [x, y]);

/**
 * Transforms coordinates to WGS84 from the specified source projection.
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {string} sourceEPSG - The source EPSG code (default is 'EPSG:2085').
 * @returns {Array<number>} - The transformed [longitude, latitude].
 * @throws Will throw an error if the source projection is unsupported.
 */
export const transformToWGS84 = (x, y, sourceEPSG = 'EPSG:2085') => {
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Invalid coordinates: x and y must be numbers');
  }
  switch (sourceEPSG) {
    case 'EPSG:2085':
      return transformFromEPSG2085(x, y);
    case 'EPSG:2098':
      return transformFromEPSG2098(x, y);
    default:
      throw new Error(`Unsupported projection: ${sourceEPSG}`);
  }
};

/**
 * Validates latitude and longitude coordinates.
 *
 * @param {number|string} lat - The latitude value.
 * @param {number|string} lng - The longitude value.
 * @returns {Array<number>|null} - Returns [lat, lng] if valid, otherwise null.
 */
export const validateCoordinates = (lat, lng) => {
  const validLat = parseFloat(lat);
  const validLng = parseFloat(lng);
  if (
    isNaN(validLat) ||
    isNaN(validLng) ||
    validLat < -90 ||
    validLat > 90 ||
    validLng < -180 ||
    validLng > 180
  ) {
    return null;
  }
  return [validLat, validLng];
};

// ==========================
// Data Path Utilities
// ==========================
/**
 * Constructs the data path based on the environment.
 *
 * @param {string} fileName - The relative file name.
 * @returns {string} - The constructed data path.
 */
export function getDataPath(fileName) {
  if (isOffline) {
    return `/results/${fileName}`;
  } else if (isGitHubPages) {
    return `${PUBLIC_URL}/results/${fileName}`;
  } else if (ENV === 'development') {
    return `/results/${fileName}`;
  } else {
    return `/results/${fileName}`;
  }
}

// ==========================
// Fetch JSON Data
// ==========================
/**
 * Fetches JSON data from a given relative URL.
 *
 * @param {string} relativeUrl - The relative URL to fetch.
 * @returns {Promise<Object>} - The fetched JSON data.
 * @throws Will throw an error if the fetch fails or the response is not JSON.
 */
export const fetchJson = async (relativeUrl) => {
  const url = getDataPath(relativeUrl);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Expected JSON, got ${contentType}`);
  }

  return response.json();
};

// ==========================
// JSON to CSV Conversion
// ==========================
/**
 * Converts JSON data to CSV format.
 *
 * @param {Array<Object>} jsonData - The JSON data array.
 * @returns {string} - The CSV formatted string.
 */
export const jsonToCsv = (jsonData) => {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    console.warn('jsonToCsv received an empty or invalid array');
    return '';
  }

  const headers = Object.keys(jsonData[0]);
  const csvRows = [
    headers.join(','), // header row first
    ...jsonData.map(row =>
      headers.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')
    )
  ];
  return csvRows.join('\n');
};

/**
 * Replacer function to handle nested objects in JSON.
 *
 * @param {string} key - The key of the current property.
 * @param {*} value - The value of the current property.
 * @returns {*} - The value to be included in the CSV.
 */
const replacer = (key, value) => {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return value;
};

// ==========================
// Data Processing Utilities
// ==========================
/**
 * Applies seasonal adjustment to the data.
 *
 * @param {Array<Object>} data - The dataset to adjust.
 * @param {Array<string>} selectedRegimes - The regimes to apply adjustments to.
 * @param {number} period - The period for seasonal adjustment (default is 12).
 * @param {boolean} showLocalCurrency - Flag to determine currency type.
 * @returns {Array<Object>} - The seasonally adjusted dataset.
 */
export function applySeasonalAdjustment(
  data,
  selectedRegimes,
  period = 12,
  showLocalCurrency = true
) {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('applySeasonalAdjustment received an empty or invalid array');
    return data; // Return original data if invalid
  }

  // Deep copy of data to avoid mutating original data
  const adjustedData = data.map((d) => ({ ...d }));

  selectedRegimes.forEach((regime) => {
    const priceKey = showLocalCurrency ? 'price' : 'usdprice';

    // Extract prices for the current regime
    const prices = adjustedData
      .filter((d) => d.regime === regime)
      .map((d) => d[priceKey]);

    // Handle cases where prices might be NaN or undefined
    if (prices.some((p) => p === undefined || isNaN(p))) {
      console.warn(`Prices contain undefined or NaN values for regime "${regime}".`);
      return;
    }

    // Calculate the moving average (trend component)
    const trend = movingAverage(prices, period);

    // Detrend the data by subtracting the trend from prices
    const detrended = prices.map((p, i) => p - trend[i]);

    // Compute seasonal component
    const seasonalIndices = computeSeasonalIndices(detrended, period);

    // Apply the seasonal adjustment to the original data
    let index = 0;
    adjustedData.forEach((d) => {
      if (d.regime === regime) {
        d[priceKey] = d[priceKey] - seasonalIndices[index % period];
        index++;
      }
    });
  });

  return adjustedData;
}

/**
 * Computes seasonal indices based on detrended data.
 *
 * @param {Array<number>} detrended - The detrended dataset.
 * @param {number} period - The period for seasonal indices.
 * @returns {Array<number>} - The seasonal indices.
 */
function computeSeasonalIndices(detrended, period) {
  const seasonalSums = Array(period).fill(0);
  const seasonalCounts = Array(period).fill(0);

  detrended.forEach((val, idx) => {
    const seasonIdx = idx % period;
    seasonalSums[seasonIdx] += val;
    seasonalCounts[seasonIdx] += 1;
  });

  return seasonalSums.map((sum, idx) => sum / (seasonalCounts[idx] || 1));
}

/**
 * Calculates the moving average for seasonal adjustment.
 *
 * @param {Array<number>} data - The dataset.
 * @param {number} period - The period for moving average.
 * @returns {Array<number>} - The moving average values.
 */
function movingAverage(data, period) {
  const result = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]); // Not enough data points initially
    } else {
      const subset = data.slice(i - period + 1, i + 1);
      const average = subset.reduce((sum, val) => sum + val, 0) / period;

      // Check for NaN
      if (isNaN(average)) {
        console.warn(`NaN detected in movingAverage at index ${i}`);
        result.push(0); // Or handle as appropriate
      } else {
        result.push(average);
      }
    }
  }

  return result;
}

/**
 * Applies smoothing to the data.
 *
 * @param {Array<Object>} data - The dataset to smooth.
 * @param {Array<string>} selectedRegimes - The regimes to apply smoothing to.
 * @param {number} period - The period for smoothing (default is 6).
 * @param {boolean} showLocalCurrency - Flag to determine currency type.
 * @returns {Array<Object>} - The smoothed dataset.
 */
export function applySmoothing(
  data,
  selectedRegimes,
  period = 6,
  showLocalCurrency = true
) {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('applySmoothing received an empty or invalid array');
    return data; // Return original data if invalid
  }

  // Deep copy of data to avoid mutating original data
  const smoothedData = data.map((d) => ({ ...d }));

  selectedRegimes.forEach((regime) => {
    const priceKey = showLocalCurrency ? 'price' : 'usdprice';

    // Extract prices for the current regime
    const prices = smoothedData
      .filter((d) => d.regime === regime)
      .map((d) => d[priceKey]);

    // Handle cases where prices might be NaN or undefined
    if (prices.some((p) => p === undefined || isNaN(p))) {
      console.warn(`Prices contain undefined or NaN values for regime "${regime}".`);
      return;
    }

    // Apply smoothing
    const smoothedPrices = smoothing(prices, period);

    // Apply smoothed prices back to the data
    let index = 0;
    smoothedData.forEach((d) => {
      if (d.regime === regime) {
        d[priceKey] = smoothedPrices[index];
        index++;
      }
    });
  });

  return smoothedData;
}

/**
 * Smoothing function using a moving average.
 *
 * @param {Array<number>} data - The dataset.
 * @param {number} period - The period for smoothing.
 * @returns {Array<number>} - The smoothed data.
 */
function smoothing(data, period) {
  const result = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]); // Not enough data points initially
    } else {
      const subset = data.slice(i - period + 1, i + 1);
      const average = subset.reduce((sum, val) => sum + val, 0) / period;

      // Check for NaN
      if (isNaN(average)) {
        console.warn(`NaN detected in smoothing at index ${i}`);
        result.push(0); // Or handle as appropriate
      } else {
        result.push(average);
      }
    }
  }

  return result;
}

// ==========================
// Data Processing Function
// ==========================
/**
 * Processes geoJSON data by calculating average price for selected commodity.
 *
 * @param {Object} geoJsonData - The GeoJSON data.
 * @param {Object} enhancedData - The enhanced data features.
 * @param {string} selectedCommodity - The selected commodity to calculate average price.
 * @returns {Object} - The processed GeoJSON data with average prices.
 */
export const processData = (geoJsonData, enhancedData, selectedCommodity) => {
  // Group enhanced data by admin1 and calculate average price for the selected commodity
  const averagePrices = enhancedData.features.reduce((acc, feature) => {
    if (feature.properties.commodity === selectedCommodity) {
      const admin1 = feature.properties.admin1;
      if (!acc[admin1]) {
        acc[admin1] = { sum: 0, count: 0 };
      }
      acc[admin1].sum += feature.properties.price;
      acc[admin1].count += 1;
    }
    return acc;
  }, {});

  // Merge average prices with geoJSON data
  geoJsonData.features.forEach(feature => {
    const admin1 = feature.properties.ADM1_EN;
    if (averagePrices[admin1]) {
      feature.properties.averagePrice = averagePrices[admin1].sum / averagePrices[admin1].count;
    } else {
      feature.properties.averagePrice = 0;
    }
  });

  return geoJsonData;
};

// ==========================
// Merge Spatial Data with Mapping
// ==========================
/**
 * Merges spatial data with mapping and exclusion logic, handling time-series data.
 *
 * @param {Object} geoBoundariesData - The GeoBoundaries GeoJSON data.
 * @param {Object} enhancedData - The enhanced data GeoJSON.
 * @param {Object} regionMapping - The mapping of original shape names to region IDs.
 * @param {Array<string>} excludedRegions - Regions to exclude from merging.
 * @returns {Object} - The merged GeoJSON FeatureCollection.
 */
export const mergeSpatialDataWithMapping = (geoBoundariesData, enhancedData, regionMapping, excludedRegions) => {
  const mergedFeatures = [];
  const unmatchedRegions = new Set();

  // Create a map for geoBoundaries using mapped region_id
  const geoBoundariesMap = new Map();
  geoBoundariesData.features.forEach(feature => {
    const originalShapeName = feature.properties.shapeName;
    const mappedRegionId = regionMapping[originalShapeName]
      ? regionMapping[originalShapeName].toLowerCase()
      : originalShapeName.toLowerCase();

    if (!mappedRegionId) {
      console.warn(`Unable to determine region_id for region: "${originalShapeName}"`);
      return;
    }

    // Exclude specified regions
    if (excludedRegions.map(r => r.toLowerCase()).includes(mappedRegionId)) {
      console.info(`Excluding region: ${originalShapeName}`);
      return;
    }

    geoBoundariesMap.set(mappedRegionId, feature);
  });

  // Iterate over enhancedData features and create separate features per region, commodity, date
  enhancedData.features.forEach((enhancedFeature, index) => {
    const region_id = enhancedFeature.properties.region_id
      ? enhancedFeature.properties.region_id.toLowerCase()
      : null;
    const commodity = enhancedFeature.properties.commodity
      ? enhancedFeature.properties.commodity.toLowerCase()
      : 'unknown';
    const date = enhancedFeature.properties.date
      ? enhancedFeature.properties.date.split('T')[0] // Extract date in YYYY-MM-DD
      : null;

    if (!region_id) {
      console.warn(`Enhanced data feature missing region_id:`, enhancedFeature);
      return;
    }

    if (!geoBoundariesMap.has(region_id)) {
      console.warn(`No geoBoundaries data for region_id: "${region_id}"`);
      unmatchedRegions.add(region_id);
      return;
    }

    const geoBoundaryFeature = geoBoundariesMap.get(region_id);

    // Create a new feature combining geoBoundary properties and enhancedFeature properties
    const mergedProperties = {
      ...geoBoundaryFeature.properties, // Original properties from geoBoundariesData
      ...enhancedFeature.properties, // Properties from enhancedData
      region_id, // Ensure region_id is present and mapped
      commodity, // Ensure commodity is present and mapped
      date, // Ensure date is present and mapped
    };

    // Assign a unique ID if not present
    const uniqueId = `${region_id}_${commodity}_${date}_${index}`;

    mergedFeatures.push({
      type: 'Feature',
      properties: {
        ...mergedProperties,
        id: uniqueId, // Assign unique ID
      },
      geometry: geoBoundaryFeature.geometry, // Use the geometry from geoBoundariesData
    });
  });

  // For regions in geoBoundariesMap that have no enhancedData, create features with empty properties
  geoBoundariesMap.forEach((geoFeature, region_id) => {
    // Check if any enhancedData exists for this region
    const hasData = enhancedData.features.some(feature =>
      feature.properties.region_id &&
      feature.properties.region_id.toLowerCase() === region_id
    );

    if (!hasData) {
      console.warn(`No enhanced data found for region_id: "${region_id}"`);

      // Create a feature with geoBoundary properties and null values for enhanced data
      const uniqueId = `${region_id}_no_data`;

      mergedFeatures.push({
        type: 'Feature',
        properties: {
          ...geoFeature.properties,
          region_id,
          commodity: 'unknown',
          date: null,
          usdprice: null,
          conflict_intensity: null,
          residual: null,
          id: uniqueId,
        },
        geometry: geoFeature.geometry,
      });
    }
  });

  console.warn('Unmatched regions:', Array.from(unmatchedRegions));

  return {
    type: 'FeatureCollection',
    features: mergedFeatures,
  };
};

// ==========================
// String Utilities
// ==========================
/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param {string} str - The input string.
 * @returns {string} - The capitalized string.
 */
export const capitalizeWords = (str) => !str ? '' : str.replace(/\b\w/g, (char) => char.toUpperCase());
