// src/utils/utils.js

// ==========================
// Imports
// ==========================
import proj4 from 'proj4';
import Papa from 'papaparse';
import { parseISO, isValid as isValidDate, format as formatDate } from 'date-fns';

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
proj4.defs(
  'EPSG:2085',
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +towgs84=-76,-138,67,0,0,0,0 +units=m +no_defs'
);
proj4.defs(
  'EPSG:2098',
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs'
);
const WGS84 = 'EPSG:4326';

// ==========================
// Coordinate Transformation Functions
// ==========================
/**
 * Transforms coordinates from EPSG:2085 to WGS84.
 *
 * @param {number} x - The x-coordinate in EPSG:2085.
 * @param {number} y - The y-coordinate in EPSG:2085.
 * @returns {[number, number]} - The transformed [longitude, latitude] in WGS84.
 * @throws Will throw an error if transformation fails.
 */
export const transformFromEPSG2085 = (x, y) => {
  try {
    return proj4('EPSG:2085', WGS84, [x, y]);
  } catch (error) {
    console.error(`Error transforming from EPSG:2085: ${error.message}`);
    throw error;
  }
};

/**
 * Transforms coordinates from EPSG:2098 to WGS84.
 *
 * @param {number} x - The x-coordinate in EPSG:2098.
 * @param {number} y - The y-coordinate in EPSG:2098.
 * @returns {[number, number]} - The transformed [longitude, latitude] in WGS84.
 * @throws Will throw an error if transformation fails.
 */
export const transformFromEPSG2098 = (x, y) => {
  try {
    return proj4('EPSG:2098', WGS84, [x, y]);
  } catch (error) {
    console.error(`Error transforming from EPSG:2098: ${error.message}`);
    throw error;
  }
};

/**
 * Transforms coordinates to WGS84 from the specified source projection.
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {string} sourceEPSG - The source EPSG code (default is 'EPSG:2085').
 * @returns {[number, number]} - The transformed [longitude, latitude] in WGS84.
 * @throws Will throw an error if the source projection is unsupported or transformation fails.
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
    case WGS84:
      return [y, x]; // Already in WGS84 [lat, lng]
    default:
      throw new Error(`Unsupported projection: ${sourceEPSG}`);
  }
};

/**
 * Validates latitude and longitude coordinates.
 *
 * @param {number|string} lat - The latitude value.
 * @param {number|string} lng - The longitude value.
 * @returns {[number, number]|null} - Returns [latitude, longitude] if valid, otherwise null.
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
    console.warn(`Invalid coordinates received: lat=${lat}, lng=${lng}`);
    return null;
  }
  return [validLat, validLng];
};

// ==========================
// Data Path Utilities
// ==========================
/**
 * Constructs the data path based on the environment.
 * Ensures no double '/results/' in the path.
 *
 * @param {string} fileName - The relative file name.
 * @returns {string} - The constructed data path.
 */
export const getDataPath = (fileName) => {
  // Remove any leading slashes and 'results/' from fileName
  const cleanFileName = fileName.replace(/^\/+/, '').replace(/^results\//, '');
  
  // Construct base path based on environment
  let basePath = '';
  if (isGitHubPages) {
    basePath = PUBLIC_URL;
  }

  // Return the properly constructed path
  return `${basePath}/results/${cleanFileName}`;
};

// ==========================
// Fetch JSON Data
// ==========================
// src/utils/utils.js

/**
 * Fetches JSON data from a given relative URL.
 *
 * @param {string} relativeUrl - The relative URL to fetch.
 * @returns {Promise<Object>} - The fetched JSON data.
 * @throws Will throw an error if the fetch fails or the response is not JSON.
 */
export const fetchJson = async (relativeUrl) => {
  const url = getDataPath(relativeUrl);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} while fetching ${url}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('application/geo+json'))) {
      throw new Error(`Expected JSON, but received ${contentType} from ${url}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching JSON from ${relativeUrl}: ${error.message}`);
    throw error;
  }
};

// ==========================
// JSON to CSV Conversion
// ==========================
/**
 * Converts JSON data to CSV format.
 *
 * @param {Array<Object>} jsonData - The JSON data array.
 * @param {string} [delimiter=','] - Delimiter for the CSV file.
 * @returns {string} - The CSV formatted string.
 */
