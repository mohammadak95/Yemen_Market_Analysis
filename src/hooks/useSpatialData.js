import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';
import { mergeSpatialDataWithMapping } from '../utils/mergeSpatialData';
import { regionMapping, excludedRegions } from '../utils/regionMapping';
import { parseISO } from 'date-fns';
import { transformToWGS84 } from '../utils/coordinateTransform2'; // Use coordinateTransform2.js

const useSpatialData = () => {
  const [state, setState] = useState({
    geoData: null,
    geoBoundaries: null,
    spatialWeights: null,
    flowMaps: null,
    networkData: null,
    analysisResults: null,
    loading: true,
    error: null,
  });

  const [uniqueMonths, setUniqueMonths] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchSpatialData = async () => {
      try {
        console.log('Starting to fetch spatial data...');

        // Define the paths to your data files
        const geoBoundariesPath = getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson');
        const geoJsonURL = getDataPath('enhanced_unified_data_with_residual.geojson');
        const spatialWeightsURL = getDataPath('spatial_weights/transformed_spatial_weights.json');
        const flowMapsURL = getDataPath('network_data/flow_maps.csv');
        const analysisResultsURL = getDataPath('spatial_analysis_results.json');

        console.log('Fetching data from:', {
          geoBoundariesPath,
          geoJsonURL,
          spatialWeightsURL,
          flowMapsURL,
          analysisResultsURL,
        });

        // Fetch all data concurrently
        const [
          geoBoundariesResponse,
          geoJsonResponse,
          weightsResponse,
          flowMapsResponse,
          analysisResultsResponse,
        ] = await Promise.all([
          fetch(geoBoundariesPath, { headers: { Accept: 'application/geo+json' }, signal }),
          fetch(geoJsonURL, { headers: { Accept: 'application/geo+json' }, signal }),
          fetch(spatialWeightsURL, { headers: { Accept: 'application/json' }, signal }),
          fetch(flowMapsURL, { headers: { Accept: 'text/csv' }, signal }),
          fetch(analysisResultsURL, { headers: { Accept: 'application/json' }, signal }),
        ]);

        // Check for successful responses
        console.log('Checking responses:', {
          geoBoundariesResponseStatus: geoBoundariesResponse.status,
          geoJsonResponseStatus: geoJsonResponse.status,
          weightsResponseStatus: weightsResponse.status,
          flowMapsResponseStatus: flowMapsResponse.status,
          analysisResultsResponseStatus: analysisResultsResponse.status,
        });

        if (!geoBoundariesResponse.ok) throw new Error('Failed to fetch GeoBoundaries data.');
        if (!geoJsonResponse.ok) throw new Error('Failed to fetch GeoJSON data.');
        if (!weightsResponse.ok) throw new Error('Failed to fetch spatial weights data.');
        if (!flowMapsResponse.ok) throw new Error('Failed to fetch flow maps data.');
        if (!analysisResultsResponse.ok) throw new Error('Failed to fetch analysis results.');

        // Parse the fetched data
        console.log('Parsing responses...');
        const [
          geoBoundariesData,
          geoJsonData,
          weightsData,
          flowMapsText,
          analysisResultsData,
        ] = await Promise.all([
          geoBoundariesResponse.json(),
          geoJsonResponse.json(),
          weightsResponse.json(),
          flowMapsResponse.text(),
          analysisResultsResponse.json(),
        ]);

        console.log('Parsed data:', {
          geoBoundariesData,
          geoJsonData,
          weightsData,
          flowMapsTextLength: flowMapsText.length,
          analysisResultsData,
        });

        // Parse Flow Maps CSV using PapaParse
        console.log('Parsing flow maps CSV using PapaParse...');
        const { data: flowMapsData, errors: flowMapsErrors } = Papa.parse(flowMapsText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        if (flowMapsErrors.length > 0) {
          throw new Error(`Error parsing flow maps CSV: ${flowMapsErrors[0].message}`);
        }

        console.log('Flow maps data parsed successfully:', { flowMapsDataLength: flowMapsData.length });

        // Transform Flow Maps Coordinates to WGS84
        console.log('Transforming flow maps coordinates to WGS84...');
        const transformedFlowMapsData = flowMapsData
          .map((flow, index) => {
            try {
              // Add date parsing and validation
              const flowDate = new Date(flow.date);
              if (isNaN(flowDate.getTime())) {
                console.warn(`Invalid date in flow maps entry at index ${index}`);
                return null;
              }

              const [sourceLng, sourceLat] = transformToWGS84(flow.source_lng, flow.source_lat);
              const [targetLng, targetLat] = transformToWGS84(flow.target_lng, flow.target_lat);

              return {
                ...flow,
                date: flowDate, // Store as Date object
                source_lat: sourceLat,
                source_lng: sourceLng,
                target_lat: targetLat,
                target_lng: targetLng,
              };
            } catch (error) {
              console.error(`Error processing flow map entry at index ${index}:`, error);
              return null;
            }
          })
          .filter(flow => flow !== null);

        console.log('Flow maps coordinates transformed successfully:', { transformedFlowMapsData });

        // Since you don't have network nodes data, we'll set networkData to an empty array
        const transformedNetworkData = [];

        // Merge GeoBoundaries and Enhanced GeoJSON Data
        console.log('Merging GeoBoundaries and GeoJSON data...');
        const mergedData = mergeSpatialDataWithMapping(
          geoBoundariesData,
          geoJsonData,
          regionMapping,
          excludedRegions
        );

        console.log('Merged GeoJSON Data:', { mergedData });

        // Extract unique months from mergedData.features
        console.log('Extracting unique months from merged GeoJSON data...');
        const dates = mergedData.features
          .map(feature => feature.properties.date)
          .filter(dateStr => {
            if (!dateStr) return false;
            const parsedDate = parseISO(dateStr);
            if (isNaN(parsedDate.getTime())) {
              console.warn(`Invalid date format: ${dateStr}`);
              return false;
            }
            return true;
          });

        const uniqueMonthSet = new Set(
          dates.map(dateStr => {
            const parsedDate = parseISO(dateStr);
            return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
          })
        );

        const uniqueMonthDates = Array.from(uniqueMonthSet)
          .map(monthStr => new Date(`${monthStr}-01`))
          .sort((a, b) => a - b);

        console.log('Unique Months extracted:', { uniqueMonthDates });

        // Update state with merged data and unique months
        console.log('Updating state with loaded data...');
        setState({
          geoData: mergedData,
          geoBoundaries: geoBoundariesData,
          spatialWeights: weightsData,
          flowMaps: transformedFlowMapsData,
          networkData: transformedNetworkData, // Empty array since we don't have network nodes data
          analysisResults: analysisResultsData,
          loading: false,
          error: null,
        });

        setUniqueMonths(uniqueMonthDates.length > 0 ? uniqueMonthDates : []);

        console.log('Spatial data loaded and merged successfully');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching spatial data:', err);
          setState(prevState => ({
            ...prevState,
            loading: false,
            error: err.message,
          }));
        }
      }
    };

    fetchSpatialData();

    return () => {
      console.log('Aborting fetch requests if any');
      controller.abort();
    };
  }, []);

  return { ...state, uniqueMonths };
};

export default useSpatialData;
