// server/app.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Environment variables with fallback ports
const SERVER_PORT = process.env.SERVER_PORT || 5001;
const CLIENT_PORT = process.env.CLIENT_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const ALLOWED_ORIGINS = {
  development: [`http://localhost:${CLIENT_PORT}`],
  production: ['https://mohammadak95.github.io']
};


// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ALLOWED_ORIGINS[NODE_ENV];
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
  maxAge: 86400
};

// Apply middleware
app.use(cors(corsOptions));
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

// Serve static files
app.use('/results', express.static(path.join(__dirname, '..', 'results'), staticOptions));
app.use('/data', express.static(path.join(__dirname, '..', 'public', 'data'), staticOptions));

// Start server with error handling
const startServer = async () => {
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
      // Try next port
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

// Start the server
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log('Address in use, retrying...');
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});