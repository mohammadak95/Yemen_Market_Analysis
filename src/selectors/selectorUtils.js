// src/selectors/selectorUtils.js

import { createSelectorCreator, lruMemoize } from 'reselect';
import isEqual from 'lodash/isEqual';

/**
 * Custom memoization function using lodash's isEqual for deep comparison.
 * It memorizes the last arguments and result, returning the cached result
 * if the new arguments are deeply equal to the previous ones.
 *
 * @param {Function} func - The selector function to memoize.
 * @returns {Function} - The memoized selector function.
 */
const deepMemoize = (func) => {
  let lastArgs = null;
  let lastResult = null;
  return (...args) => {
    if (lastArgs && isEqual(args, lastArgs)) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = func(...args);
    return lastResult;
  };
};

/**
 * Creates a new selector creator that uses deepMemoize for memoization.
 * This ensures that selectors perform deep equality checks on their inputs,
 * preventing unnecessary recalculations and re-renders.
 *
 * @type {Function}
 */
export const createDeepEqualSelector = createSelectorCreator(deepMemoize);

/**
 * Creates a customized selector creator with a provided equality function.
 * This allows for flexibility in how selectors determine if inputs have changed.
 *
 * @param {Function} equalityFn - The function to determine equality between selector inputs.
 * @returns {Function} - A new selector creator using the provided equality function.
 */
export const createCustomSelector = (equalityFn) => createSelectorCreator(
  lruMemoize,
  equalityFn
);

/**
 * Creates a selector with a limited cache size to manage memory usage.
 * When the cache exceeds the specified size, the oldest entries are removed.
 *
 * @param {Function} selector - The selector function to enhance with limited caching.
 * @param {number} [maxSize=100] - The maximum number of cached results.
 * @returns {Function} - A new selector with limited cache size.
 */
export const createLimitedCacheSelector = (selector, maxSize = 100) => {
  const cache = new Map();

  const limitedSelector = (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = selector(...args);
    cache.set(key, result);

    if (cache.size > maxSize) {
      // Remove the oldest entry
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  };

  // Attach the cache to the selector for potential manual clearing
  limitedSelector.cache = cache;

  return limitedSelector;
};

/**
 * Clears the cache of a limited cache selector.
 * Useful for resetting the selector's cache when necessary.
 *
 * @param {Function} limitedSelector - The selector with limited caching.
 */
export const clearLimitedCache = (limitedSelector) => {
  if (limitedSelector.cache && typeof limitedSelector.cache.clear === 'function') {
    limitedSelector.cache.clear();
  }
};

/**
 * Formats a date string to 'YYYY-MM' format.
 * Useful for normalizing date inputs in selectors.
 *
 * @param {string} dateStr - The date string to format.
 * @returns {string} - Formatted date string in 'YYYY-MM' format.
 */
export const formatDateToYearMonth = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const year = date.getFullYear();
  const month = (`0${date.getMonth() + 1}`).slice(-2);
  return `${year}-${month}`;
};

/**
 * Validates if an object conforms to the expected spatial data structure.
 * Ensures that essential properties are present and correctly typed.
 *
 * @param {Object} obj - The object to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
export const isValidSpatialData = (obj) => {
  if (typeof obj !== 'object' || obj === null) return false;
  // Check for essential properties
  const requiredProps = ['geometry', 'marketClusters', 'flowMaps', 'timeSeriesData'];
  return requiredProps.every(prop => prop in obj);
};

/**
 * Example utility function: Calculates the average of an array of numbers.
 *
 * @param {number[]} numbers - The array of numbers.
 * @returns {number} - The average value.
 */
export const calculateAverage = (numbers) => {
  if (!Array.isArray(numbers) || !numbers.length) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
};

/**
 * Example utility function: Detects seasonality in a time series.
 * Placeholder implementation; replace with actual seasonality detection logic as needed.
 *
 * @param {number[]} prices - The array of price values.
 * @returns {boolean} - True if seasonality is detected, false otherwise.
 */
export const detectSeasonality = (prices) => {
  // Placeholder logic for seasonality detection
  // Implement actual seasonality detection as per project requirements
  return false;
};

/**
 * Example utility function: Calculates trend in a time series.
 * Placeholder implementation; replace with actual trend calculation logic as needed.
 *
 * @param {number[]} prices - The array of price values.
 * @returns {number} - The trend value.
 */
export const calculateTrend = (prices) => {
  // Placeholder logic for trend calculation
  // Implement actual trend calculation as per project requirements
  return 0;
};

/**
 * Example utility function: Calculates volatility in a time series.
 *
 * @param {number[]} prices - The array of price values.
 * @returns {number} - The volatility value.
 */
export const calculateVolatility = (prices) => {
  if (!Array.isArray(prices) || prices.length < 2) return 0;
  const mean = calculateAverage(prices);
  const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / (prices.length - 1);
  return Math.sqrt(variance);
};