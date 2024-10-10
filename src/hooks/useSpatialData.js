// src/hooks/useSpatialData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';
import Papa from 'papaparse';

/**
 * Custom hook to fetch and process spatial data.
 *
 * @returns {Object} - An object containing the spatial data, loading state, and error.
 */
const useSpatialData = () => {
  const [geoData, setGeoData] = useState(null); // For GeoJSON data
  const [spatialWeights, setSpatialWeights] = useState(null); // For spatial weights JSON
  const [flowMaps, setFlowMaps] = useState(null); // For flow maps CSV data
  const [analysisResults, setAnalysisResults] = useState(null); // For spatial analysis JSON
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpatialData = async () => {
      setLoading(true);
      try {
        const geoJsonPath = getDataPath('enhanced_unified_data_with_residual.geojson');
        const weightsPath = getDataPath('spatial_weights/spatial_weights.json');
        const flowMapsPath = getDataPath('network_data/flow_maps.csv');
        const analysisResultsPath = getDataPath('spatial_analysis_results.json');

        const [geoResponse, weightsResponse, flowResponse, analysisResponse] = await Promise.all([
          fetch(geoJsonPath, { headers: { Accept: 'application/geo+json' } }),
          fetch(weightsPath, { headers: { Accept: 'application/json' } }),
          fetch(flowMapsPath),
          fetch(analysisResultsPath, { headers: { Accept: 'application/json' } }),
        ]);

        // Handle GeoJSON Response
        if (!geoResponse.ok) {
          throw new Error(`Failed to fetch GeoJSON data: ${geoResponse.status}`);
        }
        const geoJsonData = await geoResponse.json();
        setGeoData(geoJsonData);

        // Handle Spatial Weights Response
        if (!weightsResponse.ok) {
          throw new Error(`Failed to fetch spatial weights: ${weightsResponse.status}`);
        }
        const weightsData = await weightsResponse.json();
        setSpatialWeights(weightsData);

        // Handle Flow Maps CSV Response
        if (!flowResponse.ok) {
          throw new Error(`Failed to fetch flow maps data: ${flowResponse.status}`);
        }
        const flowText = await flowResponse.text();

        // Function to Remove BOM
        const removeBOM = (str) => {
          if (str.charCodeAt(0) === 0xfeff) {
            return str.slice(1);
          }
          return str;
        };

        const cleanedFlowText = removeBOM(flowText);

        // Preprocess CSV Text to Enclose All Fields in Double Quotes
        const properlyQuotedFlowText = cleanedFlowText
          .split('\n')
          .map((line) => {
            const fields = line.split(',');
            const fixedFields = fields.map((field) => {
              const escapedField = field.replace(/"/g, '""'); // Escape existing double quotes
              return `"${escapedField}"`; // Enclose in double quotes
            });
            return fixedFields.join(',');
          })
          .join('\n');

        // Parse the Fixed CSV Text with PapaParse
        const parsedFlow = Papa.parse(properlyQuotedFlowText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          delimiter: ',', // Explicitly specify the delimiter
          quoteChar: '"', // Specify the quote character
        });

        // Log Parsing Errors (if any)
        if (parsedFlow.errors.length > 0) {
          console.error('CSV Parsing Errors:', parsedFlow.errors);
          throw new Error('Failed to parse flow maps CSV data.');
        }

        // Log Parsed Flow Maps for Verification
        console.log('Parsed Flow Maps:', parsedFlow.data);

        setFlowMaps(parsedFlow.data);

        // Handle Spatial Analysis Results Response
        if (!analysisResponse.ok) {
          throw new Error(`Failed to fetch spatial analysis results: ${analysisResponse.status}`);
        }
        const analysisData = await analysisResponse.json();
        setAnalysisResults(analysisData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching spatial data:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchSpatialData();
  }, []);

  return { geoData, spatialWeights, flowMaps, analysisResults, loading, error };
};

export default useSpatialData;
