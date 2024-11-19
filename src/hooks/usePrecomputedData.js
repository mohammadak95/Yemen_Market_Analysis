// src/hooks/usePrecomputedData.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { calculateMarketMetrics } from '../utils/marketAnalysisUtils';

export function usePrecomputedData() {
  // Access data from Redux store
  const data = useSelector((state) => state.spatial.data);
  const loading = useSelector((state) => state.spatial.status.loading);
  const error = useSelector((state) => state.spatial.status.error);

  // Calculate metrics using useMemo for performance optimization
  const metrics = useMemo(() => {
    if (!data) return null;

    return calculateMarketMetrics(data);
  }, [data]);

  return { data, loading, error, metrics };
}