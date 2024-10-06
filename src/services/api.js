// src/services/api.js
import { getDataPath } from '../utils/dataSourceUtil';

/**
 * Fetches JSON or CSV data from the specified file.
 * @param {string} relativePath - The relative path to the data file from the 'data/' directory (e.g., 'ecm/ecm_analysis_results.json').
 * @returns {Promise<Object|Array>} - The fetched and parsed data.
 */
export const fetchData = async (relativePath) => {
  try {
    const response = await fetch(getDataPath(relativePath));
    if (!response.ok) {
      throw new Error(`Failed to fetch ${relativePath}: ${response.statusText}`);
    }

    const fileExtension = relativePath.split('.').pop().toLowerCase();
    
    switch (fileExtension) {
      case 'json':
        return await response.json();
      case 'csv':
        const textData = await response.text();
        return parseCSV(textData);
      case 'geojson':
        return await response.json();
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error(`Error fetching data from ${relativePath}:`, error);
    throw error;
  }
};

/**
 * Parses CSV text data into an array of objects.
 * @param {string} csvText - The raw CSV text.
 * @returns {Array<Object>} - The parsed CSV data.
 */
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    return headers.reduce((entry, header, index) => {
      entry[header] = values[index];
      return entry;
    }, {});
  });
};

/**
 * Fetches data with caching mechanism.
 * @param {string} relativePath - The relative path to the data file.
 * @param {number} cacheTime - The time in milliseconds to cache the data (default: 5 minutes).
 * @returns {Promise<Object|Array>} - The fetched and parsed data.
 */
export const fetchDataWithCache = async (relativePath, cacheTime = 5 * 60 * 1000) => {
  const cacheKey = `cache_${relativePath}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < cacheTime) {
      return data;
    }
  }

  const data = await fetchData(relativePath);
  localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  return data;
};

/**
 * Posts data to a specified endpoint.
 * @param {string} endpoint - The API endpoint to post data to.
 * @param {Object} data - The data to be posted.
 * @returns {Promise<Object>} - The response from the server.
 */
export const postData = async (endpoint, data) => {
  try {
    const response = await fetch(getDataPath(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to post data to ${endpoint}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error posting data to ${endpoint}:`, error);
    throw error;
  }
};

export default {
  fetchData,
  fetchDataWithCache,
  postData,
};