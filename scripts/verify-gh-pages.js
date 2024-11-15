// scripts/verify-gh-pages.js

const verifyGitHubPages = async () => {
    const baseUrl = process.env.PUBLIC_URL;
    if (!baseUrl) {
      console.error('PUBLIC_URL not set');
      process.exit(1);
    }
  
    const criticalPaths = [
      '/results/preprocessed_by_commodity/preprocessed_yemen_market_data_beans_white.json',
      // Add other critical paths
    ];
  
    for (const path of criticalPaths) {
      const fullPath = `${baseUrl}${path}`;
      try {
        const response = await fetch(fullPath);
        if (!response.ok) {
          console.error(`Failed to load: ${fullPath}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error loading ${fullPath}:`, error);
        process.exit(1);
      }
    }
  
    console.log('GitHub Pages verification successful');
  };
  
  verifyGitHubPages();