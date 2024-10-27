// scripts/backupDiscovery.js

const fs = require('fs-extra');
const path = require('path');

async function backupDiscovery() {
  const sourceDir = path.join(__dirname, '..', 'src', 'components', 'discovery');
  const backupDir = path.join(__dirname, '..', 'discovery_backup_' + Date.now());

  try {
    console.log('Creating backup...');
    await fs.copy(sourceDir, backupDir);
    console.log(`Backup created at: ${backupDir}`);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

backupDiscovery();
