// src/context/SpatialDataContext.js

import React, { createContext, useContext, useState } from 'react';
import { useSpatialDataService } from '../services/spatialDataService';

const SpatialDataContext = createContext(null);

export const SpatialDataProvider = ({ children }) => {
  const spatialService = useSpatialDataService();
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null
  });

  const value = {
    ...state,
    spatialService,
    setState
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
    throw new Error('useSpatialData must be used within a SpatialDataProvider');
  }
  return context;
};