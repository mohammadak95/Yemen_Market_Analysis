// src/utils/coordinateTransforms.js

import proj4 from 'proj4';

const WGS84 = 'EPSG:4326';
const UTM_ZONE_38N = 'EPSG:32638';
const YEMEN_TM = 'EPSG:2098';

// Add projection definitions
proj4.defs(UTM_ZONE_38N, '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs');
proj4.defs(YEMEN_TM,
  '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs'
);

// Bounds for different coordinate systems
const BOUNDS = {
  WGS84: {
    minLat: 12,
    maxLat: 19,
    minLon: 42,
    maxLon: 54
  },
  UTM_38N: {
    minX: 166021,
    maxX: 833978,
    minY: 1500000,
    maxY: 2100000
  },
  YEMEN_TM: {
    minX: 0,
    maxX: 1500000,
    minY: 1000000,
    maxY: 2500000
  }
};

const detectCoordinateSystem = (x, y) => {
  if (typeof x !== 'number' || typeof y !== 'number') {
    console.warn('Invalid coordinates received:', { x, y });
    return null;
  }

  // Check UTM Zone 38N bounds
  if (x >= BOUNDS.UTM_38N.minX && x <= BOUNDS.UTM_38N.maxX &&
      y >= BOUNDS.UTM_38N.minY && y <= BOUNDS.UTM_38N.maxY) {
    return UTM_ZONE_38N;
  }

  // Check Yemen TM bounds
  if (x >= BOUNDS.YEMEN_TM.minX && x <= BOUNDS.YEMEN_TM.maxX &&
      y >= BOUNDS.YEMEN_TM.minY && y <= BOUNDS.YEMEN_TM.maxY) {
    return YEMEN_TM;
  }

  // Check WGS84 bounds
  if (x >= BOUNDS.WGS84.minLon && x <= BOUNDS.WGS84.maxLon &&
      y >= BOUNDS.WGS84.minLat && y <= BOUNDS.WGS84.maxLat) {
    return WGS84;
  }

  console.warn('Coordinates outside expected ranges:', { x, y });
  return null;
};

export const transformCoordinates = {
  toWGS84: (x, y, sourceCRS) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      console.warn('Invalid coordinates:', { x, y });
      return [x, y];
    }

    try {
      const sourceSystem = sourceCRS || detectCoordinateSystem(x, y);
      
      if (!sourceSystem || sourceSystem === WGS84) {
        return [x, y];
      }

      return proj4(sourceSystem, WGS84, [x, y]);
    } catch (error) {
      console.error('Coordinate transformation error:', error);
      return [x, y];
    }
  },

  fromWGS84: (x, y, targetCRS = YEMEN_TM) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      console.warn('Invalid coordinates:', { x, y });
      return [x, y];
    }

    try {
      const sourceSystem = detectCoordinateSystem(x, y);
      
      if (!sourceSystem || sourceSystem === targetCRS) {
        return [x, y];
      }

      return proj4(WGS84, targetCRS, [x, y]);
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
          const transformed = transformCoordinates.toWGS84(
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
      return transformCoordinates.toWGS84(coord[0], coord[1]);
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

  const sourceCoords = transformCoordinates.toWGS84(
    flow.source_lng,
    flow.source_lat
  );

  const targetCoords = transformCoordinates.toWGS84(
    flow.target_lng,
    flow.target_lat
  );

  return {
    ...flow,
    source_lat: sourceCoords[1],
    source_lng: sourceCoords[0],
    target_lat: targetCoords[1],
    target_lng: targetCoords[0]
  };
};

// Export coordinate systems and bounds for use in other modules
export const CoordinateSystems = {
  WGS84,
  UTM_ZONE_38N,
  YEMEN_TM,
  BOUNDS
};