// src/hooks/useUnifiedData.js

import { useState, useCallback, useEffect } from 'react';
import { getDataPath } from '../utils/dataUtils';
import _ from 'lodash';

const calculateUnifiedRegimeData = (data) => {
  // Group data by date and commodity
  const groupedByDateAndCommodity = _.groupBy(data, item => 
    `${item.date}_${item.commodity}`
  );

  return Object.entries(groupedByDateAndCommodity).map(([key, items]) => {
    // Only create unified entry if we have both north and south data
    const northData = items.find(item => item.regime === 'north');
    const southData = items.find(item => item.regime === 'south');

    if (!northData || !southData) return null;

    // Calculate averages for all metrics
    const [date, commodity] = key.split('_');
    return {
      date,
      commodity,
      regime: 'unified',
      price: calculateAverage([northData.price, southData.price]),
      usdprice: calculateAverage([northData.usdprice, southData.usdprice]),
      conflict_intensity: calculateAverage([
        northData.conflict_intensity, 
        southData.conflict_intensity
      ]),
      sample_size: northData.sample_size + southData.sample_size
    };
  }).filter(Boolean); // Remove null entries
};

const calculateAverage = (values) => {
  const validValues = values.filter(v => v != null && !isNaN(v));
  return validValues.length > 0 ? _.mean(validValues) : null;
};

const aggregateDataByDateRegimeCommodity = (features) => {
  // Group data by unique combinations
  const grouped = features.reduce((acc, feature) => {
    const props = feature.properties;
    if (!props.date || !props.exchange_rate_regime || !props.commodity) return acc;

    const normalizedCommodity = props.commodity.toLowerCase().trim();
    const key = `${props.date}_${props.exchange_rate_regime}_${normalizedCommodity}`;
    
    if (!acc[key]) {
      acc[key] = {
        date: props.date,
        regime: props.exchange_rate_regime.toLowerCase(),
        commodity: normalizedCommodity,
        prices: [],
        usdprices: [],
        conflict_intensities: [],
        count: 0
      };
    }

    if (isFinite(props.price)) {
      acc[key].prices.push(Number(props.price));
    }
    if (isFinite(props.usdprice)) {
      acc[key].usdprices.push(Number(props.usdprice));
    }
    if (isFinite(props.conflict_intensity)) {
      acc[key].conflict_intensities.push(Number(props.conflict_intensity));
    }
    acc[key].count++;

    return acc;
  }, {});

  return Object.values(grouped).map(entry => ({
    date: entry.date,
    regime: entry.regime,
    commodity: entry.commodity,
    price: entry.prices.length > 0 ? _.mean(entry.prices) : null,
    usdprice: entry.usdprices.length > 0 ? _.mean(entry.usdprices) : null,
    conflict_intensity: entry.conflict_intensities.length > 0 
      ? _.mean(entry.conflict_intensities) 
      : 0,
    sample_size: entry.count
  }));
};

export const useUnifiedData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const path = getDataPath('unified_data.geojson');
      console.debug('Fetching unified data from:', path);

      const response = await fetch(path, {
        headers: {
          Accept: 'application/geo+json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const geojsonData = await response.json();
      console.debug('GeoJSON data loaded, features count:', geojsonData.features?.length);

      if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
        throw new Error("Invalid GeoJSON structure: 'features' array is missing");
      }

      // Aggregate original data
      const aggregatedData = aggregateDataByDateRegimeCommodity(geojsonData.features);
      if (aggregatedData.length === 0) {
        throw new Error('No valid data after aggregation');
      }

      // Calculate unified regime data
      const unifiedData = calculateUnifiedRegimeData(aggregatedData);
      
      // Combine original and unified data
      const combinedData = [...aggregatedData, ...unifiedData];

      // Extract and normalize unique values
      const uniqueCommodities = [...new Set(
        combinedData.map(d => d.commodity.toLowerCase().trim())
      )].sort();
      
      const uniqueRegimes = [...new Set(
        combinedData.map(d => d.regime.toLowerCase().trim())
      )].sort();

      // Find min and max dates
      const dates = combinedData.map(d => new Date(d.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      setData({
        features: combinedData,
        commodities: uniqueCommodities,
        regimes: uniqueRegimes,
        dateRange: {
          min: minDate,
          max: maxDate,
        },
      });

      console.debug('Data processed successfully:', {
        featureCount: combinedData.length,
        commodities: uniqueCommodities,
        regimes: uniqueRegimes,
        dateRange: { min: minDate, max: maxDate },
      });

    } catch (err) {
      console.error('Error in useUnifiedData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getFilteredData = useCallback((commodity, selectedRegimes) => {
    if (!data?.features || !commodity || !selectedRegimes?.length) return [];
    
    const normalizedCommodity = commodity.toLowerCase().trim();
    const normalizedRegimes = selectedRegimes.map(r => r.toLowerCase().trim());
    
    return data.features.filter(item => 
      item.commodity === normalizedCommodity &&
      normalizedRegimes.includes(item.regime)
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    getFilteredData
  };
};