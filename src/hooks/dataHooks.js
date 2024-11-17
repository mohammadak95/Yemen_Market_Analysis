// Merged dataHooks.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedDataManager } from '../utils/UnifiedDataManager';
import { monitoringSystem } from '../utils/MonitoringSystem';

/**
 * Custom hook to fetch and manage TV-MII data.
 *
 * @returns {Object} - Contains tvmiiData, marketPairsData, status, and error.
 */
const useTVMIIData = () => {
  const [tvmiiData, setTvmiiData] = useState(null);
  const [marketPairsData, setMarketPairsData] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [error, setError] = useState(null);

  /**
   * Fetches and processes TV-MII data.
   */
  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');

      try {
        const result = await unifiedDataManager.loadTVMIIData();

        // Process and normalize data
        const processedTvmiiData = result.tvmiiData.map((item) => ({
          ...item,
          date: new Date(item.date),
          tvmii: item.tv_mii || item.tvmii || item.value,
        }));

        const processedMarketPairsData = result.marketPairsData.map((item) => ({
          ...item,
          date: new Date(item.date),
          tvmii: item.tv_mii || item.tvmii || item.value,
        }));

        // Update state with fetched data
        setTvmiiData(processedTvmiiData);
        setMarketPairsData(processedMarketPairsData);
        setStatus('succeeded');
      } catch (err) {
        monitoringSystem.error('Error loading TV-MII data:', err);
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, []);

  return { tvmiiData, marketPairsData, status, error };
};

/**
 * Custom hook to fetch and manage Price Differential data.
 *
 * @param {string} selectedCommodity - The commodity selected by the user.
 * @returns {Object} - Contains data, markets, commodities, status, and error.
 */
const usePriceDifferentialData = (selectedCommodity) => {
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [error, setError] = useState(null);

  /**
   * Processes and filters price differential data based on the selected commodity.
   *
   * @param {Object} jsonData - The raw JSON data fetched from the API.
   * @param {string} commodity - The selected commodity to filter data.
   * @returns {Object} - Contains filtered data and list of markets.
   */
  const processPriceDifferentialData = useCallback((jsonData, commodity) => {
    const marketsData = jsonData.markets || {};
    const marketsList = Object.keys(marketsData);

    // Filter data for the selected commodity
    const filteredData = {};
    marketsList.forEach((market) => {
      const commodityResults = marketsData[market].commodity_results[commodity];
      if (commodityResults) {
        filteredData[market] = {
          ...marketsData[market],
          commodity_results: {
            [commodity]: commodityResults,
          },
        };
      }
    });

    return { data: filteredData, markets: Object.keys(filteredData) };
  }, []);

  /**
   * Fetches and processes Price Differential data.
   */
  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const jsonData = await unifiedDataManager.loadPriceDifferentialData();

        // Extract commodities
        const commoditiesSet = new Set();
        Object.values(jsonData.markets || {}).forEach((marketData) => {
          const commodityResults = marketData.commodity_results || {};
          Object.keys(commodityResults).forEach((commodity) => {
            commoditiesSet.add(commodity);
          });
        });

        setCommodities(Array.from(commoditiesSet));

        // Process and filter data based on the selected commodity
        const filteredData = processPriceDifferentialData(jsonData, selectedCommodity);

        setData(filteredData.data);
        setMarkets(filteredData.markets);
        setStatus('succeeded');
      } catch (err) {
        monitoringSystem.error('Error loading Price Differential data:', err);
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, [selectedCommodity, processPriceDifferentialData]);

  return { data, markets, commodities, status, error };
};

/**
 * Custom hook to fetch and manage ECM (Error Correction Model) data.
 *
 * @returns {Object} - Contains unifiedData, directionalData, statuses, and errors.
 */
const useECMData = () => {
  const [unifiedData, setUnifiedData] = useState(null);
  const [unifiedStatus, setUnifiedStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [unifiedError, setUnifiedError] = useState(null);

  const [directionalData, setDirectionalData] = useState(null);
  const [directionalStatus, setDirectionalStatus] = useState('idle'); // 'idle' | 'loading' | 'succeeded' | 'failed'
  const [directionalError, setDirectionalError] = useState(null);

  const fetchInProgress = useRef(false);

  /**
   * useEffect to fetch ECM data on component mount.
   * Ensures that data fetching happens only once at a time.
   */
  useEffect(() => {
    if (fetchInProgress.current) return;

    const fetchAllData = async () => {
      fetchInProgress.current = true;
      setUnifiedStatus('loading');
      setDirectionalStatus('loading');

      try {
        const [unifiedData, northToSouthData, southToNorthData] = await unifiedDataManager.loadECMData();

        // Process unified data
        setUnifiedData(unifiedData);
        setUnifiedStatus('succeeded');

        // Process directional data
        setDirectionalData({
          northToSouth: northToSouthData,
          southToNorth: southToNorthData,
        });
        setDirectionalStatus('succeeded');
      } catch (err) {
        monitoringSystem.error('Error fetching ECM data:', err);
        setUnifiedError(err.message);
        setDirectionalError(err.message);
        setUnifiedStatus('failed');
        setDirectionalStatus('failed');
      } finally {
        fetchInProgress.current = false;
      }
    };

    fetchAllData();
  }, []);

  return {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  };
};

/**
 * Custom hook to fetch and aggregate unified spatial data.
 *
 * @returns {Object} - Contains aggregated data, loading status, and error.
 */
const useData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true); // 'loading' | 'succeeded' | 'failed'
  const [error, setError] = useState(null);

  /**
   * useEffect to fetch data on component mount.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const aggregatedData = await unifiedDataManager.loadUnifiedSpatialData();
        setData(aggregatedData);
        setLoading(false);
      } catch (err) {
        monitoringSystem.error('Error in useData:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

export {
  useTVMIIData,
  usePriceDifferentialData,
  useECMData,
  useData,
};
