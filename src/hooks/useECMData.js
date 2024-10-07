// src/hooks/useECMData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

const useECMData = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const path = getDataPath('ecm/ecm_analysis_results.json');
        const response = await fetch(path, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const ecmData = await response.json();

        setData(ecmData);
        setStatus('succeeded');
      } catch (err) {
        console.error('Error fetching ECM data:', err);
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, []);

  return { data, status, error };
};

export default useECMData;
