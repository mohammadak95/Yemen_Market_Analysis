// src/hooks/useDataLoader.js
import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

const useDataLoader = (relativePath) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(getDataPath(relativePath))
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [relativePath]);

  return { data, loading, error };
};

export default useDataLoader;