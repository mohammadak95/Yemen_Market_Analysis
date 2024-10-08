// src/hooks/useSpatialData.js

import { useState, useEffect } from 'react';
import { getDataPath } from '../utils/dataPath';

/**
 * Custom hook to fetch and process spatial data.
 *
 * @returns {Object} - An object containing the spatial data, loading state, and error.
 */
const useSpatialData = () => {
  const [geoData, setGeoData] = useState(null); // For GeoJSON data
  const [spatialWeights, setSpatialWeights] = useState(null); // For spatial weights JSON
  const [flowMaps, setFlowMaps] = useState(null); // For flow maps CSV data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpatialData = async () => {
      setLoading(true);
      try {
        // Fetch GeoJSON data
        const geoJsonPath = getDataPath('enhanced_unified_data_with_residual.geojson');
        const geoResponse = await fetch(geoJsonPath, {
          headers: {
            Accept: 'application/geo+json',
          },
        });
        if (!geoResponse.ok) {
          throw new Error(`Failed to fetch GeoJSON data: ${geoResponse.status}`);
        }
        const geoJsonData = await geoResponse.json();
        setGeoData(geoJsonData);

        // Fetch spatial weights JSON
        const weightsPath = getDataPath('spatial_weights/spatial_weights.json');
        const weightsResponse = await fetch(weightsPath, {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!weightsResponse.ok) {
          throw new Error(`Failed to fetch spatial weights: ${weightsResponse.status}`);
        }
        const weightsData = await weightsResponse.json();
        setSpatialWeights(weightsData);

        // Fetch flow maps CSV data
        const flowMapsPath = getDataPath('network_data/flow_maps.csv');
        const flowResponse = await fetch(flowMapsPath);
        if (!flowResponse.ok) {
          throw new Error(`Failed to fetch flow maps data: ${flowResponse.status}`);
        }
        const flowText = await flowResponse.text();
        // Parse CSV data
        const flowCsvData = parseCSV(flowText);
        setFlowMaps(flowCsvData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching spatial data:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchSpatialData();
  }, []);

  return { geoData, spatialWeights, flowMaps, loading, error };
};

/**
 * Helper function to parse CSV data into JSON.
 *
 * @param {string} csvText - The CSV data as a string.
 * @returns {Array} - Parsed CSV data as an array of objects.
 */
const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.trim() === '') continue; // Skip empty lines
    const values = row.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index] ? values[index].trim() : '';
    });
    data.push(obj);
  }

  return data;
};

export default useSpatialData;
