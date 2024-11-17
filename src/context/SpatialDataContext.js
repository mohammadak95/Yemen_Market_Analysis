// src/context/SpatialDataContext.js

import React, { createContext, useContext, useState, useCallback } from 'react';
import { spatialSystem } from '../utils/SpatialSystem';
import { monitoringSystem } from '../utils/MonitoringSystem';
import { dataTransformationSystem } from '../utils/DataTransformationSystem';

const SpatialDataContext = createContext(null);

export const SpatialDataProvider = ({ children }) => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null,
    processedData: null,
    metadata: null
  });

  const fetchSpatialData = useCallback(async (selectedCommodity, selectedDate) => {
    const metric = monitoringSystem.startMetric('fetch-spatial-data');

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Load raw data using spatial system
      const rawData = await spatialSystem.processSpatialData(
        selectedCommodity,
        selectedDate
      );

      // Transform data using data transformation system
      const processedData = await dataTransformationSystem.transformTimeSeriesData(
        rawData.timeSeriesData,
        {
          includeGarch: true,
          includeConflict: true,
          smoothing: true
        }
      );

      setState({
        loading: false,
        error: null,
        data: rawData,
        processedData,
        metadata: {
          commodity: selectedCommodity,
          date: selectedDate,
          processedAt: new Date().toISOString(),
          quality: rawData.validation?.qualityMetrics || {}
        }
      });

      metric.finish({ 
        status: 'success',
        dataPoints: rawData.timeSeriesData?.length,
        processedPoints: processedData.length
      });
      
    } catch (error) {
      monitoringSystem.error('Error fetching spatial data:', error);
      
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));

      metric.finish({ status: 'error', error: error.message });
    }
  }, []);

  const clearData = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
      processedData: null,
      metadata: null
    });
  }, []);

  const value = {
    ...state,
    fetchSpatialData,
    clearData
  };

  return (
    <SpatialDataContext.Provider value={value}>
      {children}
    </SpatialDataContext.Provider>
  );
};

export const useSpatialDataContext = () => {
  const context = useContext(SpatialDataContext);
  if (!context) {
    throw new Error('useSpatialDataContext must be used within a SpatialDataProvider');
  }
  return context;
};