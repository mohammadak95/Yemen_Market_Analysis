// scripts/prepareData.js

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../public/results'); // Use only public/results as source
const destDir = path.join(__dirname, '../public/data'); // Destination remains public/data

const ensureDirectoryExistence = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

const copyFile = (source, destination) => {
  try {
    if (fs.existsSync(destination)) {
      console.warn(`[${new Date().toISOString()}] File already exists at destination: ${destination}. Overwriting...`);
    }
    fs.copyFileSync(source, destination);
    console.log(`[${new Date().toISOString()}] Copied ${source} to ${destination}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error copying ${source}: ${error.message}`);
  }
};

const copyRecursiveSync = (source, destination) => {
  ensureDirectoryExistence(destination);
  const items = fs.readdirSync(source);
  items.forEach((item) => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      copyRecursiveSync(sourcePath, destPath);
    } else {
      copyFile(sourcePath, destPath);
    }
  });
};

const prepareData = () => {
  try {
    // Copy all files from 'public/results' to 'public/data'
    copyRecursiveSync(sourceDir, destDir);

    const filesToEnsure = [
      'unified_data.geojson',
      'enhanced_unified_data_with_residual.geojson',
      'spatial_analysis_results.json',
      'choropleth_data/average_prices.csv',
      'choropleth_data/conflict_intensity.csv',
      'choropleth_data/price_changes.csv',
      'choropleth_data/residuals.csv',
      'ecm/ecm_analysis_results.json',
      'network_data/flow_maps.csv',
      'price_diff_results/price_differential_results.json',
      'spatial_weights/transformed_spatial_weights.json',
      'time_series_data/conflict_intensity_time_series.csv',
      'time_series_data/prices_time_series.csv',
      'ecm/ecm_results_north_to_south.json',
      'ecm/ecm_results_south_to_north.json',
      'choropleth_data/geoBoundaries-YEM-ADM1.geojson',
      'tv_mii_market_results.json',
      'tv_mii_results.json'
    ];

    filesToEnsure.forEach((file) => {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);

      if (fs.existsSync(sourcePath)) {
        copyFile(sourcePath, destPath);
      } else {
        console.warn(`[${new Date().toISOString()}] File not found in source directory: ${file}`);
      }
    });

    console.log(`[${new Date().toISOString()}] Data preparation complete.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Data preparation failed:`, error.message);
    process.exit(1);
  }
};

prepareData();
