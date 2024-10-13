// scripts/transformSpatialWeights.js

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../public/results/spatial_weights/spatial_weights.json');
const destPath = path.join(__dirname, '../public/results/spatial_weights/transformed_spatial_weights.json');

fs.readFile(sourcePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading spatial_weights.json:', err);
    return;
  }

  try {
    const originalData = JSON.parse(data);
    const transformedData = {};

    for (const region in originalData) {
      if (Array.isArray(originalData[region])) {
        transformedData[region] = { neighbors: originalData[region] };
      } else {
        console.warn(`Region ${region} does not have an array of neighbors.`);
      }
    }

    fs.writeFile(destPath, JSON.stringify(transformedData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing transformed_spatial_weights.json:', err);
        return;
      }
      console.log('Successfully transformed spatial_weights.json.');
    });
  } catch (parseError) {
    console.error('Error parsing spatial_weights.json:', parseError);
  }
});
