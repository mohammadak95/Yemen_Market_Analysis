const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'results');
const publicDataDir = path.join(__dirname, '..', 'public', 'data');
const repoDataDir = path.join(__dirname, '..', 'data');

// Ensure directories exist
fs.mkdirSync(publicDataDir, { recursive: true });
fs.mkdirSync(repoDataDir, { recursive: true });

// List of data files to process
const dataFiles = [
  'ecm-data.json',
  'price-differential-data.json',
  'spatial-data.json'
];

dataFiles.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const publicPath = path.join(publicDataDir, file);
  const repoPath = path.join(repoDataDir, file);

  // Copy to public/data for local development
  fs.copyFileSync(sourcePath, publicPath);
  console.log(`Copied ${file} to public/data`);

  // Copy to /data for GitHub Pages
  fs.copyFileSync(sourcePath, repoPath);
  console.log(`Copied ${file} to /data`);
});

console.log('Data preparation complete.');