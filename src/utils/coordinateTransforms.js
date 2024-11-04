// src/utils/coordinateTransforms.js

import proj4 from 'proj4';

const WGS84 = 'EPSG:4326';
const YEMEN_TM = 'EPSG:2098';

// Define Yemen Transverse Mercator projection
proj4.defs(YEMEN_TM,
  '+proj=tmerc +lat_0=12 +lon_0=45 +k=0.9996 +x_0=500000 +y_0=0 +datum=WGS84 +units=m +no_defs'
);

// Bounds for different coordinate systems
const BOUNDS = {
  WGS84: {
    minLat: 12,
    maxLat: 19,
    minLon: 42,
    maxLon: 54
  },
  // Expanded bounds for Yemen TM to account for all possible transformed coordinates
  YEMEN_TM: {
    minX: 0,         // Expanded minimum
    maxX: 1500000,   // Expanded maximum
    minY: 1000000,   // Expanded minimum
    maxY: 2500000    // Expanded maximum
  }
};

const detectCoordinateSystem = (x, y) => {
  if (typeof x !== 'number' || typeof y !== 'number') {
    console.warn('Invalid coordinates received:', { x, y });
    return null;
  }

  // Check if coordinates are in WGS84 range
  if (x >= BOUNDS.WGS84.minLon && x <= BOUNDS.WGS84.maxLon &&
      y >= BOUNDS.WGS84.minLat && y <= BOUNDS.WGS84.maxLat) {
    return WGS84;
  }

  // Check if coordinates are in projected range (Yemen TM)
  if (Math.abs(x) > 100 && Math.abs(y) > 100) {
    return YEMEN_TM; // Assume projected if values are large
  }

  console.warn('Coordinates outside expected ranges:', { x, y });
  return null;
};

export const transformCoordinates = {
  toYemenTM: (x, y) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      console.warn('Invalid coordinates:', { x, y });
      return [x, y]; // Return original coordinates if invalid
    }

    try {
      const sourceSystem = detectCoordinateSystem(x, y);
      
      // If already in projected coordinates, return as is
      if (!sourceSystem || sourceSystem === YEMEN_TM) {
        return [x, y];
      }

      // Convert from WGS84 to Yemen TM
      return proj4(WGS84, YEMEN_TM, [x, y]);
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      return [x, y]; // Return original coordinates on error
    }
  },

  fromYemenTM: (x, y) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      console.warn('Invalid coordinates:', { x, y });
      return [x, y];
    }

    try {
      const sourceSystem = detectCoordinateSystem(x, y);
      
      // If already in WGS84 or can't detect, return as is
      if (!sourceSystem || sourceSystem === WGS84) {
        return [x, y];
      }

      return proj4(YEMEN_TM, WGS84, [x, y]);
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      return [x, y];
    }
  },

  transformGeometry: (geometry) => {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return geometry;
    }

    try {
      switch (geometry.type) {
        case 'Point':
          if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 2) {
            return geometry;
          }
          const transformed = transformCoordinates.toYemenTM(
            geometry.coordinates[0],
            geometry.coordinates[1]
          );
          return {
            ...geometry,
            coordinates: transformed
          };

        case 'Polygon':
          return {
            ...geometry,
            coordinates: transformPolygonCoordinates(geometry.coordinates)
          };

        case 'MultiPolygon':
          return {
            ...geometry,
            coordinates: geometry.coordinates.map(polygon => transformPolygonCoordinates(polygon))
          };

        default:
          console.warn(`Unsupported geometry type: ${geometry.type}`);
          return geometry;
      }
    } catch (error) {
      console.error('Geometry transformation error:', error);
      return geometry;
    }
  }
};

const transformPolygonCoordinates = (polygonCoordinates) => {
  if (!Array.isArray(polygonCoordinates)) return polygonCoordinates;
  
  return polygonCoordinates.map(ring => {
    if (!Array.isArray(ring)) return ring;
    
    return ring.map(coord => {
      if (!Array.isArray(coord) || coord.length !== 2) return coord;
      return transformCoordinates.toYemenTM(coord[0], coord[1]);
    });
  });
};

export const processFlowMapWithTransform = (flow) => {
  if (!flow || 
      typeof flow.source_lng !== 'number' || 
      typeof flow.source_lat !== 'number' ||
      typeof flow.target_lng !== 'number' || 
      typeof flow.target_lat !== 'number') {
    return flow;
  }

  const sourceCoords = transformCoordinates.toYemenTM(
    flow.source_lng,
    flow.source_lat
  );

  const targetCoords = transformCoordinates.toYemenTM(
    flow.target_lng,
    flow.target_lat
  );

  return {
    ...flow,
    source_x: sourceCoords[0],
    source_y: sourceCoords[1],
    target_x: targetCoords[0],
    target_y: targetCoords[1]
  };
};