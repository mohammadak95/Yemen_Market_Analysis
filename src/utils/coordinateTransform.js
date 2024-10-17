// src/utils/coordinateTransform.js

import proj4 from 'proj4';

// Define source CRS (replace with the correct CRS if different)
proj4.defs('EPSG:2098', '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs');

export const transformToWGS84 = (x, y) => {
  // Transform from source CRS to WGS84
  return proj4('EPSG:2098', 'WGS84', [x, y]);
};


