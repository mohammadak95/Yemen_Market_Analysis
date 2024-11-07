// src/workers/dataWorker.js

import proj4 from 'proj4';
import { parseISO, isValid } from 'date-fns';

// Projection setup
const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';

proj4.defs(
  UTM_ZONE_38N,
  '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs'
);

// Helper functions
const normalizeRegionName = (name) => {
  if (!name) return '';

  const specialCases = {
    "san'a'": 'sanaa',
    'san_a__governorate': 'sanaa',
    "sana'a": 'sanaa',
    'sanʿaʾ': 'sanaa',
    'amanat_al_asimah': 'amanat al asimah',
    'lahij': 'lahj',
    '_adan': 'aden',
    'ta_izz': 'taizz',
    'al_hudaydah': 'al hudaydah',
    'al_jawf': 'al jawf',
    'shabwah': 'shabwah',
    'hadhramaut': 'hadramaut',
  };

  let normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[''`]/g, '') // Remove special quotes
    .replace(/[\s_-]+/g, '_') // Replace spaces/hyphens with underscore
    .trim();

  return specialCases[normalized] || normalized;
};

const processDate = (dateString) => {
  if (!dateString) return null;
  let date = parseISO(dateString);
  if (!isValid(date)) {
    date = new Date(dateString);
  }
  return isValid(date) ? date.toISOString() : null;
};

const transformGeometry = (geometry, sourceCRS = UTM_ZONE_38N) => {
  if (!geometry || !geometry.type || !geometry.coordinates) return geometry;

  let transformedGeometry = geometry;

  try {
    const coordinatesInWGS84 = coordinatesInWGS84Check(geometry.coordinates);

    if (!coordinatesInWGS84) {
      transformedGeometry = {
        ...geometry,
        coordinates: transformCoordinates(
          geometry.coordinates,
          sourceCRS
        ),
      };
    }

    return transformedGeometry;
  } catch (error) {
    console.error('Geometry transformation error:', error);
    return geometry;
  }
};

const coordinatesInWGS84Check = (coords) => {
  if (!Array.isArray(coords)) return false;
  const [lng, lat] = coords;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
};

const transformCoordinates = (coords, sourceCRS = UTM_ZONE_38N) => {
  try {
    if (Array.isArray(coords[0])) {
      // Handle nested coordinates
      return coords.map((coord) => transformCoordinates(coord, sourceCRS));
    } else {
      return proj4(sourceCRS, WGS84, coords);
    }
  } catch (error) {
    console.error('Coordinate transformation error:', error);
    return coords;
  }
};

const validateSpatialWeights = (weights) => {
  const errors = [];
  if (!weights || typeof weights !== 'object')
    return { isValid: false, errors: ['Invalid structure'] };
  Object.entries(weights).forEach(([region, data]) => {
    if (
      !data.neighbors?.every(
        (neighbor) => typeof neighbor === 'string' && weights[neighbor]
      )
    ) {
      errors.push(`Invalid neighbors for region ${region}`);
    }
  });
  return { isValid: errors.length === 0, errors };
};

/**
 * Main message handler for the worker.
 */
self.onmessage = async (event) => {
  const { action, payload } = event.data;

  console.log('Worker received message:', event.data);

  if (action === 'processAllData') {
    const { data, selectedCommodity } = payload;

    try {
      const {
        geoBoundariesData,
        unifiedData,
        weightsData,
        flowMapsData,
        analysisResultsData,
      } = data;

      // Validate spatial weights
      const weightsValidation = validateSpatialWeights(weightsData);
      if (!weightsValidation.isValid) {
        throw new Error(
          `Invalid spatial weights: ${weightsValidation.errors.join(', ')}`
        );
      }

      // Normalize region names in geoBoundariesData
      const normalizedBoundaries = {
        ...geoBoundariesData,
        features: geoBoundariesData.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            region_id: normalizeRegionName(feature.properties.shapeName),
          },
        })),
      };

      // Process unified data
      const filteredFeatures = unifiedData.features.filter(
        (feature) =>
          feature.properties?.commodity?.toLowerCase() ===
          selectedCommodity?.toLowerCase()
      );

      const transformedFeatures = filteredFeatures.map((feature) => ({
        ...feature,
        geometry: transformGeometry(feature.geometry),
        properties: {
          ...feature.properties,
          date: processDate(feature.properties.date),
          region_id: normalizeRegionName(
            feature.properties.region_id || feature.properties.admin1
          ),
        },
      }));

      // Process flow maps
      const processedFlowMaps = flowMapsData
        .map((flow) => ({
          ...flow,
          date: processDate(flow.date),
          source_region: normalizeRegionName(flow.source),
          target_region: normalizeRegionName(flow.target),
        }))
        .filter((flow) => flow.source_region && flow.target_region);

      // Extract unique months
      const uniqueMonths = Array.from(
        new Set(
          transformedFeatures
            .map((f) => f.properties.date?.slice(0, 7))
            .filter(Boolean)
        )
      ).sort();

      // Compile processed data
      const processedData = {
        geoData: { type: 'FeatureCollection', features: transformedFeatures },
        flowMaps: processedFlowMaps,
        spatialWeights: weightsData,
        analysisResults: analysisResultsData,
        uniqueMonths,
        metadata: {
          processingTimestamp: new Date().toISOString(),
          featureCount: transformedFeatures.length,
          flowCount: processedFlowMaps.length,
          timeRange: {
            start: uniqueMonths[0],
            end: uniqueMonths[uniqueMonths.length - 1],
          },
        },
      };

      console.log('Worker processing completed successfully.');

      // Send the result back to the main thread
      self.postMessage({ result: processedData });
    } catch (error) {
      console.error('Error in worker processing:', error);
      self.postMessage({ error: error.message });
    }
  }
};