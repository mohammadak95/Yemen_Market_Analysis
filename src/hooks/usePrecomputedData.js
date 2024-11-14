// src/hooks/usePrecomputedData.js

import { useState, useEffect, useCallback } from 'react';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';

export function usePrecomputedData(commodity, date) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);

  // Main data loading function
  const loadData = useCallback(async () => {
    if (!commodity) {
      setLoading(false);
      return;
    }

    const metric = backgroundMonitor.startMetric('load-precomputed-data');
    setLoading(true);
    setError(null);

    try {
      // Process data using precomputedDataManager
      const data = await precomputedDataManager.processSpatialData(commodity, date);

      if (!data) {
        throw new Error('No data available for selected commodity and date');
      }

      setProcessedData(data);
      metric.finish({ status: 'success' });
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
      metric.finish({ status: 'error', error: err.message });
    } finally {
      setLoading(false);
    }
  }, [commodity, date]);

  // Load data when inputs change
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data: processedData,
    loading,
    error,
    refresh: loadData,
  };
}