// src/hooks/useSpatialData.js

import { useState, useEffect, useRef } from 'react';
import { spatialDataLoader } from './spatialDataLoader';
import { getDataPath } from '../utils/dataPath';

export const useSpatialData = () => {
  const [state, setState] = useState({
    geoData: null,
    loading: true,
    error: null,
    uniqueMonths: [],
  });

  const abortControllerRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Load the main GeoJSON data
        const geoData = await spatialDataLoader.loadData(
          getDataPath('unified_data.geojson'),
          abortControllerRef.current.signal
        );

        // Extract unique months from the data
        const months = new Set();
        geoData.features.forEach((feature) => {
          if (feature.properties.date) {
            const date = new Date(feature.properties.date);
            if (!isNaN(date.getTime())) {
              months.add(date.toISOString().slice(0, 7));
            }
          }
        });

        const uniqueMonths = Array.from(months)
          .map((month) => new Date(`${month}-01`))
          .sort((a, b) => a - b);

        setState((prev) => ({
          ...prev,
          geoData,
          loading: false,
          uniqueMonths,
        }));
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    };

    loadData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return state;
};

export default useSpatialData;
