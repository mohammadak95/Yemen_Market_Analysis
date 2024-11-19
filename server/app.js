// server/app.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const fs = require('fs-extra');

const app = express();

// Environment variables with fallback ports
const SERVER_PORT = process.env.SERVER_PORT || 5001;
const CLIENT_PORT = process.env.CLIENT_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const ALLOWED_ORIGINS = {
  development: [`http://localhost:${CLIENT_PORT}`],
  production: ['https://mohammadak95.github.io']
};

// Apply CORS middleware
app.use(cors({
  origin: ALLOWED_ORIGINS[NODE_ENV],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
  credentials: true,
  maxAge: 86400,
}));

// Apply standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving configuration
const staticOptions = {
  dotfiles: 'ignore',
  etag: true,
  extensions: ['htm', 'html'],
  immutable: true,
  lastModified: true,
  maxAge: '1d',
  setHeaders: function (res, path, stat) {
    if (path.endsWith('.json')) {
      res.set('Content-Type', 'application/json; charset=utf-8');
    } else if (path.endsWith('.geojson')) {
      res.set('Content-Type', 'application/geo+json; charset=utf-8');
    } else if (path.endsWith('.csv')) {
      res.set('Content-Type', 'text/csv; charset=utf-8');
    }
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'public, max-age=86400');
  }
};

// Configure static file serving for all possible paths
app.use('/results', express.static(path.join(__dirname, '..', 'results'), staticOptions));
app.use('/data', express.static(path.join(__dirname, '..', 'public', 'data'), staticOptions));
app.use('/public/data', express.static(path.join(__dirname, '..', 'public', 'data'), staticOptions));

// Preprocessed data API endpoint
app.get('/api/preprocessed-data', async (req, res) => {
  try {
    const { commodity } = req.query;
    if (!commodity) {
      return res.status(400).json({ error: 'Commodity parameter is required' });
    }

    // Normalize commodity name
    const normalizedName = commodity.toLowerCase()
      .replace(/[()]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Define possible file paths with correct directory structure
    const possiblePaths = [
      path.join(__dirname, '..', 'public', 'data', 'preprocessed_by_commodity', 
               `preprocessed_yemen_market_data_${normalizedName}.json`),
      path.join(__dirname, '..', 'results', 'preprocessed_by_commodity',
               `preprocessed_yemen_market_data_${normalizedName}.json`)
    ];

    // Enhanced file resolution with detailed logging
    let data = null;
    let foundPath = null;

    console.log(`Looking for commodity data: ${normalizedName}`);
    console.log('Search paths:');
    
    for (const filePath of possiblePaths) {
      console.log(`- Checking: ${filePath}`);
      
      try {
        const exists = await fs.pathExists(filePath);
        if (exists) {
          console.log(`  ✓ Found file at: ${filePath}`);
          data = await fs.readJson(filePath);
          foundPath = filePath;
          break;
        } else {
          console.log(`  ✗ Not found at: ${filePath}`);
        }
      } catch (readError) {
        console.warn(`  ! Error reading ${filePath}:`, readError.message);
        continue;
      }
    }
    
    // Additional debug info
    if (foundPath) {
      console.log(`Successfully resolved file at: ${foundPath}`);
    } else {
      console.log('No matching files found in any location');
    }

    if (!data) {
      console.warn(`Data not found for commodity: ${normalizedName}`);
      console.warn('Checked paths:', possiblePaths);
      return res.status(404).json({ 
        error: 'Data not found',
        commodity: normalizedName,
        checkedPaths: possiblePaths
      });
    }

    // Log successful file read
    console.log(`Successfully read data from: ${foundPath}`);
    res.json(data);

  } catch (error) {
    console.error('Error processing preprocessed data request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Verify critical paths exist
const verifyPaths = async () => {
  const criticalPaths = [
    path.join(__dirname, '..', 'public', 'data', 'preprocessed_by_commodity'),
    path.join(__dirname, '..', 'results', 'preprocessed_by_commodity')
  ];

  for (const dirPath of criticalPaths) {
    try {
      const exists = await fs.pathExists(dirPath);
      console.log(`Path check: ${dirPath} - ${exists ? '✓ exists' : '✗ missing'}`);
      
      if (exists) {
        const files = await fs.readdir(dirPath);
        console.log(`  Contains ${files.length} files`);
        if (files.length > 0) {
          console.log(`  First file: ${files[0]}`);
        }
      }
    } catch (error) {
      console.warn(`Could not check path ${dirPath}:`, error.message);
    }
  }
};

// Start server with error handling
const startServer = async () => {
  await verifyPaths();
  try {
    const server = app.listen(SERVER_PORT, () => {
      console.log(`Server running in ${NODE_ENV} mode on port ${SERVER_PORT}`);
      console.log(`Client running on port ${CLIENT_PORT}`);
      console.log(`Allowed origins: ${ALLOWED_ORIGINS[NODE_ENV].join(', ')}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${SERVER_PORT} is busy, trying ${SERVER_PORT + 1}...`);
      process.env.SERVER_PORT = SERVER_PORT + 1;
      startServer();
    } else {
      console.error('Server failed to start:', error);
      process.exit(1);
    }
  }
};

// Error handling middleware
app.use(errorHandler);

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (error.code === 'EADDRINUSE') {
    console.log('Address in use, retrying...');
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();