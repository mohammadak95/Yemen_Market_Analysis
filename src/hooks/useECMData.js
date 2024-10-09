// src/hooks/useECMData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

const useECMData = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const path = getDataPath('ecm/ecm_analysis_results.json');
        console.log('Fetching ECM data from:', path);

        const response = await fetch(path, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('ECM data response status:', response.status);

        let text = await response.text();
        console.log('Raw ECM data (first 200 characters):', text.substring(0, 200));
        
        // Replace NaN, Infinity, and -Infinity with null
        text = text.replace(/:\s*(NaN|-?Infinity)\s*([,}])/g, ': null$2');
        console.log('Processed ECM data (first 200 characters):', text.substring(0, 200));

        const jsonData = JSON.parse(text);
        const ecmData = jsonData.ecm_analysis; // Access the array under "ecm_analysis" key
        
        if (!Array.isArray(ecmData)) {
          throw new Error('ECM data is not in the expected format');
        }

        console.log('Parsed ECM data (first item):', JSON.stringify(ecmData[0], null, 2));

        // Process the data to ensure it's in the correct format
        const processedData = ecmData.map(item => ({
          ...item,
          diagnostics: {
            Variable_1: item.diagnostics.Variable_1, // usdprice
            Variable_2: item.diagnostics.Variable_2  // conflict_intensity
          },
          irf: item.irf.impulse_response,
          granger_causality: item.granger_causality.conflict_intensity,
          spatial_autocorrelation: {
            Variable_1: item.spatial_autocorrelation.Variable_1, // usdprice
            Variable_2: item.spatial_autocorrelation.Variable_2  // conflict_intensity
          }
        }));

        console.log('Processed ECM data (first item):', JSON.stringify(processedData[0], null, 2));

        setData(processedData);
        setStatus('succeeded');
      } catch (err) {
        console.error('Error fetching ECM data:', err);
        setError(err.message);
        setStatus('failed');
      }
    };

    fetchData();
  }, []);

  return { data, status, error };
};

export default useECMData;