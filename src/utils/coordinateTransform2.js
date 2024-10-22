import proj4 from 'proj4';

// Correct EPSG for Yemen (EPSG:2085 for South Yemen / Gauss-Kruger zone 8)
proj4.defs('EPSG:2085', '+proj=tmerc +lat_0=0 +lon_0=45 +k=1 +x_0=500000 +y_0=0 +ellps=krass +towgs84=-76,-138,67,0,0,0,0 +units=m +no_defs');

// WGS84 target
const WGS84 = 'EPSG:4326';

export const transformToWGS84 = (x, y) => {
  return proj4('EPSG:2085', WGS84, [x, y]);
};