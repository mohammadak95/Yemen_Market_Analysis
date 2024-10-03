// scripts/prepareData.js
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../data');
const destDir = path.join(__dirname, '../public/data');

/**
 * Recursively copies all files and directories from the source to the destination.
 * @param {string} source - The source directory path.
 * @param {string} destination - The destination directory path.
 */
const copyRecursiveSync = (source, destination) => {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
    console.log(`Created directory: ${destination}`);
  }

  fs.readdirSync(source).forEach((item) => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      copyRecursiveSync(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${sourcePath} to ${destPath}`);
    }
  });
};

/**
 * Copies the entire 'data/' directory to 'public/data/' for deployment.
 */
const prepareData = () => {
  copyRecursiveSync(sourceDir, destDir);
  console.log('Data preparation complete.');
};

// Execute the copy operation
prepareData();