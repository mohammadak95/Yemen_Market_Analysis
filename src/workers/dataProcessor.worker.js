// src/workers/dataProcessor.worker.js

import { transformToWGS84 } from '../utils/utils';
import { mergeSpatialDataWithMapping } from '../utils/utils';
import { regionMapping, excludedRegions } from '../utils/utils';

self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    let result;
    switch (type) {
      case 'processFlowMaps':
        result = processFlowMaps(data);
        break;
      case 'mergeData':
        result = mergeData(data.geoBoundariesData, data.geoJsonData);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
    self.postMessage(result);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};

const processFlowMaps = (flowMapsData) => {
  return flowMapsData
    .map((flow, index) => {
      try {
        // Parse and validate date
        const flowDate = new Date(flow.date);
        if (isNaN(flowDate.getTime())) {
          console.warn(`Invalid date in flow maps entry at index ${index}`);
          return null;
        }

        // Transform coordinates to WGS84
        const [sourceLng, sourceLat] = transformToWGS84(flow.source_lng, flow.source_lat);
        const [targetLng, targetLat] = transformToWGS84(flow.target_lng, flow.target_lat);

        return {
          ...flow,
          date: flowDate,
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
};

const mergeData = (geoBoundariesData, geoJsonData) => {
  return mergeSpatialDataWithMapping(
    geoBoundariesData,
    geoJsonData,
    regionMapping,
    excludedRegions
  );
};