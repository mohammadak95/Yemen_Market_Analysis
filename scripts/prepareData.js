// scripts/prepareData.js

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../results');
const publicSourceDir = path.join(__dirname, '../public/results');
const destDir = path.join(__dirname, '../build/results');

const ensureDirectoryExistence = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

const copyFile = (source, destination) => {
  try {
    fs.copyFileSync(source, destination);
    console.log(`Copied ${source} to ${destination}`);
  } catch (error) {
    console.error(`Error copying ${source}: ${error.message}`);
  }
};

const copyRecursiveSync = (source, destination) => {
  if (!fs.existsSync(source)) {
    console.warn(`Source directory does not exist: ${source}`);
    return;
  }

  ensureDirectoryExistence(destination);

  const items = fs.readdirSync(source);
  if (items.length === 0) {
    console.warn(`Source directory is empty: ${source}`);
    return;
  }

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
    // Copy from results directory
    copyRecursiveSync(sourceDir, destDir);

    // Copy from public/results directory
    copyRecursiveSync(publicSourceDir, destDir);

    // Ensure specific files are copied
    const filesToEnsure = [
      'enhanced_unified_data_with_residual.geojson',
      'spatial_analysis_results.json',
      'choropleth_data/average_prices.csv',
      'choropleth_data/conflict_intensity.csv',
      'choropleth_data/price_changes.csv',
      'choropleth_data/residuals.csv',
      'ecm/ecm_analysis_results.json',
      'network_data/flow_maps.csv',
      'price_diff_results/price_differential_results.json',
      'spatial_weights/spatial_weights.json',
      'time_series_data/conflict_intensity_time_series.csv',
      'time_series_data/prices_time_series.csv'
    ];

    filesToEnsure.forEach(file => {
      const sourcePath = path.join(sourceDir, file);
      const publicSourcePath = path.join(publicSourceDir, file);
      const destPath = path.join(destDir, file);

      if (fs.existsSync(sourcePath)) {
        copyFile(sourcePath, destPath);
      } else if (fs.existsSync(publicSourcePath)) {
        copyFile(publicSourcePath, destPath);
      } else {
        console.warn(`File not found in either location: ${file}`);
      }
    });

    console.log('Data preparation complete.');
  } catch (error) {
    console.error('Data preparation failed:', error.message);
    process.exit(1);
  }
};

prepareData();