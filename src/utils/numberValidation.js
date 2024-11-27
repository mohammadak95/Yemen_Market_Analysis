// src/utils/numberValidation.js

/**
 * Validates numerical values and provides safe defaults
 * @param {number} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @param {Object} options - Additional validation options
 * @returns {number} Validated number
 */
export const validateNumber = (value, defaultValue = 0, options = {}) => {
    const {
      allowNegative = false,
      allowZero = true,
      min = Number.NEGATIVE_INFINITY,
      max = Number.POSITIVE_INFINITY
    } = options;
  
    // Check if value is a valid number
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return defaultValue;
    }
  
    // Check if value is in allowed range
    if (value < min || value > max) {
      return defaultValue;
    }
  
    // Check for negative values
    if (!allowNegative && value < 0) {
      return defaultValue;
    }
  
    // Check for zero values
    if (!allowZero && value === 0) {
      return defaultValue;
    }
  
    return value;
  };
  
  /**
   * Validates array of numbers
   * @param {Array} values - Array of numbers to validate
   * @param {Object} options - Validation options
   * @returns {Array} Array of validated numbers
   */
  export const validateNumberArray = (values, options = {}) => {
    if (!Array.isArray(values)) {
      return [];
    }
  
    return values
      .map(value => validateNumber(value, null, options))
      .filter(value => value !== null);
  };
  
  /**
   * Calculates safe mean of numbers
   * @param {Array} values - Array of numbers
   * @returns {number} Mean value or 0 if invalid
   */
  export const calculateSafeMean = (values) => {
    const validValues = validateNumberArray(values);
    if (validValues.length === 0) return 0;
    
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  };
  
  /**
   * Safely divides two numbers
   * @param {number} numerator - Numerator
   * @param {number} denominator - Denominator
   * @param {number} defaultValue - Default value if division is invalid
   * @returns {number} Division result or default value
   */
  export const safeDivide = (numerator, denominator, defaultValue = 0) => {
    const num = validateNumber(numerator);
    const den = validateNumber(denominator);
  
    if (den === 0) return defaultValue;
    return num / den;
  };