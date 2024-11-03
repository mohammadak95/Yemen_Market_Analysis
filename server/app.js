// server/app.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Environment variables
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = {
  development: ['http://localhost:3000'],
  production: ['https://mohammadak95.github.io']
};

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ALLOWED_ORIGINS[NODE_ENV];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Body parsing middleware
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

// Serve static files from results directory
app.use('/results', express.static(path.join(__dirname, '..', 'results'), staticOptions));
app.use('/data', express.static(path.join(__dirname, '..', 'public', 'data'), staticOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Route to get available data files
app.get('/api/available-data', (req, res) => {
  try {
    const dataTypes = {
      spatial: [
        'unified_data.geojson',
        'spatial_analysis_results.json',
        'network_data/time_varying_flows.csv'
      ],
      choropleth: [
        'choropleth_data/average_prices.csv',
        'choropleth_data/conflict_intensity.csv',
        'choropleth_data/geoBoundaries-YEM-ADM1.geojson'
      ],
      ecm: [
        'ecm/ecm_analysis_results.json',
        'ecm/ecm_results_north_to_south.json',
        'ecm/ecm_results_south_to_north.json'
      ]
    };

    res.json({
      status: 'success',
      data: dataTypes
    });
  } catch (error) {
    next(error);
  }
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  // In production, serve the index.html for client-side routing
  if (NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
  } else {
    res.status(404).json({
      status: 'error',
      message: 'Not Found'
    });
  }
});

// Error handling
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});