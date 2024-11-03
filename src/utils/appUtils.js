// ===== appUtils.js =====

// src/utils/appUtils.js

// ==========================
// Imports
// ==========================
import proj4 from 'proj4';
import { parseISO, isValid as isValidDate, format as formatDate } from 'date-fns';

// ==========================
// Environment Variables
// ==========================
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const isGitHubPages = PUBLIC_URL.includes('github.io');

// ==========================
// Projection Definitions
// ==========================
const EPSG_2085 = 'EPSG:2085';
const EPSG_2098 = 'EPSG:2098';
const WGS84 = 'EPSG:4326';

proj4.defs(
  EPSG_2085,
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass ' +
    '+towgs84=-76,-138,67,0,0,0,0 +units=m +no_defs'
);
proj4.defs(
  EPSG_2098,
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs'
);

// ==========================
// Region Mapping
// ==========================

/**
 * Mapping between GeoBoundaries region identifiers and Enhanced data region identifiers.
 */
const regionMapping = {
  "san'a'": "sana'a",
  "san_a__governorate": "sana'a",
  "lahij_governorate": "lahj",
  "lahij": "lahj",
  "_adan_governorate": "aden",
  "al_hudaydah_governorate": "al hudaydah",
  "ta_izz_governorate": "taizz",
  "shabwah_governorate": "shabwah",
  "hadhramaut": "hadramaut",
  "abyan_governorate": "abyan",
  "al_jawf_governorate": "al jawf",
  "ibb_governorate": "ibb",
  "al_bayda__governorate": "al bayda",
  "ad_dali__governorate": "al dhale'e",
  "al_mahwit_governorate": "al mahwit",
  "hajjah_governorate": "hajjah",
  "dhamar_governorate": "dhamar",
  "_amran_governorate": "amran",
  "al_mahrah_governorate": "al maharah",
  "ma'rib_governorate": "marib",
  "raymah_governorate": "raymah",
  "amanat al asimah": "amanat al asimah", // Capital Municipality
  // Add any additional mappings if necessary
};

// ==========================
// Excluded Regions
// ==========================

/**
 * List of regions to exclude from the mapping and merging process.
 */
const excludedRegions = [
  'sa\'dah_governorate', // Example: Add the exact normalized region IDs
  // Add other regions as needed
];

// ==========================
// Coordinate Transformation Functions
// ==========================

/**
 * Transforms coordinates from a source EPSG to WGS84.
 *
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {string} sourceEPSG - The source EPSG code.
 * @returns {[number, number]} - The transformed [longitude, latitude] in WGS84.
 * @throws Will throw an error if the source projection is unsupported or transformation fails.
 */
export const transformToWGS84 = (x, y, sourceEPSG = EPSG_2085) => {
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Invalid coordinates: x and y must be numbers');
  }

  try {
    if (sourceEPSG === WGS84) {
      return [y, x]; // Already in WGS84 [lat, lng]
    }
    return proj4(sourceEPSG, WGS84, [x, y]);
  } catch (error) {
    console.error(`Error transforming from ${sourceEPSG}: ${error.message}`);
    throw error;
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
 *
 * @param {string} fileName - The relative file name.
 * @returns {string} - The constructed data path.
 */
export const getDataPath = (fileName) => {
  const cleanFileName = fileName.replace(/^\/+/, '').replace(/^results\//, '');
  const basePath = isGitHubPages ? PUBLIC_URL : '';
  return `${basePath}/results/${cleanFileName}`;
};

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
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} while fetching ${url}`);
    }

    const contentType = response.headers.get('content-type');
    if (
      !contentType ||
      (!contentType.includes('application/json') && !contentType.includes('application/geo+json'))
    ) {
      throw new Error(`Expected JSON, but received ${contentType} from ${url}`);
    }

    return await response.json();
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
    headers.join(delimiter), // Header row
    ...jsonData.map((row) =>
      headers
        .map((fieldName) => {
          const value = row[fieldName];
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`; // Escape double quotes
          }
          return value;
        })
        .join(delimiter)
    ),
  ];
  return csvRows.join('\n');
};

// ==========================
// Data Processing Utilities
// ==========================

/**
 * Calculates the moving average for a dataset.
 *
 * @param {Array<number>} data - The dataset.
 * @param {number} period - The period for moving average.
 * @returns {Array<number>} - The moving average values.
 */
