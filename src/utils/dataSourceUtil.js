import { getDataPath } from '../utils/dataSourceUtil';

export const fetchData = async (relativePath) => {
  try {
    const response = await fetch(getDataPath(relativePath));
    if (!response.ok) {
      throw new Error(`Failed to fetch ${relativePath}: ${response.statusText}`);
    }

    const fileExtension = relativePath.split('.').pop().toLowerCase();

    if (fileExtension === 'json') {
      return await response.json();
    } else if (fileExtension === 'csv') {
      const textData = await response.text();
      return parseCSV(textData);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error(`Error fetching data from ${relativePath}:`, error);
    throw error;
  }
};

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