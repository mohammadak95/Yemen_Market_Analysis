import { useState, useEffect } from 'react';
import axios from 'axios';
import { getDataUrl } from '../utils/dataSourceUtil';

const useDataLoading = (filename) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = getDataUrl(filename);
        const response = await axios.get(url);
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [filename]);

  return { data, loading, error };
};

export default useDataLoading;