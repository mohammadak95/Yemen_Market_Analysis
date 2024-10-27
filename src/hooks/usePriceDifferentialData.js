// src/hooks/usePriceDifferentialData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

const usePriceDifferentialData = (selectedCommodity) => {
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const path = getDataPath('price_diff_results/price_differential_results.json');
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const jsonData = await response.json();

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
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, [selectedCommodity]);

  return { data, markets, commodities, status, error };
};

const processPriceDifferentialData = (jsonData, commodity) => {
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
};

export default usePriceDifferentialData;
