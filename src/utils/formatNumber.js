// src/utils/formatNumber.js

export const formatNumber = (number) => {
    if (typeof number === 'number') {
      return number.toFixed(2);
    }
    return number;
  };
  