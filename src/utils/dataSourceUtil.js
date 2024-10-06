// src/utils/dataSourceUtil.js

const ENV = process.env.NODE_ENV; // 'development' | 'production' | 'test'
const PUBLIC_URL = process.env.PUBLIC_URL || '';

const isGitHubPages = PUBLIC_URL.includes('github.io');
const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

export const getDataPath = (relativePath) => {
  if (isOffline) {
    // For offline development, use local path
    return `/results/${relativePath}`;
  } else if (isGitHubPages) {
    // For GitHub Pages deployment
    return `${PUBLIC_URL}/results/${relativePath}`;
  } else if (ENV === 'development') {
    // For online development, use a different base URL (e.g., local server)
    return `http://localhost:5000/results/${relativePath}`; // Adjust as needed
  } else {
    // For production or other deployments, use the base URL without PUBLIC_URL
    return `/results/${relativePath}`;
  }
};