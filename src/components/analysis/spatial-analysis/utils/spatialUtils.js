// Yemen coordinates mapping for fallback
export const YEMEN_COORDINATES = {
  'abyan': [45.83, 13.58],
  'aden': [45.03, 12.77],
  'al bayda': [45.57, 14.17],
  'al dhale\'e': [44.73, 13.70],
  'al hudaydah': [42.95, 14.80],
  'al jawf': [45.50, 16.60],
  'al maharah': [51.83, 16.52],
  'al mahwit': [43.55, 15.47],
  'amanat al asimah': [44.21, 15.35],
  'amran': [43.94, 15.66],
  'dhamar': [44.24, 14.54],
  'hadramaut': [48.78, 15.93],
  'hajjah': [43.60, 15.63],
  'ibb': [44.18, 13.97],
  'lahj': [44.88, 13.03],
  'marib': [45.32, 15.47],
  'raymah': [43.71, 14.68],
  'sana\'a': [44.21, 15.35],
  'shabwah': [47.01, 14.53],
  'taizz': [44.02, 13.58],
  'socotra': [53.87, 12.47]
};

/**
 * Transform and normalize region names
 */
export const transformRegionName = (name) => {
  if (!name) return '';

  // Special cases mapping for Yemen regions
  const specialCases = {
    "'adan governorate": "aden",
    "'adan": "aden",
    "ʿadan": "aden",
    "ad dali' governorate": "al dhale'e",
    "ad dali'": "al dhale'e",
    "ad dali": "al dhale'e",
    "al dhale": "al dhale'e",
    "al dhale'": "al dhale'e",
    "sa'dah governorate": "saada",
    "sa'dah": "saada",
    "sadah": "saada",
    "sa'ada": "saada",
    // Mahrah variations
    "al mahrah governorate": "al maharah",
    "al mahrah": "al maharah",
    "al mahra": "al maharah",
    "mahrah governorate": "al maharah",
    // Marib variations
    "ma'rib governorate": "marib",
    "ma'rib": "marib",
    "mareb": "marib",
    // Socotra variations
    "socotra governorate": "socotra",
    "soqatra": "socotra",
    // Sanaa variations
    "sanʿaʾ governorate": "sana'a",
    "san'a'": "sana'a",
    "sana'a": "sana'a",
    "sanaa governorate": "sana'a",
    // Taiz variations
    "ta'izz": "taizz",
    "ta'izz governorate": "taizz",
    "taiz": "taizz",
    // Amran variations
    "'amran": "amran",
    "'amran governorate": "amran",
    "ʿamran": "amran",
    // Al Mahwit variations
    "al mahwit": "al mahwit",
    "al mawhit": "al mahwit",
    // Raymah variations
    "raymah": "raymah",
    "raimah": "raymah",
    // Al Hudaydah variations
    "al hudaydah": "al hudaydah",
    "hodeidah": "al hudaydah",
    "al hodeidah": "al hudaydah",
    // Other regions
    "ib": "ibb",
    "ibb": "ibb",
    "lahej": "lahj",
    "lahj": "lahj",
    "shabwa": "shabwah",
    "dhamar": "dhamar",
    "hajjah": "hajjah",
    "abyan": "abyan",
    "al bayda'": "al bayda",
    "al bayda": "al bayda",
    "al jawf": "al jawf",
    "al jawaf": "al jawf",
    "hadramawt": "hadramaut",
    "hadramaut": "hadramaut",
    "taiz": "taizz",
    "taizz": "taizz",
    "amanat al asimah": "amanat al asimah",
    "sana'a city": "amanat al asimah",
    "al dhale'e": "al dhale'e",
    "al dhale": "al dhale'e",
    "al dhali'": "al dhale'e",
    "al mahrah": "al maharah",
  };

  // Clean up the name
  const cleaned = name.toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ governorate$/i, '')
    .replace(/ʿ/g, "'")
    .replace(/['']/g, "'")
    .trim();

  return specialCases[cleaned] || cleaned;
};

/**
 * Get coordinates for a region
 */
export const getRegionCoordinates = (name) => {
  if (!name) return null;
  const normalizedName = transformRegionName(name);
  return YEMEN_COORDINATES[normalizedName] || null;
};

/**
 * Calculate geographical distance between points
 */
export const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return 0;
  
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth radius in kilometers

  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
           Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate center point for coordinates
 */
export const calculateCenter = (coordinates) => {
  if (!coordinates?.length) return null;

  const validCoords = coordinates.filter(coord => 
    Array.isArray(coord) && coord.length === 2 &&
    !isNaN(coord[0]) && !isNaN(coord[1])
  );

  if (!validCoords.length) return null;

  const sum = validCoords.reduce((acc, coord) => [
    acc[0] + coord[0],
    acc[1] + coord[1]
  ], [0, 0]);

  return [
    sum[0] / validCoords.length,
    sum[1] / validCoords.length
  ];
};

/**
 * Convert UTM coordinates to LatLng
 */
export const convertUTMtoLatLng = (easting, northing) => {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const falseEasting = 500000;
  const zone = 38;

  const x = easting - falseEasting;
  const y = northing;

  const M = y / k0;
  const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64));

  const phi1 = mu + (3 * e1sq / 2 - 27 * Math.pow(e1sq, 3) / 32) * Math.sin(2 * mu);
  const phi2 = phi1 + (21 * Math.pow(e1sq, 2) / 16 - 55 * Math.pow(e1sq, 4) / 32) * Math.sin(4 * mu);
  const phi = phi2 + (151 * Math.pow(e1sq, 3) / 96) * Math.sin(6 * mu);

  const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi) * Math.sin(phi));
  const T1 = Math.tan(phi) * Math.tan(phi);
  const C1 = (e * e * Math.cos(phi) * Math.cos(phi)) / (1 - e * e);
  const R1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.sin(phi) * Math.sin(phi), 1.5);
  const D = x / (N1 * k0);

  const lat = phi - (N1 * Math.tan(phi) / R1) * (
    (D * D) / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e * e) * Math.pow(D, 4) / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e * e - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720
  );
  const lon = ((zone * 6 - 183) + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e * e + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120)
  ) / Math.cos(phi) * (180 / Math.PI);

  return [lon * (180 / Math.PI), lat * (180 / Math.PI)];
};

/**
 * Create spatial weights matrix
 */
export const createWeightsMatrix = (points, threshold = 100) => {
  const n = points.length;
  const weights = Array(n).fill().map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const dist = calculateDistance(points[i], points[j]);
        weights[i][j] = dist <= threshold ? 1 : 0;
      }
    }
  }

  // Row standardize
  for (let i = 0; i < n; i++) {
    const rowSum = weights[i].reduce((a, b) => a + b, 0);
    if (rowSum > 0) {
      weights[i] = weights[i].map(w => w / rowSum);
    }
  }

  return weights;
};

/**
 * Calculate standard deviation
 */
export const calculateStandardDeviation = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => {
    const diff = value - mean;
    return diff * diff;
  });
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
};

export default {
  YEMEN_COORDINATES,
  transformRegionName,
  getRegionCoordinates,
  calculateDistance,
  calculateCenter,
  convertUTMtoLatLng,
  createWeightsMatrix,
  calculateStandardDeviation
};