const movingAverage = (data, period) => {
  const result = [];
  let sum = 0;

  data.forEach((value, index) => {
    sum += value;
    if (index >= period) {
      sum -= data[index - period];
    }
    if (index >= period - 1) {
      const average = sum / period;
      result.push(isNaN(average) ? 0 : average);
    } else {
      result.push(value); // Not enough data points initially
    }
  });

  return result;
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
 * Applies seasonal adjustment to the data.
 *
 * @param {Array<Object>} data - The dataset to adjust.
 * @param {Array<string>} selectedRegimes - The regimes to apply adjustments to.
 * @param {number} [period=12] - The period for seasonal adjustment.
 * @param {boolean} [showLocalCurrency=true] - Flag to determine currency type.
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
    return data;
  }

  const priceKey = showLocalCurrency ? 'price' : 'usdprice';
  const adjustedData = data.map((d) => ({ ...d }));

  selectedRegimes.forEach((regime) => {
    const regimeData = adjustedData.filter((d) => d.regime === regime);
    const prices = regimeData.map((d) => d[priceKey]);

    if (prices.some((p) => p === undefined || isNaN(p))) {
      console.warn(`Prices contain undefined or NaN values for regime "${regime}".`);
      return;
    }

    const trend = movingAverage(prices, period);
    const detrended = prices.map((p, i) => p - trend[i]);
    const seasonalIndices = computeSeasonalIndices(detrended, period);

    regimeData.forEach((d, idx) => {
      const seasonalAdjustment = seasonalIndices[idx % period];
      d[priceKey] = d[priceKey] - seasonalAdjustment;
    });
  });

  return adjustedData;
};

/**
 * Applies smoothing to the data using a moving average.
 *
 * @param {Array<Object>} data - The dataset to smooth.
 * @param {Array<string>} selectedRegimes - The regimes to apply smoothing to.
 * @param {number} [period=6] - The period for smoothing.
 * @param {boolean} [showLocalCurrency=true] - Flag to determine currency type.
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
    return data;
  }

  const priceKey = showLocalCurrency ? 'price' : 'usdprice';
  const smoothedData = data.map((d) => ({ ...d }));

  selectedRegimes.forEach((regime) => {
    const regimeData = smoothedData.filter((d) => d.regime === regime);
    const prices = regimeData.map((d) => d[priceKey]);

    if (prices.some((p) => p === undefined || isNaN(p))) {
      console.warn(`Prices contain undefined or NaN values for regime "${regime}".`);
      return;
    }

    const smoothedPrices = movingAverage(prices, period);

    regimeData.forEach((d, idx) => {
      d[priceKey] = smoothedPrices[idx];
    });
  });

  return smoothedData;
};

// ==========================
// Helper Functions
// ==========================

/**
 * Normalizes a region ID by removing diacritics and replacing non-alphanumeric characters with underscores.
 *
 * @param {string} regionId - The region ID to normalize.
 * @returns {string|null} - The normalized region ID or null if input is invalid.
 */
export const normalizeRegionId = (regionId) => {
  if (!regionId) return null;
  return regionId
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]/g, '_'); // Replace non-alphanumeric characters with underscores
};

/**
 * Retrieves the normalized region ID from feature properties.
 *
 * @param {Object} properties - The properties of a feature.
 * @returns {string|null} - The normalized region ID or null if not found.
 */
const getRegionId = (properties) => {
  if (!properties) return null;

  if (properties.region_id) {
    return normalizeRegionId(properties.region_id);
  }

  if (properties.admin1) {
    return normalizeRegionId(properties.admin1);
  }

  if (properties.shapeName) {
    const shapeName = properties.shapeName.toLowerCase();
    if (["sana'a", 'sanʿaʾ', 'sanaa'].includes(shapeName)) {
      return 'sana_a';
    }
    const mappedId = regionMapping[shapeName];
    return mappedId ? normalizeRegionId(mappedId) : normalizeRegionId(shapeName);
  }

  return null;
};

/**
 * Processes properties of an enhanced feature.
 *
 * @param {Object} properties - The properties to process.
 * @returns {Object} - The processed properties.
 */
const processProperties = (properties) => {
  // Implement the logic to process properties here
  // For example, ensure necessary fields are present and normalized
  // This is a placeholder implementation
  return properties;
};

// ==========================
// Merge Spatial Data with Mapping
// ==========================

/**
 * Merges spatial data with mapping and exclusion logic, handling time-series data.
 *
 * @param {Object} geoBoundariesData - The GeoJSON data for geo boundaries.
 * @param {Object} enhancedData - The enhanced data features.
 * @returns {Object} - The merged GeoJSON data.
 */
