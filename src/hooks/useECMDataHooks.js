import { useState, useEffect, useCallback } from 'react';
import { getDataPath } from '../utils/dataPath';

export const useECMData = () => {
  const [unifiedData, setUnifiedData] = useState(null);
  const [unifiedStatus, setUnifiedStatus] = useState('idle');
  const [unifiedError, setUnifiedError] = useState(null);

  const [directionalData, setDirectionalData] = useState(null);
  const [directionalStatus, setDirectionalStatus] = useState('idle');
  const [directionalError, setDirectionalError] = useState(null);

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
      granger_causality:
        item.granger_causality?.conflict_intensity !== undefined
          ? item.granger_causality.conflict_intensity
          : 'N/A',
      spatial_autocorrelation: item.spatial_autocorrelation
        ? {
            Variable_1: item.spatial_autocorrelation.Variable_1 || 'N/A',
            Variable_2: item.spatial_autocorrelation.Variable_2 || 'N/A',
          }
        : null,
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
      granger_causality:
        item.granger_causality?.conflict_intensity !== undefined
          ? item.granger_causality.conflict_intensity
          : 'N/A',
      spatial_autocorrelation: null,
    }));
  }, []);

  useEffect(() => {
    const fetchUnifiedData = async () => {
      if (unifiedData) return; // Prevent re-fetching if data is already loaded
      setUnifiedStatus('loading');
      try {
        const path = getDataPath('ecm/ecm_analysis_results.json');
        console.log('Fetching Unified ECM data from:', path);

        const jsonData = await fetchData(path);
        console.log('Parsed Unified ECM data (first item):', jsonData.ecm_analysis[0]);

        const processedData = processUnifiedData(jsonData);
        setUnifiedData(processedData);
        setUnifiedStatus('succeeded');
      } catch (err) {
        console.error('Error fetching Unified ECM data:', err);
        setUnifiedError(err.message);
        setUnifiedStatus('failed');
      }
    };

    const fetchDirectionalData = async () => {
      if (directionalData) return; // Prevent re-fetching if data is already loaded
      setDirectionalStatus('loading');
      try {
        const northToSouthPath = getDataPath('ecm/ecm_results_north_to_south.json');
        const southToNorthPath = getDataPath('ecm/ecm_results_south_to_north.json');

        console.log('Fetching North to South ECM data from:', northToSouthPath);
        console.log('Fetching South to North ECM data from:', southToNorthPath);

        const [northToSouthData, southToNorthData] = await Promise.all([
          fetchData(northToSouthPath),
          fetchData(southToNorthPath),
        ]);

        console.log('Parsed North to South ECM data (first item):', northToSouthData[0]);
        console.log('Parsed South to North ECM data (first item):', southToNorthData[0]);

        const processedDirectionalData = {
          northToSouth: processDirectionalData(northToSouthData),
          southToNorth: processDirectionalData(southToNorthData),
        };

        setDirectionalData(processedDirectionalData);
        setDirectionalStatus('succeeded');
      } catch (err) {
        console.error('Error fetching Directional ECM data:', err);
        setDirectionalError(err.message);
        setDirectionalStatus('failed');
      }
    };

    fetchUnifiedData();
    fetchDirectionalData();
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