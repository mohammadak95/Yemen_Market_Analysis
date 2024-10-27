// sr./hooks/useECMData.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDataPath } from '../utils/dataPath';

export const useECMData = () => {
  const [unifiedData, setUnifiedData] = useState(null);
  const [unifiedStatus, setUnifiedStatus] = useState('idle');
  const [unifiedError, setUnifiedError] = useState(null);

  const [directionalData, setDirectionalData] = useState(null);
  const [directionalStatus, setDirectionalStatus] = useState('idle');
  const [directionalError, setDirectionalError] = useState(null);

  const fetchInProgress = useRef(false);

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
      residuals: item.residuals || [],
      fittedValues: item.fittedValues || [],
    }));
  }, []);

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
      residuals: item.residuals || [],
      fittedValues: item.fittedValues || [],
    }));
  }, []);

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

        const processedUnifiedData = processUnifiedData(unifiedJsonData);
        setUnifiedData(processedUnifiedData);
        setUnifiedStatus('succeeded');

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