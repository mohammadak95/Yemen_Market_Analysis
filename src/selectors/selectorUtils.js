// src/selectors/selectorUtils.js

import { createSelectorCreator } from 'reselect';
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
 */
export const createDeepEqualSelector = createSelectorCreator(deepMemoize);