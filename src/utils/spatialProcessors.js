// src/utils/spatialProcessors.js

import { normalizeRegionName } from './appUtils';

/**
 * Process both preprocessed and GeoJSON data
 * @param {Object} preprocessedData - Preprocessed data from JSON file
 * @param {Object} geoData - Optional GeoJSON data with geometries
 * @param {string} selectedDate - Selected date (YYYY-MM)
 * @returns {Object} Processed spatial data
 */
export const processSpatialData = (preprocessedData, geoData = null, selectedDate) => {
  try {
    // Extract data from preprocessed file
    const {
      market_clusters: marketClusters,
      flow_analysis: flows,
      spatial_autocorrelation: spatialStats,
      time_series_data: timeSeriesData,
      market_shocks: shocks
    } = preprocessedData;

    // Create base features from market clusters
    const features = createFeaturesFromClusters(marketClusters, timeSeriesData, selectedDate);

    // If we have GeoJSON data, merge it with our features
    if (geoData?.features) {
      mergeGeometryData(features, geoData.features);
    }

    // Process flows for the selected date
    const processedFlows = processFlowData(flows, selectedDate);

    // Generate spatial weights from flows
    const spatialWeights = generateWeightsFromFlows(processedFlows);

    // Process market shocks
    const processedShocks = processShocks(shocks, selectedDate);

    return {
      geoData: {
        type: 'FeatureCollection',
        features
      },
      flowMaps: processedFlows,
      marketClusters,
      detectedShocks: processedShocks,
      spatialAutocorrelation: spatialStats,
      timeSeriesData,
      weights: spatialWeights
    };
  } catch (error) {
    console.error('Error processing spatial data:', error);
    throw error;
  }
};

/**
 * Create GeoJSON features from market clusters
 */
const createFeaturesFromClusters = (clusters, timeSeriesData, selectedDate) => {
  const monthData = timeSeriesData.find(d => d.month === selectedDate) || {};
  
  const features = [];
  
  clusters.forEach(cluster => {
    // Add main market
    features.push({
      type: 'Feature',
      properties: {
        id: cluster.main_market,
        isMainMarket: true,
        clusterSize: cluster.market_count,
        marketRole: 'hub',
        cluster_id: cluster.cluster_id,
        priceData: monthData
      },
      geometry: null // Will be filled if GeoJSON data is provided
    });

    // Add connected markets
    cluster.connected_markets.forEach(market => {
      features.push({
        type: 'Feature',
        properties: {
          id: market,
          isMainMarket: false,
          clusterSize: cluster.market_count,
          marketRole: 'peripheral',
          cluster_id: cluster.cluster_id,
          priceData: monthData
        },
        geometry: null
      });
    });
  });

  return features;
};

/**
 * Merge geometry data from GeoJSON into features
 */
const mergeGeometryData = (features, geoFeatures) => {
  const geometryMap = new Map(
    geoFeatures.map(f => [
      normalizeRegionName(f.properties?.region_id || f.properties?.name),
      f.geometry
    ])
  );

  features.forEach(feature => {
    const normalizedId = normalizeRegionName(feature.properties.id);
    if (geometryMap.has(normalizedId)) {
      feature.geometry = geometryMap.get(normalizedId);
    }
  });
};

/**
 * Process flow data for visualization
 */
const processFlowData = (flows, selectedDate) => {
  return flows.map(flow => ({
    source: flow.source,
    target: flow.target,
    flow_weight: flow.flow_weight,
    avg_flow: flow.avg_flow,
    flow_count: flow.flow_count,
    price_differential: flow.price_differential,
    // Add default coordinates if not provided
    source_lat: 15 + Math.random() * 2,
    source_lng: 44 + Math.random() * 2,
    target_lat: 15 + Math.random() * 2,
    target_lng: 44 + Math.random() * 2
  }));
};

/**
 * Generate spatial weights matrix from flow data
 */
const generateWeightsFromFlows = (flows) => {
  const weights = {};
  
  flows.forEach(flow => {
    if (!weights[flow.source]) {
      weights[flow.source] = { neighbors: [], weight: 0 };
    }
    if (!weights[flow.target]) {
      weights[flow.target] = { neighbors: [], weight: 0 };
    }
    
    // Add bidirectional connections
    if (!weights[flow.source].neighbors.includes(flow.target)) {
      weights[flow.source].neighbors.push(flow.target);
    }
    if (!weights[flow.target].neighbors.includes(flow.source)) {
      weights[flow.target].neighbors.push(flow.source);
    }
    
    // Add weights based on flow
    weights[flow.source].weight += flow.flow_weight;
    weights[flow.target].weight += flow.flow_weight;
  });

  return weights;
};

/**
 * Process market shocks for the selected date
 */
const processShocks = (shocks, selectedDate) => {
  return shocks
    .filter(shock => shock.date.startsWith(selectedDate))
    .map(shock => ({
      ...shock,
      magnitude: parseFloat(shock.magnitude) || 0,
      previous_price: parseFloat(shock.previous_price) || 0,
      current_price: parseFloat(shock.current_price) || 0
    }));
};

/**
 * Validate spatial data structure
 */
export const validateSpatialData = (data) => {
  const required = [
    'market_clusters',
    'flow_analysis',
    'spatial_autocorrelation',
    'time_series_data'
  ];

  const missing = required.filter(key => !data[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required data: ${missing.join(', ')}`);
  }

  return true;
};