// src/hooks/useSpatialDataOptimized.js

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';

const generateCacheKey = (commodity) => `spatial_data_${commodity?.toLowerCase()}`;

const dataCache = new Map();

export const useSpatialDataOptimized = (selectedCommodity) => {
  const {
    geoData,
    spatialWeights,
    flowMaps,
    analysisResults,
    uniqueMonths,
    status,
    error,
  } = useSelector((state) => state.spatial);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const lastCommodityRef = useRef(selectedCommodity);

  useEffect(() => {
    lastCommodityRef.current = selectedCommodity;
  }, [selectedCommodity]);

  const processedData = useMemo(() => {
    if (!geoData?.features) return null;

    const cacheKey = generateCacheKey(selectedCommodity);
    if (dataCache.has(cacheKey)) {
      return dataCache.get(cacheKey);
    }

    const selectedAnalysisResult = analysisResults.find(
      (result) => result?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    );

    const processed = {
      geoData,
      spatialWeights,
      flowMaps: flowMaps.filter(
        (flow) => flow?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
      ),
      analysisResults: selectedAnalysisResult,
      uniqueMonths,
    };

    dataCache.set(cacheKey, processed);
    return processed;
  }, [geoData, spatialWeights, flowMaps, analysisResults, uniqueMonths, selectedCommodity]);

  useEffect(() => {
    if (status === 'loading') {
      setLoadingProgress(50);
    } else if (status === 'succeeded') {
      setLoadingProgress(100);
    } else if (status === 'failed') {
      setLoadingProgress(0);
    }
  }, [status]);

  useEffect(() => {
    if (dataCache.size > 10) {
      const keys = Array.from(dataCache.keys());
      keys.slice(0, keys.length - 10).forEach((key) => dataCache.delete(key));
    }
  }, []);

  return {
    ...processedData,
    status,
    error,
    loadingProgress,
  };
};
