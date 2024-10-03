import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataSourceUtil';

const useDataLoading = (relativePath) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
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
    loadData();
  }, [relativePath]);

  return { data, loading, error };
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

export default useDataLoading;