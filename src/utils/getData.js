// src/utils/getData.js

import { backgroundMonitor } from './backgroundMonitor';
import { spatialDebugUtils } from './spatialDebugUtils';
import Papa from 'papaparse';
import _ from 'lodash';

const BASE_PATH = 'public/results';

export const getDataPath = (fileName) => {
  return `${BASE_PATH}/${fileName}`;
};

export const getCommodityPath = (commodity) => {
  const normalizedCommodity = commodity
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
    
  return `${BASE_PATH}/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedCommodity}.json`;
};

async function fetchWithRetry(path, retries = 3) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      return text;
    } catch (error) {
      lastError = error;
      if (i === retries - 1) break;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  
  throw lastError;
}

export async function loadData(commodity, date) {
  const metric = backgroundMonitor.startMetric('load-data');
  
  try {
    // Load core files
    const paths = {
      spatialAnalysis: getDataPath('spatial_analysis_results.json'),
      spatialWeights: getDataPath('transformed_spatial_weights.json'),
      geoBoundaries: getDataPath('geoBoundaries-YEM-ADM1.geojson'),
      enhancedUnified: getDataPath('enhanced_unified_data_with_residual.geojson'),
      commodityData: getCommodityPath(commodity)
    };

    const results = await Promise.all(
      Object.entries(paths).map(async ([key, path]) => {
        try {
          const text = await fetchWithRetry(path);
          return [key, JSON.parse(text)];
        } catch (err) {
          spatialDebugUtils.error(`Error loading ${key}: ${err.message}`);
          return [key, null];
        }
      })
    );

    const parsedData = Object.fromEntries(results);

    // Validate that we have all required data
    const missingData = Object.entries(parsedData)
      .filter(([_, value]) => value === null)
      .map(([key]) => key);

    if (missingData.length > 0) {
      throw new Error(`Failed to load required data: ${missingData.join(', ')}`);
    }

    // Filter by date if provided
    if (date) {
      parsedData.commodityData = filterDataByDate(parsedData.commodityData, date);
    }

    metric.finish({ status: 'success' });
    return parsedData;

  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    throw new Error(`Failed to load data: ${error.message}`);
  }
}

function filterDataByDate(data, targetDate) {
  if (!data || !targetDate) return data;
  
  const date = new Date(targetDate);
  return {
    ...data,
    time_series_data: data.time_series_data.filter(entry => 
      new Date(entry.month) <= date
    ),
    market_shocks: data.market_shocks?.filter(shock => 
      new Date(shock.date) <= date
    ) || []
  };
}

export async function loadCSV(path) {
  try {
    const text = await fetchWithRetry(path);
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    throw new Error(`Failed to load CSV: ${error.message}`);
  }
}