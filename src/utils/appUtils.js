// src/utils/appUtils.js

import { parseISO, isValid as isValidDate, format as formatDate } from 'date-fns';

// ==========================
// Region Mapping
// ==========================

/**
 * Mapping between GeoBoundaries region identifiers and Enhanced data region identifiers.
 */
export const regionMapping = {
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
export const excludedRegions = [
  'sa\'dah_governorate', // Example: Add the exact normalized region IDs
  // Add other regions as needed
];

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

// Enhanced region mapping system with robust normalization and validation

// Comprehensive mapping table for Yemen governorates
const enhancedRegionMapping = {
  // Standard mappings
  "san'a'": "sana'a",
  "san_a__governorate": "sana'a",
  "sanaa": "sana'a",
  "sanʿaʾ": "sana'a",
  "lahij_governorate": "lahj",
  "lahij": "lahj",
  "_adan_governorate": "aden",
  "al_hudaydah_governorate": "al hudaydah",
  "ta_izz_governorate": "taizz",
  "shabwah_governorate": "shabwah",
  "hadhramaut": "hadramaut",
  "hadramout": "hadramaut",
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
  
  // Additional variations
  "sana": "sana'a",
  "sanaa_gov": "sana'a",
  "hudaydah": "al hudaydah",
  "hodeidah": "al hudaydah",
  "adan": "aden",
  "taiz": "taizz",
  "shabwa": "shabwah",
  "hadramawt": "hadramaut",
  "jawf": "al jawf",
  "bayda": "al bayda",
  "dhale": "al dhale'e",
  "daleh": "al dhale'e",
  "mahwit": "al mahwit",
  "hodeida": "al hudaydah",
  "capital_city": "amanat al asimah",
  "capital": "amanat al asimah",
  "mareb": "marib",
  "maarib": "marib"
};

const normalizeArabicChars = (str) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])  // Arabic numerals
    .replace(/[اإأآ]/g, 'ا')  // Normalize Arabic alef variations
    .replace(/[ىئي]/g, 'ي')  // Normalize Arabic yaa variations
    .replace(/[ؤئ]/g, 'ء')  // Normalize Arabic hamza variations
    .replace(/[ة]/g, 'ه');  // Normalize Arabic taa marbouta
};

export const normalizeRegionName = (name) => {
  if (!name) return null;

  // Initial cleanup
  let cleaned = name.toLowerCase()
    .trim()
    .replace(/^_+/, '')               // Remove leading underscores
    .replace(/_+/g, ' ')             // Replace underscores with spaces
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .replace(/governorate$/i, '')     // Remove governorate suffix
    .replace(/province$/i, '')        // Remove province suffix
    .replace(/^gov[\s_]+/i, '')      // Remove gov prefix
    .replace(/^governorate[\s_]+/i, '') // Remove governorate prefix
    .trim();

  // Check direct mapping first
  if (REGION_MAPPINGS[cleaned]) {
    return REGION_MAPPINGS[cleaned];
  }

  // Handle Arabic characters and diacritics
  cleaned = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[_-]+/g, ' ')           // Normalize separators
    .replace(/ʿ/g, "'")               // Normalize special quotes
    .replace(/['']/g, "'");           // Normalize quotes

  // Check mapping again after normalization
  if (REGION_MAPPINGS[cleaned]) {
    return REGION_MAPPINGS[cleaned];
  }

  // Try without spaces
  const withoutSpaces = cleaned.replace(/\s+/g, '');
  if (REGION_MAPPINGS[withoutSpaces]) {
    return REGION_MAPPINGS[withoutSpaces];
  }

  return cleaned;
};

export const validateRegionMapping = (regionName, geometryData) => {
  const normalized = normalizeRegionName(regionName);
  const hasGeometry = geometryData.features.some(feature => 
    normalizeRegionName(feature.properties.shapeName) === normalized
  );
  
  return {
    original: regionName,
    normalized,
    hasGeometry,
    possibleMatches: !hasGeometry ? findPossibleMatches(normalized, geometryData) : []
  };
};

const findPossibleMatches = (normalized, geometryData) => {
  const allRegions = geometryData.features.map(f => f.properties.shapeName);
  return allRegions
    .filter(region => {
      const similarity = calculateSimilarity(normalized, normalizeRegionName(region));
      return similarity > 0.7; // Threshold for similarity
    })
    .map(region => ({
      name: region,
      normalized: normalizeRegionName(region),
      similarity: calculateSimilarity(normalized, normalizeRegionName(region))
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3); // Return top 3 matches
};

const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

const editDistance = (str1, str2) => {
  const matrix = Array(str2.length + 1).fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Debug utility to check all mappings
export const debugMappings = (marketData, geometryData) => {
  const results = {
    matched: [],
    unmatched: [],
    summary: {
      total: 0,
      matched: 0,
      unmatched: 0
    }
  };

  const uniqueMarkets = new Set(marketData.map(m => m.market || m.region || m.admin1));
  
  uniqueMarkets.forEach(market => {
    const validation = validateRegionMapping(market, geometryData);
    
    if (validation.hasGeometry) {
      results.matched.push({
        original: validation.original,
        normalized: validation.normalized
      });
    } else {
      results.unmatched.push({
        original: validation.original,
        normalized: validation.normalized,
        possibleMatches: validation.possibleMatches
      });
    }
  });

  results.summary = {
    total: uniqueMarkets.size,
    matched: results.matched.length,
    unmatched: results.unmatched.length,
    matchRate: `${((results.matched.length / uniqueMarkets.size) * 100).toFixed(1)}%`
  };

  return results;
};