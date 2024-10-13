// src/hooks/useSpatialData.js

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';
import { transformToWGS84 } from '../utils/coordinateTransform';

const useSpatialData = () => {
  const [state, setState] = useState({
    geoData: null,
    spatialWeights: null,
    flowMaps: null,
    analysisResults: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchSpatialData = async () => {
      try {
        const geoJsonURL = getDataPath('enhanced_unified_data_with_residual.geojson');
        const spatialWeightsURL = getDataPath('spatial_weights/transformed_spatial_weights.json');
        const flowMapsURL = getDataPath('network_data/flow_maps.csv');
        const analysisResultsURL = getDataPath('spatial_analysis_results.json');

        // Fetch all data in parallel
        const [geoJsonResponse, weightsResponse, flowMapsResponse, analysisResultsResponse] = await Promise.all([
          fetch(geoJsonURL, { headers: { Accept: 'application/geo+json' }, signal }),
          fetch(spatialWeightsURL, { headers: { Accept: 'application/json' }, signal }),
          fetch(flowMapsURL, { headers: { Accept: 'text/csv' }, signal }),
          fetch(analysisResultsURL, { headers: { Accept: 'application/json' }, signal }),
        ]);

        if (!geoJsonResponse.ok) throw new Error('Failed to fetch GeoJSON data.');
        if (!weightsResponse.ok) throw new Error('Failed to fetch spatial weights data.');
        if (!flowMapsResponse.ok) throw new Error('Failed to fetch flow maps data.');
        if (!analysisResultsResponse.ok) throw new Error('Failed to fetch analysis results.');

        const geoJsonData = await geoJsonResponse.json();
        const weightsData = await weightsResponse.json();
        const flowMapsText = await flowMapsResponse.text();
        const analysisResultsData = await analysisResultsResponse.json();

        // Parse CSV data using PapaParse
        const { data: flowMapsData, errors } = Papa.parse(flowMapsText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        if (errors.length > 0) {
          throw new Error(`Error parsing flow maps CSV: ${errors[0].message}`);
        }

        // Transform coordinates to WGS84
        const transformedFlowMapsData = flowMapsData.map(flow => {
          const transformedSource = transformToWGS84(flow.source_lng, flow.source_lat);
          const transformedTarget = transformToWGS84(flow.target_lng, flow.target_lat);

          return {
            ...flow,
            source_lat: transformedSource[1],
            source_lng: transformedSource[0],
            target_lat: transformedTarget[1],
            target_lng: transformedTarget[0],
          };
        });

        setState({
          geoData: geoJsonData,
          spatialWeights: weightsData,
          flowMaps: transformedFlowMapsData,
          analysisResults: analysisResultsData,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching spatial data:', err);
          setState(prevState => ({ ...prevState, loading: false, error: err.message }));
        }
      }
    };

    fetchSpatialData();

    return () => {
      controller.abort();
    };
  }, []);

  return state;
};

export default useSpatialData;