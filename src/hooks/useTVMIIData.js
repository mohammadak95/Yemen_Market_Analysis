// src/hooks/useTVMIIData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

/**
 * Custom hook to fetch TV-MII data.
 *
 * @returns {Object} - Contains tvmiiData, marketPairsData, status, and error.
 */
const useTVMIIData = () => {
  const [tvmiiData, setTvmiiData] = useState(null);
  const [marketPairsData, setMarketPairsData] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');

      try {
        const tvmiiPath = getDataPath('tv_mii_results.json');
        const marketPairsPath = getDataPath('tv_mii_market_results.json');

        const [tvmiiResponse, marketPairsResponse] = await Promise.all([
          fetch(tvmiiPath),
          fetch(marketPairsPath),
        ]);

        if (!tvmiiResponse.ok) throw new Error(`HTTP error! status: ${tvmiiResponse.status}`);
        if (!marketPairsResponse.ok) throw new Error(`HTTP error! status: ${marketPairsResponse.status}`);

        const fetchedTvmiiData = await tvmiiResponse.json();
        const fetchedMarketPairsData = await marketPairsResponse.json();

        // Process and normalize data
        const processedTvmiiData = fetchedTvmiiData.map((item) => ({
          ...item,
          date: new Date(item.date),
          tvmii: item.tv_mii || item.tvmii || item.value,
        }));

        const processedMarketPairsData = fetchedMarketPairsData.map((item) => ({
          ...item,
          date: new Date(item.date),
          tvmii: item.tv_mii || item.tvmii || item.value,
        }));

        // Update state with fetched data
        setTvmiiData(processedTvmiiData);
        setMarketPairsData(processedMarketPairsData);
        setStatus('succeeded');
      } catch (err) {
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, []);

  return { tvmiiData, marketPairsData, status, error };
};

export default useTVMIIData;
