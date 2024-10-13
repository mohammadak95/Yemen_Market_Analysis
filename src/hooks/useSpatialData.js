// src/hooks/useSpatialData.js

import { useEffect, useReducer } from 'react';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';

const initialState = {
  geoData: null,
  spatialWeights: null,
  flowMaps: null,
  analysisResults: [],
  loading: true,
  error: null,
};

const actionTypes = {
  FETCH_INIT: 'FETCH_INIT',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_FAILURE: 'FETCH_FAILURE',
};

const dataFetchReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.FETCH_INIT:
      return { ...state, loading: true, error: null };
    case actionTypes.FETCH_SUCCESS:
      return {
        ...state,
        ...action.payload,
        analysisResults: action.payload.analysisResults || [],
        loading: false,
        error: null,
      };
    case actionTypes.FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const fetchWithErrorHandling = async (url, errorMessage, signal) => {
  try {
    const response = await fetch(url, { signal });
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

const validateGeoJSON = (data) => {
  if (!data.type || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error("Invalid GeoJSON structure: Missing type or features array");
  }
  return data;
};

const validateSpatialWeights = (data) => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid Spatial Weights data: Expected an object.');
  }
  for (const [region, details] of Object.entries(data)) {
    if (!details.neighbors || !Array.isArray(details.neighbors)) {
      throw new Error(`Invalid Spatial Weights data: Missing neighbors array for region '${region}'.`);
    }
  }
  return data;
};

const validateFlowMaps = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Flow maps data is empty or malformed.');
  }
  return data;
};

const validateAnalysisResults = (data) => {
  if (!Array.isArray(data)) {
    throw new Error('Invalid Spatial Analysis Results data: Expected an array.');
  }
  data.forEach((result, index) => {
    const requiredFields = [
      'commodity',
      'regime',
      'coefficients',
      'p_values',
      'r_squared',
      'adj_r_squared',
      'mse',
      'observations',
      'vif',
      'residual',
    ];
    requiredFields.forEach((field) => {
      if (!(field in result)) {
        throw new Error(`Invalid Spatial Analysis Results data: Missing '${field}' at index ${index}.`);
      }
    });
    if (
      typeof result.r_squared !== 'number' ||
      typeof result.adj_r_squared !== 'number' ||
      typeof result.mse !== 'number' ||
      typeof result.observations !== 'number' ||
      !Array.isArray(result.vif)
    ) {
      throw new Error(`Invalid data types in Spatial Analysis Results at index ${index}.`);
    }
  });
  return data;
};

const useSpatialData = () => {
  const [state, dispatch] = useReducer(dataFetchReducer, initialState);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchSpatialData = async () => {
      dispatch({ type: actionTypes.FETCH_INIT });

      try {
        const geoJsonURL = getDataPath('enhanced_unified_data_with_residual.geojson');
        const spatialWeightsURL = getDataPath('spatial_weights/transformed_spatial_weights.json');
        const flowMapsURL = getDataPath('network_data/flow_maps.csv');
        const analysisResultsURL = getDataPath('spatial_analysis_results.json');

        // Logging URLs for debugging
        console.log('GeoJSON URL:', geoJsonURL);
        console.log('Spatial Weights URL:', spatialWeightsURL);
        console.log('Flow Maps URL:', flowMapsURL);
        console.log('Analysis Results URL:', analysisResultsURL);

        const [geoJsonResponse, weightsResponse, flowMapsResponse, analysisResultsResponse] = await Promise.all([
          fetchWithErrorHandling(geoJsonURL, 'Failed to fetch GeoJSON data', signal),
          fetchWithErrorHandling(spatialWeightsURL, 'Failed to fetch spatial weights data', signal),
          fetchWithErrorHandling(flowMapsURL, 'Failed to fetch flow maps data', signal),
          fetchWithErrorHandling(analysisResultsURL, 'Failed to fetch spatial analysis results data', signal),
        ]);

        // Clone and log GeoJSON response without consuming the original stream
        const geoJsonClone = geoJsonResponse.clone();
        const geoJsonText = await geoJsonClone.text();
        console.log('Raw GeoJSON response:', geoJsonText.substring(0, 1000)); // Log first 1000 characters

        const geoJsonData = await geoJsonResponse.json();
        console.log('GeoJSON data loaded, features count:', geoJsonData.features.length);

        const [weightsData, flowMapsText, analysisResultsData] = await Promise.all([
          weightsResponse.json(),
          flowMapsResponse.text(),
          analysisResultsResponse.json(),
        ]);

        // Log CSV data to help troubleshoot any potential parsing issues
        console.log('Raw Flow Maps CSV:', flowMapsText.substring(0, 1000)); // Log first 1000 characters of the CSV file

        // Parse CSV data
        const parseResult = Papa.parse(flowMapsText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        if (parseResult.errors.length) {
          throw new Error(`CSV Parsing Error: ${parseResult.errors[0].message}`);
        }

        const flowMapsData = parseResult.data;

        // Validate all fetched data
        const payload = {
          geoData: validateGeoJSON(geoJsonData),
          spatialWeights: validateSpatialWeights(weightsData),
          flowMaps: validateFlowMaps(flowMapsData),
          analysisResults: validateAnalysisResults(analysisResultsData),
        };

        dispatch({ type: actionTypes.FETCH_SUCCESS, payload });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching spatial data:', err);
          dispatch({ type: actionTypes.FETCH_FAILURE, payload: err.message });
        }
      }
    };

    fetchSpatialData();

    // Cleanup function to abort fetch on unmount
    return () => {
      controller.abort();
    };
  }, []);

  return { ...state };
};

export default useSpatialData;