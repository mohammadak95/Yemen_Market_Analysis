const isGitHubPages = process.env.NODE_ENV === 'production' && process.env.PUBLIC_URL.includes('github.io');

const getDataUrl = (filename) => {
  if (isGitHubPages) {
    // Replace 'yourusername' and 'your-repo-name' with actual values
    return `https://raw.githubusercontent.com/yourusername/your-repo-name/main/data/${filename}`;
  } else {
    return `${process.env.PUBLIC_URL}/data/${filename}`;
  }
};

export { getDataUrl };