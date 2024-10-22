// src/utils/coordinateTransform2.js

import proj4 from 'proj4';

// Correct EPSG:2098 definition (Yemen Transverse Mercator)
proj4.defs('EPSG:2098', '+proj=tmerc +lat_0=12 +lon_0=45 +k=0.9999 +x_0=500000 +y_0=0 +ellps=krass +units=m +no_defs');

// WGS84 target
const WGS84 = 'EPSG:4326';

export const transformToWGS84 = (x, y) => {
  return proj4('EPSG:2098', WGS84, [x, y]);
};
