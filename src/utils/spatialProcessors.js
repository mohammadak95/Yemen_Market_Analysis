// src/utils/spatialProcessors.js

/**
 * Process GeoJSON data
 */
export const processGeoJSON = async (features, selectedCommodity) => {
    return features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        commodity: feature.properties.commodity?.toLowerCase(),
        price: parseFloat(feature.properties.price) || 0,
        date: new Date(feature.properties.date).toISOString()
      }
    })).filter(feature => 
      feature.properties.commodity === selectedCommodity.toLowerCase()
    );
  };
  
  /**
   * Process flow data
   */
  export const processFlowData = async (flows, selectedDate) => {
    return flows.filter(flow => 
      flow.date === selectedDate
    ).map(flow => ({
      ...flow,
      flow_weight: parseFloat(flow.flow_weight) || 0,
      price_differential: parseFloat(flow.price_differential) || 0
    }));
  };
  
  /**
   * Process spatial weights
   */
  export const processSpatialWeights = async (weights) => {
    const processed = {};
    
    Object.entries(weights).forEach(([region, data]) => {
      processed[region] = {
        ...data,
        neighbors: Array.isArray(data.neighbors) ? data.neighbors : [],
        properties: data.properties || {}
      };
    });
  
    return processed;
  };