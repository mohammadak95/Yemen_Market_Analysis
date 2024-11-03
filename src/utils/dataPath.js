// src/utils/dataPath.js

export const getDataPath = (fileName) => {
    let basePath = '';
  
    if (isOffline) {
      basePath = '/results';
    } else if (isGitHubPages) {
      basePath = `${PUBLIC_URL}/results`;
    } else if (ENV === 'production') {
      basePath = '/Yemen_Market_Analysis/results';
    } else {
      basePath = '/results';
    }
  
    return `${basePath}/${fileName}`;
  };