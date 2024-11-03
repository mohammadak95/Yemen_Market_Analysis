// src/hooks/useSpatialData.js

import { useSelector } from 'react-redux';

export const useSpatialData = (selectedCommodity) => {
  const {
    geoData,
    analysisResults,
    status,
    error,
  } = useSelector((state) => state.spatial);

  const selectedAnalysis = analysisResults?.find(
    (analysis) =>
      analysis.commodity?.toLowerCase() === selectedCommodity?.toLowerCase() &&
      analysis.regime === 'unified'
  );

  return {
    geoData,
    diagnostics: selectedAnalysis,
    loading: status === 'loading',
    error,
  };
};
