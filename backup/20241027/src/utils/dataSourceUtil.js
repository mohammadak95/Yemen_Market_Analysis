// sr./utils/dataSourceUtil.js

const ENV = process.env.NODE_ENV;
const PUBLIC_URL = process.env.PUBLIC_URL || '';

const isGitHubPages = PUBLIC_URL.includes('github.io');
const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

export const getDataPath = (relativePath) => {
  if (isOffline) {
    return `/results/${relativePath}`;
  } else if (isGitHubPages) {
    return `${PUBLIC_URL}/results/${relativePath}`;
  } else if (ENV === 'development') {
    return `/results/${relativePath}`;
  } else {
    return `/results/${relativePath}`;
  }
};