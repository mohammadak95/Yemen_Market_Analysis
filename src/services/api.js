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

    if (fileExtension === 'json') {
      const data = await response.json();
      return data;
    } else if (fileExtension === 'csv') {
      const textData = await response.text();
      const parsedData = parseCSV(textData);
      return parsedData;
    } else {
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

  const data = lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = values[index];
    });
    return entry;
  });

  return data;
};