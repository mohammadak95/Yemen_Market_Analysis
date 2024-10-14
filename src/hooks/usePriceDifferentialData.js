// src/hooks/usePriceDifferentialData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

const usePriceDifferentialData = () => {
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const path = getDataPath('price_diff_results/price_differential_results.json');
        console.log('Fetching price differential data from:', path);

        const response = await fetch(path, {
          headers: {
            Accept: 'application/json',
          },
        });

        console.log('Price differential data response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        console.log('Parsed price differential data:', jsonData);

        // Extract markets data
        const marketsData = jsonData.markets || {};
        const marketsList = Object.keys(marketsData);

        setData(marketsData);
        setMarkets(marketsList);
        setStatus('succeeded');
      } catch (err) {
        console.error('Error fetching price differential data:', err);
        console.error('Error details:', err.message);
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, []);

  return { data, markets, status, error };
};

export default usePriceDifferentialData;
