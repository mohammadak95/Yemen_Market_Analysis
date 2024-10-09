// src/hooks/useECMDataHooks.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

// Custom hook to fetch Unified and Directional ECM Data
export const useECMData = () => {
  // Unified ECM States
  const [unifiedData, setUnifiedData] = useState(null);
  const [unifiedStatus, setUnifiedStatus] = useState('idle');
  const [unifiedError, setUnifiedError] = useState(null);

  // Directional ECM States
  const [directionalData, setDirectionalData] = useState(null);
  const [directionalStatus, setDirectionalStatus] = useState('idle');
  const [directionalError, setDirectionalError] = useState(null);

  useEffect(() => {
    // Fetch Unified ECM Data
    const fetchUnifiedData = async () => {
      setUnifiedStatus('loading');
      try {
        const path = getDataPath('ecm/ecm_analysis_results.json');
        console.log('Fetching Unified ECM data from:', path);

        const response = await fetch(path, {
          headers: {
            Accept: 'application/json',
          },
        });

        console.log('Unified ECM data response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const sanitizedText = text.replace(/NaN/g, 'null'); // Replace NaN with null
        console.log('Raw Unified ECM data (first 200 characters):', sanitizedText.substring(0, 200) + '...');

        const jsonData = JSON.parse(sanitizedText);
        console.log('Parsed Unified ECM data (first item):', jsonData.ecm_analysis[0]);

        // Process the data to ensure consistency
        const processedData = jsonData.ecm_analysis.map((item) => ({
          ...item,
          diagnostics: {
            Variable_1: item.diagnostics.Variable_1 || 'N/A',
            Variable_2: item.diagnostics.Variable_2 || 'N/A',
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
            : null, // Handle absence of spatial_autocorrelation
        }));

        setUnifiedData(processedData);
        setUnifiedStatus('succeeded');
      } catch (err) {
        console.error('Error fetching Unified ECM data:', err);
        setUnifiedError(err.message);
        setUnifiedStatus('failed');
      }
    };

    // Fetch Directional ECM Data
    const fetchDirectionalData = async () => {
      setDirectionalStatus('loading');
      try {
        const northToSouthPath = getDataPath('ecm/ecm_results_north_to_south.json');
        const southToNorthPath = getDataPath('ecm/ecm_results_south_to_north.json');

        console.log('Fetching North to South ECM data from:', northToSouthPath);
        console.log('Fetching South to North ECM data from:', southToNorthPath);

        const [northToSouthResponse, southToNorthResponse] = await Promise.all([
          fetch(northToSouthPath, { headers: { Accept: 'application/json' } }),
          fetch(southToNorthPath, { headers: { Accept: 'application/json' } }),
        ]);

        console.log('North to South ECM data response status:', northToSouthResponse.status);
        console.log('South to North ECM data response status:', southToNorthResponse.status);

        if (!northToSouthResponse.ok || !southToNorthResponse.ok) {
          throw new Error(
            `HTTP error! status: ${northToSouthResponse.status}, ${southToNorthResponse.status}`
          );
        }

        const northToSouthText = await northToSouthResponse.text();
        const southToNorthText = await southToNorthResponse.text();

        const sanitizedNorthToSouthText = northToSouthText.replace(/NaN/g, 'null');
        const sanitizedSouthToNorthText = southToNorthText.replace(/NaN/g, 'null');

        console.log(
          'Raw North to South ECM data (first 200 characters):',
          sanitizedNorthToSouthText.substring(0, 200) + '...'
        );
        console.log(
          'Raw South to North ECM data (first 200 characters):',
          sanitizedSouthToNorthText.substring(0, 200) + '...'
        );

        const northToSouthData = JSON.parse(sanitizedNorthToSouthText);
        const southToNorthData = JSON.parse(sanitizedSouthToNorthText);

        console.log('Parsed North to South ECM data (first item):', northToSouthData[0]);
        console.log('Parsed South to North ECM data (first item):', southToNorthData[0]);

        const processedDirectionalData = {
          northToSouth: northToSouthData.map((item) => ({
            ...item,
            diagnostics: {
              Variable_1: item.diagnostics.Variable_1 || 'N/A',
              Variable_2: item.diagnostics.Variable_2 || 'N/A',
            },
            irf: Array.isArray(item.irf?.impulse_response?.irf) ? item.irf.impulse_response.irf : [],
            granger_causality:
              item.granger_causality?.conflict_intensity !== undefined
                ? item.granger_causality.conflict_intensity
                : 'N/A',
            spatial_autocorrelation: null, // Directional ECM does not have Spatial Autocorrelation
          })),
          southToNorth: southToNorthData.map((item) => ({
            ...item,
            diagnostics: {
              Variable_1: item.diagnostics.Variable_1 || 'N/A',
              Variable_2: item.diagnostics.Variable_2 || 'N/A',
            },
            irf: Array.isArray(item.irf?.impulse_response?.irf) ? item.irf.impulse_response.irf : [],
            granger_causality:
              item.granger_causality?.conflict_intensity !== undefined
                ? item.granger_causality.conflict_intensity
                : 'N/A',
            spatial_autocorrelation: null, // Directional ECM does not have Spatial Autocorrelation
          })),
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
  }, []);

  return {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  };
};
