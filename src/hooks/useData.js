// src/hooks/useData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

/**
 * Aggregates data by date, regime, and commodity, averaging metrics across all regions.
 *
 * @param {Array} features - The raw dataset from GeoJSON.
 * @returns {Array} - The aggregated dataset.
 */
function aggregateDataByDateRegimeCommodity(features) {
  const aggregationMap = {};

  features.forEach((feature) => {
    const properties = feature.properties;
    const date = new Date(properties.date);
    const regime = (properties.regime || '').trim().toLowerCase();
    const commodity = (properties.commodity || '').trim().toLowerCase();

    // Ensure date is valid
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
        residual: 0,
        count: 0,
      };
    }

    aggregationMap[key].price += parseFloat(properties.price || 0);
    aggregationMap[key].usdprice += parseFloat(properties.usdprice || 0);
    aggregationMap[key].conflict_intensity += parseFloat(properties.conflict_intensity || 0);
    aggregationMap[key].residual += parseFloat(properties.residual || 0);
    aggregationMap[key].count += 1;
  });

  // Convert the map to an array and compute averages
  const aggregatedData = Object.values(aggregationMap).map((item) => ({
    date: item.date,
    regime: item.regime,
    commodity: item.commodity,
    price: item.price / item.count,
    usdprice: item.usdprice / item.count,
    conflict_intensity: item.conflict_intensity / item.count,
    residual: item.residual / item.count,
  }));

  // Sort the data by date, regime, and commodity
  aggregatedData.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.regime < b.regime) return -1;
    if (a.regime > b.regime) return 1;
    if (a.commodity < b.commodity) return -1;
    if (a.commodity > b.commodity) return 1;
    return 0;
  });

  return aggregatedData;
}

/**
 * Custom hook to fetch and process data.
 *
 * @returns {Object} - An object containing the processed data, loading state, and error.
 */
const useData = () => {
  const [data, setData] = useState(null); // Processed data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const path = getDataPath('enhanced_unified_data_with_residual.geojson');
        console.log('Fetching data from:', path);
        const response = await fetch(path, {
          headers: {
            Accept: 'application/geo+json',
          },
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const geojsonData = await response.json();
        console.log('GeoJSON data loaded, features count:', geojsonData.features.length);

        if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
          throw new Error("Invalid GeoJSON structure: 'features' array is missing");
        }

        // Aggregate data by date, regime, and commodity, averaging across regions
        const aggregatedData = aggregateDataByDateRegimeCommodity(geojsonData.features);

        // Extract unique commodities and regimes from the data
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
        console.error('Error fetching data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

export default useData;