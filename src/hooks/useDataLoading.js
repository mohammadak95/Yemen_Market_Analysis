//src/hooks/useDataLoading.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataSourceUtil';

const useDataLoading = (relativePath) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(getDataPath(relativePath));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
        // Store the data in localStorage for offline use
        localStorage.setItem(`data_${relativePath}`, JSON.stringify(result));
      } catch (e) {
        console.error("Error fetching data:", e);
        // If fetching fails, try to load from localStorage
        const storedData = localStorage.getItem(`data_${relativePath}`);
        if (storedData) {
          setData(JSON.parse(storedData));
        } else {
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [relativePath]);

  return { data, loading, error };
};

export default useDataLoading;