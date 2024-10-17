import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { getDataPath } from '../utils/dataPath';
import { transformToWGS84 } from '../utils/coordinateTransform';
import { mergeSpatialDataWithMapping } from '../utils/mergeSpatialData'; // Import the merging function
import { regionMapping, excludedRegions } from '../utils/regionMapping'; // Import mappings

const useSpatialData = () => {
  const [state, setState] = useState({
    geoData: null,
    geoBoundaries: null,
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
        const geoBoundariesPath = getDataPath('choropleth_data/geoBoundaries-YEM-ADM1.geojson');
        const geoJsonURL = getDataPath('enhanced_unified_data_with_residual.geojson');
        const spatialWeightsURL = getDataPath('spatial_weights/transformed_spatial_weights.json');
        const flowMapsURL = getDataPath('network_data/flow_maps.csv');
        const analysisResultsURL = getDataPath('spatial_analysis_results.json');

        console.log('Fetching data from:', geoBoundariesPath, geoJsonURL, spatialWeightsURL, flowMapsURL, analysisResultsURL);

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

        if (!geoBoundariesResponse.ok) throw new Error('Failed to fetch GeoBoundaries data.');
        if (!geoJsonResponse.ok) throw new Error('Failed to fetch GeoJSON data.');
        if (!weightsResponse.ok) throw new Error('Failed to fetch spatial weights data.');
        if (!flowMapsResponse.ok) throw new Error('Failed to fetch flow maps data.');
        if (!analysisResultsResponse.ok) throw new Error('Failed to fetch analysis results.');

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

        const { data: flowMapsData, errors } = Papa.parse(flowMapsText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        if (errors.length > 0) {
          throw new Error(`Error parsing flow maps CSV: ${errors[0].message}`);
        }

        console.log('Flow maps data:', flowMapsData);

        const transformedFlowMapsData = flowMapsData.map((flow) => {
          const [sourceLng, sourceLat] = transformToWGS84(flow.source_lng, flow.source_lat);
          const [targetLng, targetLat] = transformToWGS84(flow.target_lng, flow.target_lat);
          return {
            ...flow,
            source_lat: sourceLat,
            source_lng: sourceLng,
            target_lat: targetLat,
            target_lng: targetLng,
          };
        });

        // Merge data using the provided merging function
        const mergedData = mergeSpatialDataWithMapping(
          geoBoundariesData,
          geoJsonData,
          regionMapping,
          excludedRegions
        );

        setState({
          geoData: mergedData,
          geoBoundaries: geoBoundariesData,
          spatialWeights: weightsData,
          flowMaps: transformedFlowMapsData,
          analysisResults: analysisResultsData,
          loading: false,
          error: null,
        });

        console.log('Spatial data loaded and merged successfully');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching spatial data:', err);
          setState((prevState) => ({
            ...prevState,
            loading: false,
            error: err.message,
          }));
        }
      }
    };

    fetchSpatialData();

    return () => {
      controller.abort();
    };
  }, []);

  const dateRange = useMemo(() => {
    if (!state.geoData || !state.geoData.features || state.geoData.features.length === 0) {
      return { min: new Date(), max: new Date() };
    }
    const dates = state.geoData.features
      .map(feature => new Date(feature.properties.date))
      .filter(date => !isNaN(date.getTime()));
    return {
      min: new Date(Math.min(...dates)),
      max: new Date(Math.max(...dates)),
    };
  }, [state.geoData]);

  return { ...state, dateRange };
};

export default useSpatialData;