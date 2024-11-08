// scripts/optimizeData.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function optimizeGeoJSON(inputPath, outputPath) {
  const data = JSON.parse(await readFile(inputPath, 'utf8'));
  
  // Remove unnecessary precision from coordinates
  const roundCoordinates = (coords) => {
    if (Array.isArray(coords[0])) {
      return coords.map(roundCoordinates);
    }
    return coords.map(c => Math.round(c * 1000) / 1000);
  };

  data.features.forEach(feature => {
    feature.geometry.coordinates = roundCoordinates(feature.geometry.coordinates);
  });

  // Remove unnecessary properties
  data.features.forEach(feature => {
    const necessaryProps = [
      'region_id', 'price', 'date', 'commodity', 
      'conflict_intensity', 'residual'
    ];
    const newProps = {};
    necessaryProps.forEach(prop => {
      if (feature.properties[prop] !== undefined) {
        newProps[prop] = feature.properties[prop];
      }
    });
    feature.properties = newProps;
  });

  await writeFile(outputPath, JSON.stringify(data));
  await gzipFile(outputPath);
}

async function gzipFile(filePath) {
  const content = await readFile(filePath);
  const compressed = zlib.gzipSync(content, { level: 9 });
  await writeFile(`${filePath}.gz`, compressed);
}

async function optimizeData() {
  const dataDir = path.join(__dirname, '../public/results');
  const optimizedDir = path.join(__dirname, '../public/data');

  // Create optimized directory if it doesn't exist
  if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true });
  }

  try {
    // Optimize GeoJSON files
    await optimizeGeoJSON(
      path.join(dataDir, 'unified_data.geojson'),
      path.join(optimizedDir, 'unified_data.geojson')
    );

    await optimizeGeoJSON(
      path.join(dataDir, 'enhanced_unified_data_with_residual.geojson'),
      path.join(optimizedDir, 'enhanced_unified_data_with_residual.geojson')
    );

    // Optimize other JSON files
    const jsonFiles = ['spatial_analysis_results.json', 'tv_mii_results.json'];
    for (const file of jsonFiles) {
      const data = JSON.parse(await readFile(path.join(dataDir, file), 'utf8'));
      await writeFile(
        path.join(optimizedDir, file),
        JSON.stringify(data)
      );
      await gzipFile(path.join(optimizedDir, file));
    }

    console.log('Data optimization complete');
  } catch (error) {
    console.error('Error optimizing data:', error);
    process.exit(1);
  }
}

optimizeData();