export const mergeSpatialDataWithMapping = (geoBoundariesData, enhancedData) => {
  const geoBoundariesMap = new Map();
  const unmatchedRegions = new Set();
  const mergedFeatures = [];

  // Normalize excluded regions (ensure `excludedRegions` is an array and normalize each one)
  const normalizedExcludedRegions = Array.isArray(excludedRegions)
    ? excludedRegions.map(normalizeRegionId)
    : [];

  // Create a map for geoBoundaries using normalized region_id
  geoBoundariesData.features.forEach((feature) => {
    const originalShapeName = feature.properties?.shapeName;
    const mappedRegionId = getRegionId(feature.properties);

    if (!mappedRegionId) {
      console.warn(`Unable to determine region_id for region: "${originalShapeName}"`);
      return;
    }

    // Exclude specified regions
    if (normalizedExcludedRegions.includes(mappedRegionId)) {
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
        console.warn('Enhanced data feature missing region_id:', enhancedFeature);
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
      (feature) => getRegionId(feature.properties) === region_id
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
    const region =
      feature.properties.region_id ||
      (feature.properties.ADM1_EN
        ? normalizeRegionId(feature.properties.ADM1_EN)
        : null);
    const date = feature.properties.date; // Ensure date is parsed and in a compatible format

    if (region && date && residualsData[region]?.[date] !== undefined) {
      feature.properties.residual = residualsData[region][date];
    } else {
      feature.properties.residual = null; // No residual data for this region/date
    }
  });

  return geoJsonData;
};

// ==========================
// Methodology Registry
// ==========================

// (Assuming this part remains unchanged or is handled elsewhere)

// ==========================
// Tooltip Registry
// ==========================

// (Assuming this part remains unchanged or is handled elsewhere)

// ==========================
// Scoring Functions
// ==========================

// (Assuming this part remains unchanged or is handled elsewhere)

// ==========================
// methodologyRegistry.js
// ==========================

// src/utils/methodologyRegistry.js

// Technical component mapping
export const technicalMapping = {
  ecm: {
    section: '2.1. Error Correction Model (ECM)',
    equations: {
      main: {
        latex: '\\Delta Y_t = \\alpha \\beta\' Y_{t-1} + \\sum_{i=1}^{p-1} \\Gamma_i \\Delta Y_{t-i} + u_t',
        description: 'Vector Error Correction Model specification',
        variables: {
          '\\alpha': 'Speed of adjustment coefficient',
          '\\beta': 'Long-run cointegration vector',
          '\\Gamma_i': 'Short-run dynamics coefficients',
          'u_t': 'Error term',
        },
      },
      diagnostics: {
        moransI: {
          latex:
            'I = \\frac{N}{\\sum_{i=1}^{N} \\sum_{j=1}^{N} w_{ij}} \\cdot ' +
            '\\frac{\\sum_{i=1}^{N} \\sum_{j=1}^{N} w_{ij}(y_i - \\bar{y})(y_j - \\bar{y})}{\\sum_{i=1}^{N} (y_i - \\bar{y})^2}',
          description: "Moran's I spatial autocorrelation statistic",
        },
        jarqueBera: {
          latex: 'JB = \\frac{n}{6}(S^2 + \\frac{1}{4}(K-3)^2)',
          description: 'Jarque-Bera normality test statistic',
        },
      },
    },
    concepts: {
      cointegration: 'Long-run equilibrium relationship between variables',
      errorCorrection: 'Adjustment process towards long-run equilibrium',
      grangerCausality: 'Statistical prediction relationship between variables',
    },
  },
  priceDiff: {
    section: '2.2. Price Differential Model',
    equations: {
      main: {
        latex: '\\Delta P_{ijt} = \\ln(P_{it}) - \\ln(P_{jt})',
        description: 'Log price differential between markets i and j at time t',
        variables: {
          'P_{it}': 'Price in market i at time t',
          'P_{jt}': 'Price in market j at time t',
        },
      },
    },
    concepts: {
      arbitrage: 'Price convergence through market mechanisms',
      priceTransmission: 'Speed and extent of price signal propagation',
    },
  },
  spatial: {
    section: '3. Spatial Econometric Analysis',
    equations: {
      weights: {
        latex:
          'w_{ij} = \\begin{cases} 1 & \\text{if } j \\text{ is one of the } k \\text{ nearest neighbors of } i \\\\ 0 & \\text{otherwise} \\end{cases}',
        description: 'K-nearest neighbors spatial weights specification',
      },
    },
    concepts: {
      spatialAutocorrelation: 'Spatial dependence in price patterns',
      marketClustering: 'Geographic clustering of similar market behaviors',
    },
  },
  tvmii: {
    section: 'Time-Varying Market Integration Index',
    equations: {
      index: {
        latex: 'TVMII_{ijt} = f(\\rho_{ijt}, \\sigma_{ijt}, d_{ij})',
        description: 'Time-varying market integration index',
        variables: {
          '\\rho_{ijt}': 'Time-varying price correlation',
          '\\sigma_{ijt}': 'Time-varying volatility',
          'd_{ij}': 'Distance between markets',
        },
      },
    },
    concepts: {
      marketIntegration: 'Degree of price co-movement between markets',
      timeVaryingRelationship: 'Evolution of market relationships over time',
    },
  },
};

// Methodology content
export const methodologyContent = {
  'price-diff': {
    section: 'price-differential',
    tooltips: {
      main: 'Price differential analysis examines the differences in prices between markets',
      chart: 'Visualizes price differences over time with confidence intervals',
      diagnostics: 'Statistical tests to validate price differential patterns',
      market_pairs: 'Comparison of price relationships between market pairs',
    },
    equations: {
      main: {
        latex: '\\Delta P_{ij,t} = \\ln(P_{i,t}) - \\ln(P_{j,t})',
        description: 'Price differential between markets i and j at time t',
        variables: {
          'P_{i,t}': 'Price in market i at time t',
          'P_{j,t}': 'Price in market j at time t',
          '\\Delta P_{ij,t}': 'Log price differential',
        },
      },
    },
  },
  ecm: {
    section: 'error-correction-model',
    tooltips: {
      main: 'Error Correction Model analyzes long-run equilibrium relationships',
      diagnostics: 'Model diagnostics and statistical validation tests',
      cointegration: 'Tests for long-run relationships between price series',
    },
    equations: {
      main: {
        latex: '\\Delta y_t = \\alpha(y_{t-1} - \\beta x_{t-1}) + \\gamma\\Delta x_t + \\epsilon_t',
        description: 'Error correction model specification',
        variables: {
          '\\alpha': 'Speed of adjustment coefficient',
          '\\beta': 'Long-run equilibrium coefficient',
          '\\gamma': 'Short-run dynamics coefficient',
        },
      },
    },
  },
  spatial: {
    section: 'spatial-analysis',
    tooltips: {
      main: 'Spatial analysis examines geographic patterns in market relationships',
      choropleth: 'Color-coded map showing spatial distribution of values',
      flow_network: 'Network diagram showing market relationships and flows',
      market_clustering: 'Analysis of market groupings based on spatial relationships',
    },
    equations: {
      moran: {
        latex:
          'I = \\frac{n}{W} \\frac{\\sum_i \\sum_j w_{ij}(x_i - \\bar{x})(x_j - \\bar{x})}{\\sum_i (x_i - \\bar{x})^2}',
        description: "Moran's I spatial autocorrelation statistic",
        variables: {
          'w_{ij}': 'Spatial weight between locations i and j',
          'x_i': 'Variable value at location i',
          'W': 'Sum of all spatial weights',
        },
      },
    },
  },
  tvmii: {
    section: 'time-varying-market-integration',
    tooltips: {
      main: 'Time-Varying Market Integration Index measures dynamic market relationships',
      chart: 'Visualizes changes in market integration over time',
      interpretation: 'Guidelines for interpreting TV-MII values',
      market_pairs: 'Comparison of integration between market pairs',
    },
    equations: {
      main: {
        latex:
          'TV\\text{-}MII_{t} = \\frac{\\text{Cov}(P_{1t}, P_{2t})}{\\sqrt{\\text{Var}(P_{1t})\\text{Var}(P_{2t})}}',
        description: 'Time-Varying Market Integration Index calculation',
        variables: {
          'P_{1t}': 'Price in market 1 at time t',
          'P_{2t}': 'Price in market 2 at time t',
          'TV\\text{-}MII_{t}': 'Integration index at time t',
        },
      },
    },
  },
};

// Helper functions for accessing methodology
export const getMethodologySection = (componentType) => {
  const mapping = technicalMapping[componentType];
  if (!mapping) return null;

  return methodologyContent[componentType] || null;
};

export const getEquation = (componentType, equationType) => {
  const mapping = technicalMapping[componentType];
  return mapping?.equations[equationType] || null;
};

export const getConcept = (componentType, conceptKey) => {
  const mapping = technicalMapping[componentType];
  return mapping?.concepts[conceptKey] || null;
};

export const getMethodologyInfo = (componentType, element) => {
  const info = methodologyContent[componentType];
  if (!info) return null;

  if (element) {
    return {
      tooltips: info.tooltips?.[element],
      equations: info.equations?.[element],
    };
  }

  return info;
};

// ==========================
// tooltipRegistry.js
// ==========================

// src/utils/tooltipRegistry.js

// Technical tooltips by component and element
export const tooltips = {
  ecm: {
    alpha: {
      short: 'Speed of adjustment coefficient (α)',
      detailed: 'Measures how quickly deviations from long-run equilibrium are corrected',
      technical:
        'Coefficient in the error correction term determining adjustment speed to equilibrium',
    },
    cointegration: {
      short: 'Long-run equilibrium relationship',
      detailed: 'Stable long-term relationship between non-stationary variables',
      technical:
        'Statistical property where linear combination of non-stationary series is stationary',
    },
    diagnostics: {
      moransI: {
        short: "Moran's I statistic",
        detailed: 'Measures spatial autocorrelation in residuals',
        technical:
          'Spatial correlation coefficient ranging from -1 (dispersion) to 1 (clustering)',
      },
    },
  },
  priceDiff: {
    spread: {
      short: 'Price spread between markets',
      detailed: 'Difference in log prices between two markets',
      technical: 'Logarithmic price differential measuring relative price gaps',
    },
    arbitrage: {
      short: 'Price arbitrage opportunity',
      detailed: 'Potential profit from price differences',
      technical: 'Price differential exceeding transaction costs',
    },
  },
  spatial: {
    weights: {
      short: 'Spatial weights matrix',
      detailed: 'Defines spatial relationships between markets',
      technical: 'Row-standardized matrix of spatial connectivity',
    },
    clustering: {
      short: 'Spatial clustering',
      detailed: 'Geographic grouping of similar values',
      technical: 'Positive spatial autocorrelation in market behavior',
    },
  },
  tvmii: {
    integration: {
      short: 'Market integration index',
      detailed: 'Measure of market connectedness',
      technical: 'Time-varying coefficient of market price co-movement',
    },
  },
};

/**
 * Retrieves a tooltip based on component type, element, and detail level.
 *
 * @param {string} componentType - The component type (e.g., 'ecm').
 * @param {string} element - The specific element (e.g., 'alpha').
 * @param {string} [level='short'] - The detail level ('short', 'detailed', 'technical').
 * @returns {string|null} - The requested tooltip or null if not found.
 */
export const getTooltip = (componentType, element, level = 'short') => {
  const componentTooltips = tooltips[componentType];
  if (!componentTooltips) return null;

  // Handle nested tooltips
  const paths = element.split('.');
  let tooltip = componentTooltips;
  for (const path of paths) {
    tooltip = tooltip[path];
    if (!tooltip) return null;
  }

  return tooltip[level] || tooltip.short;
};

// ==========================
// scoringFunctions.js
// ==========================

// src/utils/scoringFunctions.js

/**
 * Calculates ECM score based on user answers.
 *
 * @param {Object} answers - User answers.
 * @returns {number} - The calculated score.
 */
export const calculateECMScore = (answers) => {
  let score = 0;
  if (answers.speedOfAdjustment?.trim().length > 50) score += 33;
  if (answers.equilibriumInterpretation?.trim().length > 50) score += 33;
  if (answers.errorCorrection?.trim().length > 50) score += 34;
  return score;
};

/**
 * Calculates Price Differential score based on user answers.
 *
 * @param {Object} answers - User answers.
 * @returns {number} - The calculated score.
 */
export const calculatePriceDiffScore = (answers) => {
  let score = 0;
  if (
    ['convergence', 'divergence', 'stable'].includes(answers.trendType)
  ) score += 30;
  if (answers.interpretation?.trim().length > 50) score += 35;
  if (answers.marketEfficiency?.trim().length > 50) score += 35;
  return score;
};

/**
 * Calculates Spatial Analysis score based on user answers.
 *
 * @param {Object} answers - User answers.
 * @returns {number} - The calculated score.
 */
export const calculateSpatialScore = (answers) => {
  let score = 0;
  if (
    ['clustered', 'dispersed', 'random'].includes(answers.patternType)
  ) score += 30;
  if (answers.moranI?.trim().length > 50) score += 35;
  if (answers.spatialDependence?.trim().length > 50) score += 35;
  return score;
};

/**
 * Calculates TVMII score based on user answers.
 *
 * @param {Object} answers - User answers.
 * @returns {number} - The calculated score.
 */
export const calculateTVMIIScore = (answers) => {
  let score = 0;
  if (
    ['high', 'moderate', 'low'].includes(answers.integrationLevel)
  ) score += 30;
  if (answers.timeVaryingNature?.trim().length > 50) score += 35;
  if (answers.implications?.trim().length > 50) score += 35;
  return score;
};