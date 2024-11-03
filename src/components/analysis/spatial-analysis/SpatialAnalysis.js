// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSpatialData } from '../../../slices/spatialSlice';
import SpatialMap from './SpatialMap';
import DiagnosticsTests from './DiagnosticsTests';
import DynamicInterpretation from './DynamicInterpretation';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Box, Paper, Typography, Alert, Button } from '@mui/material';
import { useWindowWidth } from '../../../hooks/useWindowWidth';
import SpatialErrorBoundary from './SpatialErrorBoundary';
import { RefreshCw } from 'lucide-react';

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
    // Fetch spatial data when the component mounts or when selectedCommodity changes
    dispatch(fetchSpatialData(selectedCommodity));
  }, [dispatch, selectedCommodity]);

  const analysisData = useMemo(() => {
    if (!analysisResults) return null;
    const result = analysisResults.find(
      (result) => result.commodity.toLowerCase() === selectedCommodity.toLowerCase()
    );
    return result || null;
  }, [analysisResults, selectedCommodity]);

  const viewConfig = {
    center: [15.552727, 48.516388], // Coordinates for Yemen
    zoom: 6,
  };

  const handleViewChange = useCallback((map) => {
    // Handle map view changes if needed
  }, []);

  return (
    <SpatialErrorBoundary onRetry={() => dispatch(fetchSpatialData(selectedCommodity))}>
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h5" gutterBottom>
            Spatial Analysis: {selectedCommodity}
          </Typography>

          {geoData ? (
            <SpatialMap
              data={geoData}
              diagnostics={analysisData}
              viewConfig={viewConfig}
              onViewChange={handleViewChange}
              windowWidth={windowWidth}
            />
          ) : (
            <Typography variant="body2">No geographic data available.</Typography>
          )}

          {analysisData ? (
            <>
              <DiagnosticsTests data={analysisData} />
              <DynamicInterpretation data={analysisData} />
            </>
          ) : (
            <Typography variant="body2">No analysis data available.</Typography>
          )}
        </Paper>
      </Box>

      {status === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <LoadingSpinner progress={loadingProgress} />
        </Box>
      )}

      {status === 'failed' && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshCw size={16} />}
              onClick={() => dispatch(fetchSpatialData(selectedCommodity))}
            >
              Retry
            </Button>
          }
        >
          <Typography variant="subtitle1">Error Loading Data</Typography>
          <Typography variant="body2">
            {error?.message || 'Failed to load spatial data.'}
          </Typography>
        </Alert>
      )}
    </SpatialErrorBoundary>
  );
};

export default SpatialAnalysis;
