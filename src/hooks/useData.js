// src/hooks/useData.js

import { useState, useEffect, useCallback } from 'react';
import { getDataPath } from '../utils/dataPath';

function aggregateDataByDateRegimeCommodity(features) {
  const aggregationMap = {};

  features.forEach((feature) => {
    const properties = feature.properties;
    const date = new Date(properties.date);
    const regime = (properties.exchange_rate_regime || '').trim().toLowerCase();
    const commodity = (properties.commodity || '').trim().toLowerCase();

    if (isNaN(date)) {
      console.warn(`Invalid date encountered: ${properties.date}`);
      return;
    }

    const dateKey = date.toISOString().split('T')[0];
    const key = `${dateKey}_${regime}_${commodity}`;

    if (!aggregationMap[key]) {
      aggregationMap[key] = {
        date: date,
        regime: regime,
        commodity: commodity,
        price: 0,
        usdprice: 0,
        conflict_intensity: 0,
        count: 0,
      };
    }

    aggregationMap[key].price += parseFloat(properties.price || 0);
    aggregationMap[key].usdprice += parseFloat(properties.usdprice || 0);
    aggregationMap[key].conflict_intensity += parseFloat(properties.conflict_intensity || 0);
    aggregationMap[key].count += 1;
  });

  const aggregatedData = Object.values(aggregationMap).map((item) => ({
    date: item.date,
    regime: item.regime,
    commodity: item.commodity,
    price: item.price / item.count,
    usdprice: item.usdprice / item.count,
    conflict_intensity: item.conflict_intensity / item.count,
  }));

  const unifiedAggregationMap = {};

  aggregatedData.forEach((item) => {
    const dateKey = item.date.toISOString().split('T')[0];
    const key = `${dateKey}_${item.commodity}_unified`;

    if (!unifiedAggregationMap[key]) {
      unifiedAggregationMap[key] = {
        date: item.date,
        regime: 'unified',
        commodity: item.commodity,
        price: 0,
        usdprice: 0,
        conflict_intensity: 0,
        count: 0,
      };
    }

    unifiedAggregationMap[key].price += item.price;
    unifiedAggregationMap[key].usdprice += item.usdprice;
    unifiedAggregationMap[key].conflict_intensity += item.conflict_intensity;
    unifiedAggregationMap[key].count += 1;
  });

  const unifiedData = Object.values(unifiedAggregationMap).map((item) => ({
    date: item.date,
    regime: item.regime,
    commodity: item.commodity,
    price: item.price / item.count,
    usdprice: item.usdprice / item.count,
    conflict_intensity: item.conflict_intensity / item.count,
  }));

  const finalAggregatedData = [...aggregatedData, ...unifiedData];

  finalAggregatedData.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.regime < b.regime) return -1;
    if (a.regime > b.regime) return 1;
    if (a.commodity < b.commodity) return -1;
    if (a.commodity > b.commodity) return 1;
    return 0;
  });

  return finalAggregatedData;
}

const useData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const path = getDataPath('unified_data.geojson');
      console.log('Fetching data from:', path);  // Log the file path being used

      const response = await fetch(path, {
        headers: {
          Accept: 'application/geo+json',
        },
      });

      console.log('Response status:', response.status);  // Log the response status

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const geojsonData = await response.json();
      console.log('GeoJSON data loaded, features count:', geojsonData.features.length);  // Log features count

      if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
        throw new Error("Invalid GeoJSON structure: 'features' array is missing");
      }

      // Log partial GeoJSON response for debugging
      console.log('Raw GeoJSON data:', JSON.stringify(geojsonData.features.slice(0, 2), null, 2));  // Log first 2 features

      const aggregatedData = aggregateDataByDateRegimeCommodity(geojsonData.features);

      const commoditiesSet = new Set(aggregatedData.map((d) => d.commodity));
      const regimesSet = new Set(aggregatedData.map((d) => d.regime));
      const uniqueCommodities = Array.from(commoditiesSet);
      const uniqueRegimes = Array.from(regimesSet);

      setData({
        features: aggregatedData,
        commodities: uniqueCommodities,
        regimes: uniqueRegimes,
        dateRange: {
          min: aggregatedData.reduce(
            (min, d) => (d.date < min ? d.date : min),
            aggregatedData[0].date
          ),
          max: aggregatedData.reduce(
            (max, d) => (d.date > max ? d.date : max),
            aggregatedData[0].date
          ),
        },
      });
    } catch (err) {
      console.error('Error fetching data:', err);  // Log any errors encountered
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
};

export default useData;