// src/hooks/useDataLoading.js
import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataSourceUtil';

/**
 * Custom hook to load data from a specified file.
 * @param {string} relativePath - The relative path to the data file (e.g., 'ecm/ecm_analysis_results.json').
 * @returns {Object} - An object containing the data, loading state, and error state.
 */
const useDataLoading = (relativePath) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(getDataPath(relativePath));
        if (!response.ok) {
          throw new Error(`Failed to fetch ${relativePath}: ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type');
        let result;
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else if (contentType.includes('text/csv')) {
          const text = await response.text();
          result = parseCSV(text);
        } else {
          throw new Error(`Unsupported content type: ${contentType}`);
        }
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [relativePath]);

  return { data, loading, error };
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

export default useDataLoading;