// src/utils/dataPath.js
export const getDataPath = (relativePath) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const basePath = isProduction ? '/Yemen_Market_Analysis' : '';
  const fullPath = `${basePath}/results/${relativePath}`;
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Generated data path:", fullPath);
  return fullPath;
};