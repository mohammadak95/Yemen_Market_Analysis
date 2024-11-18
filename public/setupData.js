// scripts/setupData.js

const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const setupDataDirectory = () => {
  // Create data directory structure
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const preprocessedDir = path.join(dataDir, 'preprocessed_by_commodity');
  
  ensureDirectoryExists(dataDir);
  ensureDirectoryExists(preprocessedDir);

  // Create empty CSV if it doesn't exist
  const timeVaryingFlowsPath = path.join(dataDir, 'time_varying_flows.csv');
  if (!fs.existsSync(timeVaryingFlowsPath)) {
    const csvHeader = 'date,commodity,source,target,price,usdprice,conflict_intensity\n';
    fs.writeFileSync(timeVaryingFlowsPath, csvHeader);
  }

  // Create empty JSON files if they don't exist
  const jsonFiles = [
    'tv_mii_results.json',
    'price_differential_results.json',
    'spatial_analysis_results.json',
    'transformed_spatial_weights.json'
  ];

  jsonFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '{}');
    }
  });

  console.log('Data directory structure created successfully');
};

setupDataDirectory();