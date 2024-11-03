// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSpatialData } from '../../../slices/spatialSlice';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorMessage from '../../common/ErrorMessage';
import { Box } from '@mui/material';
import { useWindowWidth } from '../../../hooks/useWindowWidth';

const SpatialAnalysis = ({ selectedCommodity }) => {
  const dispatch = useDispatch();
  const {
    geoData,
    analysisResults,
    status,
    error,
    loadingProgress,
  } = useSelector((state) => state.spatial);

  const windowWidth = useWindowWidth();

  useEffect(() => {
    dispatch(fetchSpatialData(selectedCommodity));
  }, [dispatch, selectedCommodity]);

  const analysisData = useMemo(() => {
    if (!analysisResults) return null;
    const result = analysisResults.find(
      (result) => result.commodity.toLowerCase() === selectedCommodity.toLowerCase()
    );
    console.log('analysisData:', result); // Add this line to debug
    return result;
  }, [analysisResults, selectedCommodity]);

  if (status === 'loading') return <LoadingSpinner progress={loadingProgress} />;
  if (status === 'failed') return <ErrorMessage message={error?.message || 'Failed to load spatial data.'} />;

  const viewConfig = {
    center: [15.552727, 48.516388],
    zoom: 6,
  };

  const handleViewChange = (map) => {};

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <SpatialMap
        data={geoData}
        diagnostics={analysisData}
        viewConfig={viewConfig}
        onViewChange={handleViewChange}
        windowWidth={windowWidth}
      />
      {analysisData && <SpatialDiagnostics diagnostics={analysisData} />}
      {analysisData && <DynamicInterpretation data={analysisData} />}
    </Box>
  );
};

export default SpatialAnalysis;
