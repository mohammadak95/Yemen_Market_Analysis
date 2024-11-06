import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { spatialProcessor } from '../utils/enhancedSpatialProcessor';
import { useDispatch } from 'react-redux';
import { updateLoadingProgress } from '../slices/spatialSlice';

export default function SpatialDataContainer({ selectedCommodity, children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!selectedCommodity) return;

      try {
        setLoading(true);
        dispatch(updateLoadingProgress(10));

        const processedData = await spatialProcessor.processSpatialData(selectedCommodity);
        
        if (mounted) {
          setData(processedData);
          setError(null);
          dispatch(updateLoadingProgress(100));
        }
      } catch (err) {
        console.error('Error loading spatial data:', err);
        if (mounted) {
          setError(err.message);
          dispatch(updateLoadingProgress(0));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [selectedCommodity, dispatch]);

  if (!selectedCommodity) {
    return (
      <Alert severity="info">
        Please select a commodity to analyze
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading data: {error}
      </Alert>
    );
  }

  if (!data) return null;

  return React.Children.map(children, child =>
    React.cloneElement(child, { spatialData: data })
  );
}