// src/hooks/useSpatialData.js

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';
import { transformToWGS84 } from '../utils/coordinateTransform';

const fetchWithErrorHandling = async (url, options = {}, errorMessage, signal) => {
  try {
    const response = await fetch(url, { ...options, signal });
    if (!response.ok) {
      throw new Error(`${errorMessage}: HTTP error (Status: ${response.status})`);
    }
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`Fetch aborted for ${url}`);
    } else {
      console.error(`Error during fetch for ${url}:`, err);
      throw new Error(`${errorMessage}: ${err.message}`);
    }
  }
};

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

        console.log('GeoJSON URL:', geoJsonURL);
        console.log('Spatial Weights URL:', spatialWeightsURL);
        console.log('Flow Maps URL:', flowMapsURL);
        console.log('Analysis Results URL:', analysisResultsURL);

        const geoJsonResponse = await fetchWithErrorHandling(
          geoJsonURL,
          { headers: { Accept: 'application/geo+json' } },
          'Failed to fetch enhanced GeoJSON data',
          signal
        );

        const contentType = geoJsonResponse.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/geo+json')) {
          const text = await geoJsonResponse.text();
          console.error(`Unexpected Content-Type for ${geoJsonURL}: ${contentType}`);
          console.error('Response body:', text);
          throw new Error(`Expected GeoJSON but received Content-Type: ${contentType}`);
        }

        const geoJsonClone = geoJsonResponse.clone();
        const geoJsonText = await geoJsonClone.text();
        console.log('Raw GeoJSON response:', geoJsonText.substring(0, 1000));

        const geoJsonData = await geoJsonResponse.json();
        console.log('GeoJSON data loaded, features count:', geoJsonData.features.length);

        const [weightsResponse, flowMapsResponse, analysisResultsResponse] = await Promise.all([
          fetchWithErrorHandling(
            spatialWeightsURL,
            { headers: { Accept: 'application/json' } },
            'Failed to fetch spatial weights data',
            signal
          ),
          fetchWithErrorHandling(
            flowMapsURL,
            { headers: { Accept: 'text/csv' } },
            'Failed to fetch flow maps data',
            signal
          ),
          fetchWithErrorHandling(
            analysisResultsURL,
            { headers: { Accept: 'application/json' } },
            'Failed to fetch spatial analysis results data',
            signal
          ),
        ]);

        const weightsData = await weightsResponse.json();

        const flowMapsText = await flowMapsResponse.text();
        console.log('Raw Flow Maps CSV:', flowMapsText.substring(0, 1000));

        const parseResult = Papa.parse(flowMapsText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        if (parseResult.errors.length) {
          throw new Error(`CSV Parsing Error: ${parseResult.errors[0].message}`);
        }

        let flowMapsData = parseResult.data;

        // Transform coordinates from projected system (assumed EPSG:3857) to WGS84
        const sourceEPSG = 'EPSG:3857'; // You may change this depending on the actual projection
        flowMapsData = flowMapsData.map(flow => {
          // Ensure that source and target coordinates are properly transformed to WGS84
          const transformedSource = transformToWGS84(flow.source_lng, flow.source_lat, sourceEPSG);
          const transformedTarget = transformToWGS84(flow.target_lng, flow.target_lat, sourceEPSG);
          
          // Return the transformed coordinates in WGS84
          return {
            ...flow,
            source_lat: transformedSource[1],
            source_lng: transformedSource[0],
            target_lat: transformedTarget[1],
            target_lng: transformedTarget[0],
          };
        });

        console.log('Transformed Flow Maps Data:', flowMapsData.slice(0, 5));

        const analysisResultsData = await analysisResultsResponse.json();

        setState({
          geoData: geoJsonData,
          spatialWeights: weightsData,
          flowMaps: flowMapsData,
          analysisResults: analysisResultsData,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching spatial data:', err);
          setState((prevState) => ({ ...prevState, loading: false, error: err.message }));
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