const fs = require('fs');
const path = require('path');

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(source, target) {
  if (!fs.existsSync(source)) {
    console.error(`Source file not found: ${source}`);
    return;
  }
  fs.copyFileSync(source, target);
}

function setup() {
  const directories = [
    'public/static/media',
    'public/leaflet/dist/images',
    'src/styles'
  ];

  // Create directories
  directories.forEach(dir => ensureDirectoryExists(dir));

  // Copy Leaflet assets
  const leafletImagesDir = path.join(__dirname, '../node_modules/leaflet/dist/images');
  const targetImagesDir = path.join(__dirname, '../public/leaflet/dist/images');
  
  if (fs.existsSync(leafletImagesDir)) {
    fs.readdirSync(leafletImagesDir).forEach(file => {
      copyFile(
        path.join(leafletImagesDir, file),
        path.join(targetImagesDir, file)
      );
    });
  }

  // Copy Leaflet CSS
  copyFile(
    path.join(__dirname, '../node_modules/leaflet/dist/leaflet.css'),
    path.join(__dirname, '../public/static/media/leaflet.css')
  );

  console.log('Setup completed successfully');
}

setup();