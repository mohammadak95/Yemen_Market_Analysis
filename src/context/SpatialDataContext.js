// src/context/SpatialDataContext.js

import React, { createContext, useContext, useState, useCallback } from 'react';
import { spatialDataManager } from '../utils/SpatialDataManager';

const SpatialDataContext = createContext(null);

export const SpatialDataProvider = ({ children }) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null,
  });

  const fetchSpatialData = useCallback(
    async (selectedCommodity, selectedDate) => {
      setState({ loading: true, error: null, data: null });
      try {
        const data = await spatialDataManager.processSpatialData(
          selectedCommodity,
          selectedDate
        );
        setState({ loading: false, error: null, data });
      } catch (error) {
        console.error('Error fetching spatial data:', error);
        setState({ loading: false, error: error.message, data: null });
      }
    },
    []
  );

  const value = {
    ...state,
    fetchSpatialData,
  };

  return (
    <SpatialDataContext.Provider value={value}>
      {children}
    </SpatialDataContext.Provider>
  );
};

export const useSpatialData = () => {
  const context = useContext(SpatialDataContext);
  if (!context) {
    throw new Error(
      'useSpatialData must be used within a SpatialDataProvider'
    );
  }
  return context;
};