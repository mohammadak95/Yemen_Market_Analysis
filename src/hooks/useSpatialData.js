// src/hooks/useSpatialData.js

import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchSpatialData,
  selectSpatialData,
  selectAnalysisData,
  selectFlowsForPeriod,
} from '../slices/spatialSlice';

/**
 * Custom hook to manage spatial data fetching and processing.
 * Handles both selectedCommodity and selectedDate to fetch relevant data.
 *
 * @param {string} selectedCommodity - The commodity selected by the user.
 * @param {string} selectedDate - The date selected by the user in 'YYYY-MM' format.
 * @returns {object} - Contains spatial data, analysis data, flows data, loading state, errors, and utility functions.
 */
export const useSpatialData = (selectedCommodity, selectedDate) => {
  const dispatch = useDispatch();
  
  // Selectors to extract data from the Redux store
  const spatialData = useSelector(selectSpatialData);
  const analysisData = useSelector((state) =>
    selectAnalysisData(state, selectedCommodity)
  );
  const flowsData = useSelector((state) =>
    selectFlowsForPeriod(state, selectedDate)
  );

  // Local state to manage initialization status
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Effect to fetch spatial data when the selectedCommodity or selectedDate changes.
   * Ensures that data is fetched only once unless dependencies change.
   */
  useEffect(() => {
    if (!isInitialized && selectedCommodity && selectedDate) {
      dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))
        .unwrap()
        .then(() => setIsInitialized(true))
        .catch((error) =>
          console.error('Error initializing spatial data:', error)
        );
    }
  }, [dispatch, selectedCommodity, selectedDate, isInitialized]);

  /**
   * Function to refresh spatial data manually.
   * Can be triggered by user actions such as clicking a "Refresh" button.
   */
  const refreshData = useCallback(() => {
    if (selectedCommodity && selectedDate) {
      setIsInitialized(false); // Allow re-fetching
      return dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));
    }
    return Promise.reject(new Error('Commodity or date not selected'));
  }, [dispatch, selectedCommodity, selectedDate]);

  /**
   * Function to filter spatial data by a specific date.
   * Useful for scenarios where additional date-based filtering is required.
   *
   * @param {string} date - The date to filter data by, in 'YYYY-MM' format.
   * @returns {object|null} - Filtered spatial data or null if geoData is unavailable.
   */
  const filterDataByDate = useCallback(
    (date) => {
      if (!spatialData.geoData) return null;

      return {
        ...spatialData,
        geoData: {
          ...spatialData.geoData,
          features: spatialData.geoData.features.filter((feature) =>
            feature.properties.date?.startsWith(date)
          ),
        },
        flows: spatialData.flows.filter((flow) => flow.date.startsWith(date)),
      };
    },
    [spatialData]
  );

  /**
   * Function to retrieve data for a specific region.
   * Fetches features and flows associated with the given region ID.
   *
   * @param {string} regionId - The identifier of the region.
   * @returns {object|null} - Contains features, flows, and weights for the region or null if geoData is unavailable.
   */
  const getRegionData = useCallback(
    (regionId) => {
      if (!spatialData.geoData) return null;

      const normalizedRegionId = normalizeRegionName(regionId);

      const features = spatialData.geoData.features.filter(
        (feature) =>
          feature.properties.region_id === normalizedRegionId ||
          feature.properties.region === normalizedRegionId
      );

      const flows = spatialData.flows.filter(
        (flow) =>
          normalizeRegionName(flow.source) === normalizedRegionId ||
          normalizeRegionName(flow.target) === normalizedRegionId
      );

      return {
        features,
        flows,
        weights: spatialData.weights[normalizedRegionId],
      };
    },
    [spatialData]
  );

  /**
   * Utility function to normalize region names.
   * Ensures consistency in region naming across different data sources.
   *
   * @param {string} name - The original region name.
   * @returns {string} - The normalized region name.
   */
  const normalizeRegionName = (name) => {
    if (!name) return '';

    const specialCases = {
      "san'a'": 'sanaa',
      'san_a__governorate': 'sanaa',
      "sana'a": 'sanaa',
      'sanʿaʾ': 'sanaa',
      'amanat_al_asimah': 'amanat al asimah',
      'lahij': 'lahj',
      '_adan': 'aden',
      'ta_izz': 'taizz',
      'al_hudaydah': 'al hudaydah',
      'al_jawf': 'al jawf',
      'shabwah': 'shabwah',
      'hadhramaut': 'hadramaut',
    };

    let normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/['`]/g, '') // Remove special quotes
      .replace(/[\s_-]+/g, '_') // Replace spaces/hyphens with underscore
      .trim();

    return specialCases[normalized] || normalized;
  };

  return {
    ...spatialData,
    analysisData,
    flowsData,
    isInitialized,
    refreshData,
    filterDataByDate,
    getRegionData,
  };
};

// Add default export
export default useSpatialData;