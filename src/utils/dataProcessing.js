// src/utils/dataProcessing.js

/**
 * Applies seasonal adjustment to the data.
 *
 * @param {Array} data - The dataset to adjust.
 * @param {Array} selectedRegimes - The regimes to apply adjustments to.
 * @param {number} period - The period for seasonal adjustment (default is 12).
 * @param {boolean} showLocalCurrency - Flag to determine currency type.
 * @returns {Array} - The seasonally adjusted dataset.
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
   * @param {Array} detrended - The detrended dataset.
   * @param {number} period - The period for seasonal indices.
   * @returns {Array} - The seasonal indices.
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
   * @param {Array} data - The dataset.
   * @param {number} period - The period for moving average.
   * @returns {Array} - The moving average values.
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
   * @param {Array} data - The dataset to smooth.
   * @param {Array} selectedRegimes - The regimes to apply smoothing to.
   * @param {number} period - The period for smoothing (default is 6).
   * @param {boolean} showLocalCurrency - Flag to determine currency type.
   * @returns {Array} - The smoothed dataset.
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
   * @param {Array} data - The dataset.
   * @param {number} period - The period for smoothing.
   * @returns {Array} - The smoothed data.
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