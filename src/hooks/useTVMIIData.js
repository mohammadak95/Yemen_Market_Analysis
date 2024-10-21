// src/hooks/useTVMIIData.js

import { useState, useEffect } from 'react';
import { fetchJson } from '../utils/fetchJson';

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
        const [fetchedTvmiiData, fetchedMarketPairsData] = await Promise.all([
          fetchJson('tv_mii_results.json'),
          fetchJson('tv_mii_market_results.json'),
        ]);

        // Convert the 'date' strings to JavaScript Date objects
        const processedTvmiiData = fetchedTvmiiData.map(item => ({
          ...item,
          date: new Date(item.date),
        }));

        const processedMarketPairsData = fetchedMarketPairsData.map(item => ({
          ...item,
          date: new Date(item.date),
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