export const jsonToCsv = (jsonData, delimiter = ',') => {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    console.warn('jsonToCsv received an empty or invalid array');
    return '';
  }

  const headers = Object.keys(jsonData[0]);
  const csvRows = [
    headers.join(delimiter), // header row first
    ...jsonData.map(row =>
      headers.map(fieldName => {
        const value = row[fieldName];
        if (typeof value === 'string') {
          // Escape double quotes by replacing with two double quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(delimiter)
    )
  ];
  return csvRows.join('\n');
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
export const applySeasonalAdjustment = (
  data,
  selectedRegimes,
  period = 12,
  showLocalCurrency = true
) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('applySeasonalAdjustment received an empty or invalid array');
    return data; // Return original data if invalid
  }

  // Deep copy of data to avoid mutating original data
  const adjustedData = data.map((d) => ({ ...d }));

  selectedRegimes.forEach((regime) => {
    const priceKey = showLocalCurrency ? 'price' : 'usdprice';

    // Extract prices for the current regime
    const regimeData = adjustedData.filter((d) => d.regime === regime);
    const prices = regimeData.map((d) => d[priceKey]);

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
    regimeData.forEach((d, idx) => {
      const seasonalAdjustment = seasonalIndices[idx % period];
      d[priceKey] = d[priceKey] - seasonalAdjustment;
    });
  });

  return adjustedData;
};

/**
 * Computes seasonal indices based on detrended data.
 *
 * @param {Array<number>} detrended - The detrended dataset.
 * @param {number} period - The period for seasonal indices.
 * @returns {Array<number>} - The seasonal indices.
 */
const computeSeasonalIndices = (detrended, period) => {
  const seasonalSums = Array(period).fill(0);
  const seasonalCounts = Array(period).fill(0);

  detrended.forEach((val, idx) => {
    const seasonIdx = idx % period;
    seasonalSums[seasonIdx] += val;
    seasonalCounts[seasonIdx] += 1;
  });

  return seasonalSums.map((sum, idx) => sum / (seasonalCounts[idx] || 1));
};

/**
 * Calculates the moving average for seasonal adjustment.
 *
 * @param {Array<number>} data - The dataset.
 * @param {number} period - The period for moving average.
 * @returns {Array<number>} - The moving average values.
 */
const movingAverage = (data, period) => {
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
};

/**
 * Applies smoothing to the data.
 *
 * @param {Array<Object>} data - The dataset to smooth.
 * @param {Array<string>} selectedRegimes - The regimes to apply smoothing to.
 * @param {number} period - The period for smoothing (default is 6).
 * @param {boolean} showLocalCurrency - Flag to determine currency type.
 * @returns {Array<Object>} - The smoothed dataset.
 */
export const applySmoothing = (
  data,
  selectedRegimes,
  period = 6,
  showLocalCurrency = true
) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('applySmoothing received an empty or invalid array');
    return data; // Return original data if invalid
  }

  // Deep copy of data to avoid mutating original data
  const smoothedData = data.map((d) => ({ ...d }));

  selectedRegimes.forEach((regime) => {
    const priceKey = showLocalCurrency ? 'price' : 'usdprice';

    // Extract prices for the current regime
    const regimeData = smoothedData.filter((d) => d.regime === regime);
    const prices = regimeData.map((d) => d[priceKey]);

    // Handle cases where prices might be NaN or undefined
    if (prices.some((p) => p === undefined || isNaN(p))) {
      console.warn(`Prices contain undefined or NaN values for regime "${regime}".`);
      return;
    }

    // Apply smoothing
    const smoothedPrices = smoothing(prices, period);

    // Apply smoothed prices back to the data
    regimeData.forEach((d, idx) => {
      d[priceKey] = smoothedPrices[idx];
    });
  });

  return smoothedData;
};

/**
 * Smoothing function using a moving average.
 *
 * @param {Array<number>} data - The dataset.
 * @param {number} period - The period for smoothing.
 * @returns {Array<number>} - The smoothed data.
 */
