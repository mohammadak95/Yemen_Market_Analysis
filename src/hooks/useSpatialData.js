// src/hooks/useSpatialData.js

import { useSelector } from 'react-redux';
import { useMemo } from 'react';



export const useSpatialData = (selectedCommodity) => {
  const {
    geoData,
    analysisResults,
    status,
    error,
    spatialWeights,
    flowMaps
  } = useSelector((state) => state.spatial);

  const processedData = useMemo(() => {
    if (!analysisResults || !Array.isArray(analysisResults)) {
      return null;
    }

    const selectedAnalysis = analysisResults.find(
      (analysis) =>
        analysis?.commodity?.toLowerCase() === selectedCommodity?.toLowerCase() &&
        analysis?.regime === 'unified'
    );

    return {
      analysis: selectedAnalysis,
      flows: flowMaps?.filter(
        flow => flow.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
      ) || [],
      weights: spatialWeights
    };
  }, [analysisResults, flowMaps, spatialWeights, selectedCommodity]);

  return {
    geoData: geoData || null,
    ...processedData,
    loading: status === 'loading',
    error: error || null,
    hasData: Boolean(geoData && processedData?.analysis)
  };
};