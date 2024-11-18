//src/components/common/MarketDataLoader.js

import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Box, LinearProgress, Alert, Button } from '@mui/material';
import { loadSpatialData, selectSpatialStatus } from '../../slices/spatialSlice';
import { backgroundMonitor } from '../../utils/backgroundMonitor';

const MarketDataLoader = ({ children }) => {
  const dispatch = useDispatch();
  const { loading, error, isInitialized } = useSelector(selectSpatialStatus);
  const selectedCommodity = useSelector(state => state.spatial.ui.selectedCommodity);

  const initializeData = useCallback(async () => {
    if (!isInitialized && selectedCommodity) {
      const metric = backgroundMonitor.startMetric('initial-data-load');
      
      try {
        await dispatch(loadSpatialData({
          selectedCommodity,
          selectedDate: null
        })).unwrap();
        
        metric.finish({ status: 'success' });
      } catch (error) {
        console.error('Error initializing data:', error);
        metric.finish({ status: 'error', error: error.message });
      }
    }
  }, [dispatch, isInitialized, selectedCommodity]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  if (!isInitialized && loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error"
        sx={{ mt: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small"
            onClick={initializeData}
          >
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return children;
};
MarketDataLoader.propTypes = {
  children: PropTypes.node.isRequired,
};

export default React.memo(MarketDataLoader);