const smoothing = (data, period) => {
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
};
// Helper function to normalize region IDs
const normalizeRegionId = (regionId) => {
  if (!regionId) return null;
  return regionId
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]/g, '_'); // Replace non-alphanumeric characters with underscores
};

// Helper function to get region ID from properties
const getRegionId = (properties) => {
  if (!properties) return null;

  // Try region_id first
  if (properties.region_id) {
    return normalizeRegionId(properties.region_id);
  }

  // Try admin1 if region_id is not available
  if (properties.admin1) {
    return normalizeRegionId(properties.admin1);
  }

  // Try shapeName if neither region_id nor admin1 is available
  if (properties.shapeName) {
    const shapeName = properties.shapeName.toLowerCase();
    if (shapeName === "sana'a" || shapeName === "sanʿaʾ" || shapeName === "sanaa") {
      return 'sana_a';
    }
    const mappedId = regionMapping[shapeName];
    return mappedId ? normalizeRegionId(mappedId) : normalizeRegionId(shapeName);
  }

  return null;
};

// ==========================
// Data Processing Function
// ==========================
/**
 * Processes GeoJSON data by calculating average price for selected commodity.
 *
 * @param {Object} geoJsonData - The GeoJSON data.
 * @param {Object} enhancedData - The enhanced data features.
 * @param {string} selectedCommodity - The selected commodity to calculate average price.
 * @returns {Object} - The processed GeoJSON data with average prices.
 */
