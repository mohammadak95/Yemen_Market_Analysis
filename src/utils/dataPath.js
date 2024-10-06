// src/utils/dataPath.js

export function getDataPath(fileName) {
  if (process.env.NODE_ENV === 'production') {
    // Adjust the path for production if needed
    return `/Yemen_Market_Analysis/results/${fileName}`;
  } else {
    // Use relative path for development
    return `/results/${fileName}`;
  }
}