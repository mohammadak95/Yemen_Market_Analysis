// src/utils/dataSourceUtil.js

/**
 * Constructs the full path for a given data file, accommodating nested directories.
 * @param {string} relativePath - The relative path to the data file from the 'data/' directory (e.g., 'ecm/ecm_analysis_results.json').
 * @returns {string} - The full URL to the data file.
 */
export const getDataPath = (relativePath) => `${process.env.PUBLIC_URL}/data/${relativePath}`;