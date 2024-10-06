// scripts/prepareData.js
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../results');
const destDir = path.join(__dirname, '../build/results');

const copyRecursiveSync = (source, destination) => {
  if (!fs.existsSync(source)) {
    console.error(`Source directory does not exist: ${source}`);
    process.exit(1);
  }

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
    console.log(`Created directory: ${destination}`);
  }

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
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied ${sourcePath} to ${destPath}`);
      } catch (error) {
        console.error(`Error copying ${sourcePath}: ${error.message}`);
      }
    }
  });
};

const geojsonSource = path.join(__dirname, '../results/enhanced_unified_data_with_residual.geojson');
const geojsonDest = path.join(__dirname, '../build/results/enhanced_unified_data_with_residual.geojson');

fs.copyFileSync(geojsonSource, geojsonDest);
console.log(`Copied ${geojsonSource} to ${geojsonDest}`);

const prepareData = () => {
  try {
    copyRecursiveSync(sourceDir, destDir);
    console.log('Data preparation complete.');
  } catch (error) {
    console.error('Data preparation failed:', error.message);
    process.exit(1);
  }
};

prepareData();