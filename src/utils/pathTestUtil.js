// src/utils/pathTestUtil.js

import { getDataPath, getCommodityPath } from './dataUtils';

export const testPath = async (path) => {
  try {
    const response = await fetch(path);
    return {
      exists: response.ok,
      status: response.status,
      path
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
      path
    };
  }
};

export const validatePaths = async () => {
  if (process.env.NODE_ENV !== 'development') return;

  const testPaths = [
    getDataPath('spatial_analysis_results.json'),
    getCommodityPath('beans_white'),
    // Add other critical paths
  ];

  const results = await Promise.all(testPaths.map(testPath));
  results.forEach(result => {
    if (!result.exists) {
      console.warn(`Path validation failed: ${result.path}`, result);
    }
  });
};