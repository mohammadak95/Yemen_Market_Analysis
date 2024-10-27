// src/hooks/useECMData.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDataPath } from '../utils/dataPath';

/**
 * Custom hook to fetch and process ECM data.
 * It handles both unified and directional analyses.
 */
export const useECMData = () => {
  const [unifiedData, setUnifiedData] = useState(null);
  const [unifiedStatus, setUnifiedStatus] = useState('idle');
  const [unifiedError, setUnifiedError] = useState(null);

  const [directionalData, setDirectionalData] = useState(null);
  const [directionalStatus, setDirectionalStatus] = useState('idle');
  const [directionalError, setDirectionalError] = useState(null);

  const fetchInProgress = useRef(false);

  /**
   * Fetches JSON data from a given URL.
   * Replaces 'NaN' strings with null to ensure JSON validity.
   */
  const fetchData = useCallback(async (url) => {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return JSON.parse(text.replace(/NaN/g, 'null'));
  }, []);

  /**
   * Processes unified ECM data by extracting necessary fields,
   * including alpha, beta, and gamma coefficients.
   */
  const processUnifiedData = useCallback((data) => {
    return data.ecm_analysis.map((item) => ({
      ...item,
      diagnostics: {
        Variable_1: item.diagnostics?.Variable_1 || 'N/A',
        Variable_2: item.diagnostics?.Variable_2 || 'N/A',
      },
      irf: Array.isArray(item.irf?.impulse_response?.irf) ? item.irf.impulse_response.irf : [],
      granger_causality: item.granger_causality || 'N/A',
      spatial_autocorrelation: item.spatial_autocorrelation
        ? {
            Variable_1: {
              Moran_I: item.spatial_autocorrelation.Variable_1?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_1?.Moran_p_value || null,
            },
            Variable_2: {
              Moran_I: item.spatial_autocorrelation.Variable_2?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_2?.Moran_p_value || null,
            },
          }
        : null,
      residuals: Array.isArray(item.residuals) ? item.residuals : [],
      fittedValues: Array.isArray(item.fittedValues) ? item.fittedValues : [],
      
      // Adjusted extraction for alpha, beta, gamma from nested object or direct access
      alpha: item.regression_results?.alpha !== undefined ? item.regression_results.alpha : item.alpha || null,
      beta: item.regression_results?.beta !== undefined ? item.regression_results.beta : item.beta || null,
      gamma: item.regression_results?.gamma !== undefined ? item.regression_results.gamma : item.gamma || null,
    }));
  }, []);

  /**
   * Processes directional ECM data by extracting necessary fields,
   * including alpha, beta, and gamma coefficients.
   */
  const processDirectionalData = useCallback((data) => {
    return data.map((item) => ({
      ...item,
      diagnostics: {
        Variable_1: item.diagnostics?.Variable_1 || 'N/A',
        Variable_2: item.diagnostics?.Variable_2 || 'N/A',
      },
      irf: Array.isArray(item.irf?.impulse_response?.irf) ? item.irf.impulse_response.irf : [],
      granger_causality: item.granger_causality || 'N/A',
      spatial_autocorrelation: item.spatial_autocorrelation
        ? {
            Variable_1: {
              Moran_I: item.spatial_autocorrelation.Variable_1?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_1?.Moran_p_value || null,
            },
            Variable_2: {
              Moran_I: item.spatial_autocorrelation.Variable_2?.Moran_I || null,
              Moran_p_value: item.spatial_autocorrelation.Variable_2?.Moran_p_value || null,
            },
          }
        : null,
      residuals: Array.isArray(item.residuals) ? item.residuals : [],
      fittedValues: Array.isArray(item.fittedValues) ? item.fittedValues : [],
      alpha: item.alpha !== undefined ? item.alpha : null,
      beta: item.beta !== undefined ? item.beta : null,
      gamma: item.gamma !== undefined ? item.gamma : null,
    }));
  }, []);

  /**
   * useEffect to fetch data on component mount.
   * It ensures that data fetching happens only once at a time.
   */
  useEffect(() => {
    if (fetchInProgress.current) return;

    const fetchAllData = async () => {
      fetchInProgress.current = true;
      setUnifiedStatus('loading');
      setDirectionalStatus('loading');

      try {
        const unifiedPath = getDataPath('ecm/ecm_analysis_results.json');
        const northToSouthPath = getDataPath('ecm/ecm_results_north_to_south.json');
        const southToNorthPath = getDataPath('ecm/ecm_results_south_to_north.json');

        const [unifiedJsonData, northToSouthData, southToNorthData] = await Promise.all([
          fetchData(unifiedPath),
          fetchData(northToSouthPath),
          fetchData(southToNorthPath),
        ]);

        // Process unified data to include alpha, beta, gamma
        const processedUnifiedData = processUnifiedData(unifiedJsonData);
        setUnifiedData(processedUnifiedData);
        setUnifiedStatus('succeeded');

        // Process directional data to include alpha, beta, gamma
        const processedDirectionalData = {
          northToSouth: processDirectionalData(northToSouthData),
          southToNorth: processDirectionalData(southToNorthData),
        };
        setDirectionalData(processedDirectionalData);
        setDirectionalStatus('succeeded');
      } catch (err) {
        console.error('Error fetching ECM data:', err);
        setUnifiedError(err.message);
        setDirectionalError(err.message);
        setUnifiedStatus('failed');
        setDirectionalStatus('failed');
      } finally {
        fetchInProgress.current = false;
      }
    };

    fetchAllData();
  }, [fetchData, processUnifiedData, processDirectionalData]);

  return {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  };
};
