import { useState, useEffect, useCallback } from 'react';
import { getDataPath } from '../utils/dataPath';

function aggregateDataByDateRegimeCommodity(features) {
  const aggregationMap = {};

  features.forEach((feature) => {
    const properties = feature.properties;
    const dateStr = properties.date;
    const date = new Date(dateStr);
    // Use exchange_rate_regime instead of regime
    const regime = (properties.exchange_rate_regime || '').trim().toLowerCase();
    const commodity = (properties.commodity || '').trim().toLowerCase();

    if (isNaN(date.getTime())) {
      console.warn(`Invalid date encountered: ${dateStr}`);
      return;
    }

    // Skip entries with empty regime or commodity
    if (!regime || !commodity) {
      console.warn('Skipping feature with missing regime or commodity:', properties);
      return;
    }

    const dateKey = date.toISOString().split('T')[0];
    const key = `${dateKey}_${regime}_${commodity}`;

    if (!aggregationMap[key]) {
      aggregationMap[key] = {
        date: dateKey, // Store as ISO string for consistency
        regime: regime,
        commodity: commodity,
        price: 0,
        usdprice: 0,
        conflict_intensity: 0,
        count: 0,
      };
    }

    // Safely parse numeric values with fallback to 0
    const price = parseFloat(properties.price) || 0;
    const usdprice = parseFloat(properties.usdprice) || 0;
    const conflict_intensity = parseFloat(properties.conflict_intensity) || 0;

    aggregationMap[key].price += price;
    aggregationMap[key].usdprice += usdprice;
    aggregationMap[key].conflict_intensity += conflict_intensity;
    aggregationMap[key].count += 1;
  });

  // Calculate averages for regular data
  const aggregatedData = Object.values(aggregationMap).map((item) => ({
    date: item.date,
    regime: item.regime,
    commodity: item.commodity,
    price: item.price / item.count,
    usdprice: item.usdprice / item.count,
    conflict_intensity: item.conflict_intensity / item.count,
  }));

  // Create unified data
  const unifiedAggregationMap = {};

  aggregatedData.forEach((item) => {
    const key = `${item.date}_${item.commodity}_unified`;

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

  // Calculate averages for unified data
  const unifiedData = Object.values(unifiedAggregationMap).map((item) => ({
    date: item.date,
    regime: item.regime,
    commodity: item.commodity,
    price: item.price / item.count,
    usdprice: item.usdprice / item.count,
    conflict_intensity: item.conflict_intensity / item.count,
  }));

  // Combine and sort all data
  const finalAggregatedData = [...aggregatedData, ...unifiedData].sort((a, b) => {
    // Sort by date first
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    
    // Then by regime
    const regimeCompare = a.regime.localeCompare(b.regime);
    if (regimeCompare !== 0) return regimeCompare;
    
    // Finally by commodity
    return a.commodity.localeCompare(b.commodity);
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

      const aggregatedData = aggregateDataByDateRegimeCommodity(geojsonData.features);

      if (aggregatedData.length === 0) {
        throw new Error('No valid data after aggregation');
      }

      // Extract unique values and ensure they're sorted
      const uniqueCommodities = [...new Set(aggregatedData.map(d => d.commodity))].sort();
      const uniqueRegimes = [...new Set(aggregatedData.map(d => d.regime))].sort();

      // Find min and max dates
      const dates = aggregatedData.map(d => new Date(d.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      setData({
        features: aggregatedData,
        commodities: uniqueCommodities,
        regimes: uniqueRegimes,
        dateRange: {
          min: minDate,
          max: maxDate
        }
      });

      console.log('Data processed successfully:', {
        featureCount: aggregatedData.length,
        commodities: uniqueCommodities,
        regimes: uniqueRegimes,
        dateRange: { min: minDate, max: maxDate }
      });

    } catch (err) {
      console.error('Error in useData:', err);
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