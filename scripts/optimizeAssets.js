// scripts/optimizeAssets.js

const sharp = require('sharp');
const glob = require('glob');
const path = require('path');
const fs = require('fs').promises;

async function optimizeImages() {
  const images = glob.sync('public/**/*.{png,jpg,jpeg}');
  
  for (const imagePath of images) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      if (metadata.width > 1200) {
        await image
          .resize(1200)
          .jpeg({ quality: 80, progressive: true })
          .toBuffer()
          .then(data => fs.writeFile(imagePath, data));
      } else {
        await image
          .jpeg({ quality: 80, progressive: true })
          .toBuffer()
          .then(data => fs.writeFile(imagePath, data));
      }
      
      console.log(`Optimized: ${imagePath}`);
    } catch (error) {
      console.error(`Error optimizing ${imagePath}:`, error);
    }
  }
}

async function optimizeJSON() {
  const jsonFiles = glob.sync('public/data/**/*.json');
  
  for (const jsonPath of jsonFiles) {
    try {
      const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
      
      // Remove unnecessary precision from numbers
      const processValue = (value) => {
        if (typeof value === 'number') {
          return Number(value.toFixed(5));
        }
        return value;
      };

      const optimizedData = JSON.stringify(data, (key, value) => 
        processValue(value)
      );

      await fs.writeFile(jsonPath, optimizedData);
      console.log(`Optimized: ${jsonPath}`);
    } catch (error) {
      console.error(`Error optimizing ${jsonPath}:`, error);
    }
  }
}

async function main() {
  await Promise.all([
    optimizeImages(),
    optimizeJSON()
  ]);
}

main().catch(console.error);