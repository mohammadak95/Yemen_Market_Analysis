// src/context/SpatialDataContext.js

import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const SpatialDataContext = createContext(null);

export const SpatialDataProvider = ({ children }) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null,
    metadata: null
  });

  const fetchSpatialData = useCallback(async (selectedCommodity, selectedDate) => {
    const metric = backgroundMonitor.startMetric('fetch-spatial-data');
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await precomputedDataManager.processSpatialData(
        selectedCommodity,
        selectedDate
      );

      setState({
        loading: false,
        error: null,
        data: result,
        metadata: result.metadata
      });

      metric.finish({ status: 'success' });
    } catch (error) {
      console.error('Error fetching spatial data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      
      metric.finish({ status: 'error', error: error.message });
    }
  }, []);

  const value = {
    ...state,
    fetchSpatialData
  };

  return (
    <SpatialDataContext.Provider value={value}>
      {children}
    </SpatialDataContext.Provider>
  );
};
SpatialDataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useSpatialData = () => {
  const context = useContext(SpatialDataContext);
  if (!context) {
    throw new Error('useSpatialData must be used within a SpatialDataProvider');
  }
  return context;
};

export const usePrecomputedData = (commodity, date) => {
  const { data, loading, error, fetchSpatialData } = useSpatialData();

  React.useEffect(() => {
    if (commodity) {
      fetchSpatialData(commodity, date);
    }
  }, [commodity, date, fetchSpatialData]);

  return { data, loading, error };
};