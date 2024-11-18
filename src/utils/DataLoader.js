// src/utils/DataLoader.js

import { config } from '../config/appConfig';
import { monitoringSystem } from './MonitoringSystem';
import Papa from 'papaparse';

// Add this debug code temporarily at the top of your DataLoader.js to verify the file exists
const checkFileExistence = async () => {
  const path = '/data/time_varying_flows.csv';
  try {
    const response = await fetch(path);
    console.debug('File check:', {
      path,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
  } catch (error) {
    console.error('File check failed:', error);
  }
};

checkFileExistence();

/**
 * Helper function to ensure proper path construction
 */
const pathCache = new Map();

export const constructDataPath = (filename) => {
  if (pathCache.has(filename)) {
    return pathCache.get(filename);
  }

  const path = buildDataPath(filename);
  pathCache.set(filename, path);
  return path;
};

const buildDataPath = (filename) => {
  // Get environment configuration
  const isDev = process.env.NODE_ENV === 'development';
  const isGitHubPages = window.location.hostname.includes('github.io');
  const PUBLIC_URL = process.env.PUBLIC_URL || '';
  
  // Normalize the filename
  const normalizedFilename = filename.replace(/^\/+/, '').trim();
  
  // Construct base path according to environment
  const basePath = isDev ? '/data' : 
    (isGitHubPages ? `${PUBLIC_URL}/data` : '/data');
    
  // Construct and normalize the full path
  const fullPath = `${basePath}/${normalizedFilename}`.replace(/\/+/g, '/');
  
  // Debug logging
  console.debug('Path Construction:', {
    isDev,
    isGitHubPages,
    PUBLIC_URL,
    filename,
    normalizedFilename,
    basePath,
    fullPath
  });

  return fullPath;
};

/**
 * Add this helper function to handle CSV files specifically
 */
export const loadCSVFile = async (filename) => {
  const path = constructDataPath(filename);
  console.debug(`Loading CSV file: ${filename} from path: ${path}`);
  
  try {
    const response = await fetch(path, {
      headers: {
        'Accept': 'text/csv',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load CSV file ${filename}: ${response.status}`);
    }

    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(new Error(`CSV parsing failed: ${error.message}`))
      });
    });
  } catch (error) {
    monitoringSystem.error(`Error loading CSV file ${filename}:`, error);
    throw error;
  }
};

/**
 * Verify availability of critical data files
 */
export const verifyDataFiles = async () => {
  const metric = monitoringSystem.startMetric('verify-data-files');

  const criticalFiles = [
    'time_varying_flows.csv',
    'tv_mii_results.json',
    'price_differential_results.json',
    'spatial_analysis_results.json',
    'transformed_spatial_weights.json'
  ];

  try {
    const results = await Promise.all(
      criticalFiles.map(async (file) => {
        const path = constructDataPath(file);
        try {
          const response = await fetch(path, {
            method: 'HEAD',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Accept': file.endsWith('.csv') ? 'text/csv' : 'application/json'
            }
          });

          console.debug(`Checking file ${file} at path: ${path} - Status: ${response.status}`);

          return {
            file,
            exists: response.ok,
            status: response.status,
            path
          };
        } catch (error) {
          console.error(`Error checking ${file}:`, error);
          return {
            file,
            exists: false,
            error: error.message,
            path
          };
        }
      })
    );

    const missingFiles = results.filter(r => !r.exists);
    if (missingFiles.length > 0) {
      monitoringSystem.warn('Missing data files:', missingFiles);
    }

    metric.finish({ status: 'success' });
    return results;

  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    throw error;
  }
};

/**
 * Load a specific data file
 */
export const loadFile = async (filename, options = {}) => {
  const path = constructDataPath(filename);
  
  console.debug(`Loading file: ${filename} from path: ${path}`);
  
  const defaultHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      credentials: 'same-origin' // Added for CORS handling
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status}`);
    }

    return response;
  } catch (error) {
    monitoringSystem.error(`Error loading ${filename}:`, error);
    throw error;
  }
};

/**
 * Check if all required data files are available
 */
export const checkDataAvailability = async () => {
  try {
    const results = await verifyDataFiles();
    const allFilesAvailable = results.every(r => r.exists);
    
    if (!allFilesAvailable) {
      const missingFiles = results
        .filter(r => !r.exists)
        .map(r => ({ file: r.file, path: r.path }));
      
      console.warn('Data files not available:', missingFiles);
    }
    
    return allFilesAvailable;
  } catch (error) {
    console.error('Error checking data availability:', error);
    return false;
  }
};

/**
 * Load data file with retry mechanism
 */
export const loadFileWithRetry = async (filename, options = {}) => {
  const maxRetries = config.errors.maxRetries || 3;
  const retryDelay = config.errors.retryDelay || 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await loadFile(filename, options);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      console.warn(`Retry attempt ${attempt} for ${filename}`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
};

