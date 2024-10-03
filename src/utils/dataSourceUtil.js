const isGitHubPages = process.env.PUBLIC_URL.includes('github.io');
const isOffline = !navigator.onLine;

export const getDataPath = (relativePath) => {
  if (isOffline) {
    // For offline development, use local path
    return `/results/${relativePath}`;
  } else if (isGitHubPages) {
    // For GitHub Pages deployment
    return `${process.env.PUBLIC_URL}/results/${relativePath}`;
  } else {
    // For online development
    return `/results/${relativePath}`;
  }
};