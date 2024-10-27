//src/hooks/spatialDataLoader.js

import { transformToWGS84 } from '../utils/utils';

export class SpatialDataLoader {
  constructor() {
    this.cache = new Map();
  }

  async loadData(path) {
    try {
      // Check cache first
      if (this.cache.has(path)) {
        return this.cache.get(path);
      }

      const response = await fetch(path, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate and transform the data
      const processedData = this.processGeoJSON(data);
      
      // Cache the processed data
      this.cache.set(path, processedData);
      
      return processedData;
    } catch (error) {
      console.error('Error loading spatial data:', error);
      throw error;
    }
  }

  processGeoJSON(data) {
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid GeoJSON: missing features array');
    }

    return {
      ...data,
      features: data.features.map(feature => {
        try {
          // Transform coordinates if they exist
          if (feature.geometry && Array.isArray(feature.geometry.coordinates)) {
            const [x, y] = feature.geometry.coordinates;
            const [longitude, latitude] = transformToWGS84(x, y);
            
            return {
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: [longitude, latitude]
              },
              properties: {
                ...feature.properties,
                // Parse dates to ensure they're valid
                date: feature.properties.date ? new Date(feature.properties.date) : null,
                // Ensure numeric values are properly typed
                price: parseFloat(feature.properties.price) || 0,
                usdprice: parseFloat(feature.properties.usdprice) || 0,
                conflict_intensity: parseFloat(feature.properties.conflict_intensity) || 0
              }
            };
          }
          return feature;
        } catch (err) {
          console.warn('Error processing feature:', err);
          return feature;
        }
      }).filter(feature => feature !== null)
    };
  }

  // Validate coordinates are within reasonable bounds
  validateCoordinates(lat, lng) {
    return !(isNaN(lat) || isNaN(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180);
  }

  clearCache() {
    this.cache.clear();
  }
}

// Create a singleton instance
export const spatialDataLoader = new SpatialDataLoader();