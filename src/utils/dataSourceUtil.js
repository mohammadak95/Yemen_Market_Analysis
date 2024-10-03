const isGitHubPages = process.env.PUBLIC_URL.includes('github.io');

export const getDataPath = (relativePath) => {
  if (isGitHubPages) {
    // For GitHub Pages deployment
    return `${process.env.PUBLIC_URL}/results/${relativePath}`;
  } else {
    // For local development
    return `/results/${relativePath}`;
  }
};