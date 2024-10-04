// src/utils/dataPath.js
export const getDataPath = (relativePath) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const basePath = isProduction ? '/Yemen_Market_Analysis' : '';
  return `${basePath}/results/${relativePath}`;
};