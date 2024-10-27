// sr./utils/dataPath.js

export function getDataPath(fileName) {
  const basePath = process.env.NODE_ENV === 'production' ? '/Yemen_Market_Analysis' : '';
  return `${basePath}/results/${fileName}`;
}