export const processData = (geoJsonData, enhancedData, selectedCommodity) => {
  if (!geoJsonData || !enhancedData || !selectedCommodity) {
    console.warn('processData received invalid arguments');
    return geoJsonData;
  }

  // Group enhanced data by region and calculate average price for the selected commodity
  const averagePrices = enhancedData.features.reduce((acc, feature) => {
    const regionId = getRegionId(feature.properties);
    if (!regionId) {
      console.warn(`Enhanced data feature missing region_id:`, feature);
      return acc;
    }

    if (!acc[regionId]) {
      acc[regionId] = { sum: 0, count: 0 };
    }
    acc[regionId].sum += parseFloat(feature.properties.price) || 0;
    acc[regionId].count += 1;
    return acc;
  }, {});

  // Merge average prices with GeoJSON data
  geoJsonData.features.forEach((feature) => {
    const admin1 = feature.properties.ADM1_EN
      ? normalizeRegionId(feature.properties.ADM1_EN)
      : null;
    if (admin1 && averagePrices[admin1]) {
      feature.properties.averagePrice =
        averagePrices[admin1].sum / averagePrices[admin1].count;
    } else {
      feature.properties.averagePrice = null; // or a default value
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
 * @param {Object} geoBoundariesData - The GeoJSON data for geo boundaries.
 * @param {Object} enhancedData - The enhanced data features.
 * @param {Array} excludedRegions - List of regions to exclude.
 * @param {Object} regionMapping - Mapping of region names to region IDs.
 * @returns {Object} - The merged GeoJSON data.
 */
export const mergeSpatialDataWithMapping = (geoBoundariesData, enhancedData, excludedRegions, regionMapping) => {
  const geoBoundariesMap = new Map();
  const unmatchedRegions = new Set();
  const mergedFeatures = [];

  // Create a map for geoBoundaries using normalized region_id
  geoBoundariesData.features.forEach((feature) => {
    const originalShapeName = feature.properties?.shapeName;
    const mappedRegionId = getRegionId(feature.properties);

    if (!mappedRegionId) {
      console.warn(`Unable to determine region_id for region: "${originalShapeName}"`);
      return;
    }

    // Exclude specified regions
    if (excludedRegions.map(r => normalizeRegionId(r)).includes(mappedRegionId)) {
      console.info(`Excluding region: ${originalShapeName}`);
      return;
    }

    geoBoundariesMap.set(mappedRegionId, feature);
  });

  // Process enhanced data features
  enhancedData.features.forEach((enhancedFeature, index) => {
    try {
      const processedProps = processProperties(enhancedFeature.properties);
      const { region_id, commodity, date } = processedProps;

      if (!region_id) {
        console.debug('Feature properties:', enhancedFeature.properties);
        console.warn(`Enhanced data feature missing both region_id and admin1:`, enhancedFeature);
        return;
      }

      if (!geoBoundariesMap.has(region_id)) {
        console.warn(`No geoBoundaries data for region_id: "${region_id}"`);
        unmatchedRegions.add(region_id);
        return;
      }

      const geoBoundaryFeature = geoBoundariesMap.get(region_id);
      const uniqueId = `${region_id}_${commodity}_${date || 'nodate'}_${index}`;

      mergedFeatures.push({
        type: 'Feature',
        properties: {
          ...geoBoundaryFeature.properties,
          ...processedProps,
          region_id, // Ensure region_id is always present
          id: uniqueId,
        },
        geometry: geoBoundaryFeature.geometry,
      });
    } catch (error) {
      console.error(`Error processing feature at index ${index}:`, error);
    }
  });

  // Handle regions without enhanced data
  geoBoundariesMap.forEach((geoFeature, region_id) => {
    const hasData = enhancedData.features.some(
      feature => getRegionId(feature.properties) === region_id
    );

    if (!hasData) {
      console.warn(`No enhanced data found for region_id: "${region_id}"`);

      mergedFeatures.push({
        type: 'Feature',
        properties: {
          ...geoFeature.properties,
          region_id,
          commodity: 'unknown',
          date: null,
          usdprice: null,
          price: null,
          conflict_intensity: null,
          residual: null,
          id: `${region_id}_no_data`,
        },
        geometry: geoFeature.geometry,
      });
    }
  });

  if (unmatchedRegions.size > 0) {
    console.warn('Unmatched regions:', Array.from(unmatchedRegions));
  }

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
export const capitalizeWords = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Parses and validates a date string.
 *
 * @param {string} dateString - The date string to parse.
 * @returns {Date|null} - Returns a Date object if valid, otherwise null.
 */
export const parseAndValidateDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parsedDate = parseISO(dateString);
  return isValidDate(parsedDate) ? parsedDate : null;
};

/**
 * Formats a Date object into 'MMM yyyy' format.
 *
 * @param {Date} date - The Date object to format.
 * @returns {string} - The formatted date string.
 */
export const formatMonthYear = (date) => {
  if (!(date instanceof Date) || !isValidDate(date)) return '';
  return formatDate(date, 'MMM yyyy');
};

/**
 * Merges two arrays of objects based on a common key.
 *
 * @param {Array<Object>} array1 - The first array of objects.
 * @param {Array<Object>} array2 - The second array of objects.
 * @param {string} key1 - The key in the first array to match.
 * @param {string} key2 - The key in the second array to match.
 * @returns {Array<Object>} - The merged array of objects.
 */
export const mergeArraysByKey = (array1, array2, key1, key2) => {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    console.warn('mergeArraysByKey received non-array arguments');
    return [];
  }

  const map2 = new Map();
  array2.forEach((item) => {
    if (item[key2] !== undefined) {
      map2.set(item[key2], item);
    }
  });

  return array1.map((item) => {
    const match = map2.get(item[key1]);
    return match ? { ...item, ...match } : item;
  });
};

/**
 * Merges residuals into GeoJSON data by matching regions and dates.
 *
 * @param {Object} geoJsonData - The GeoJSON data containing region geometries.
 * @param {Object} residualsData - The residuals data to merge, keyed by region and date.
 * @returns {Object} - The GeoJSON data with residuals merged into the properties.
 */
export const mergeResidualsIntoGeoData = (geoJsonData, residualsData) => {
  if (!geoJsonData || !residualsData) {
    console.warn('mergeResidualsIntoGeoData received invalid arguments');
    return geoJsonData;
  }

  geoJsonData.features.forEach((feature) => {
    const region = feature.properties.region_id || feature.properties.ADM1_EN.toLowerCase();
    const date = feature.properties.date; // Ensure date is parsed and in a compatible format
    
    if (region && date && residualsData[region] && residualsData[region][date]) {
      feature.properties.residual = residualsData[region][date];
    } else {
      feature.properties.residual = null; // No residual data for this region/date
    }
  });

  return geoJsonData;
};
