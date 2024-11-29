// src/utils/spatialUtils.js

// Yemen coordinates mapping
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
    "al mahrah governorate": "al maharah",
    "al mahrah": "al maharah",
    "al mahra": "al maharah",
    "mahrah governorate": "al maharah",
    "ma'rib governorate": "marib",
    "ma'rib": "marib",
    "mareb": "marib",
    "socotra governorate": "socotra",
    "soqatra": "socotra",
    "sanʿaʾ governorate": "sana'a",
    "san'a'": "sana'a",
    "sana'a": "sana'a",
    "sanaa governorate": "sana'a",
    "ta'izz": "taizz",
    "ta'izz governorate": "taizz",
    "taiz": "taizz",
    "'amran": "amran",
    "'amran governorate": "amran",
    "ʿamran": "amran"
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
 * Calculate standard deviation of values
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

// src/components/analysis/spatial-analysis/utils/spatialUtils.js

// ... Keep existing imports and constants ...

/**
 * Calculate cluster geometric properties
 */
export const calculateClusterGeometry = (markets, coordinates) => {
  if (!markets?.length || !coordinates) return null;

  const validMarkets = markets.filter(market => 
    coordinates[transformRegionName(market)]
  );

  if (!validMarkets.length) return null;

  const points = validMarkets.map(market => 
    coordinates[transformRegionName(market)]
  );

  // Calculate centroid
  const centroid = calculateCenter(points);

  // Calculate bounding box
  const bounds = points.reduce((acc, point) => ({
    minLon: Math.min(acc.minLon, point[0]),
    maxLon: Math.max(acc.maxLon, point[0]),
    minLat: Math.min(acc.minLat, point[1]),
    maxLat: Math.max(acc.maxLat, point[1])
  }), {
    minLon: Infinity,
    maxLon: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  });

  // Calculate area and perimeter
  const area = calculatePolygonArea(points);
  const perimeter = calculatePolygonPerimeter(points);

  return {
    centroid,
    bounds,
    area,
    perimeter,
    density: points.length / area
  };
};

/**
 * Calculate cluster cohesion metrics
 */
export const calculateClusterCohesion = (cluster, flows, coordinates) => {
  if (!cluster?.markets?.length) return null;

  const markets = cluster.markets;
  const internalFlows = flows?.filter(flow =>
    markets.includes(flow.source) && markets.includes(flow.target)
  ) || [];

  // Calculate density
  const maxPossibleConnections = (markets.length * (markets.length - 1)) / 2;
  const actualConnections = internalFlows.length;
  const density = maxPossibleConnections > 0 ? 
    actualConnections / maxPossibleConnections : 0;

  // Calculate average flow strength
  const avgFlowStrength = internalFlows.length > 0 ?
    internalFlows.reduce((sum, flow) => sum + (flow.total_flow || 0), 0) / internalFlows.length : 0;

  // Calculate spatial dispersion
  const marketCoords = markets
    .map(market => coordinates[transformRegionName(market)])
    .filter(Boolean);

  const centroid = calculateCenter(marketCoords);
  const distances = marketCoords.map(coord => calculateDistance(coord, centroid));
  const dispersion = calculateStandardDeviation(distances);

  return {
    density,
    avgFlowStrength,
    dispersion,
    connectionCount: actualConnections,
    maxConnections: maxPossibleConnections,
    cohesionScore: density * (1 - (dispersion / 500)) // Normalize dispersion
  };
};

/**
 * Calculate market centrality metrics
 */
export const calculateMarketCentrality = (markets, flows) => {
  const centrality = {};
  
  markets.forEach(market => {
    const marketFlows = flows?.filter(flow => 
      flow.source === market || flow.target === market
    ) || [];

    const totalFlow = marketFlows.reduce((sum, flow) => 
      sum + (flow.total_flow || 0), 0
    );

    const uniqueConnections = new Set(
      marketFlows.flatMap(flow => [flow.source, flow.target])
    ).size - 1; // Subtract 1 to exclude the market itself

    centrality[market] = {
      flowCentrality: totalFlow,
      degreeCentrality: uniqueConnections,
      weightedCentrality: totalFlow * uniqueConnections
    };
  });

  return centrality;
};

/**
 * Calculate inter-cluster flow metrics
 */
export const calculateInterClusterFlows = (cluster1, cluster2, flows) => {
  if (!cluster1?.markets?.length || !cluster2?.markets?.length) return null;

  const interFlows = flows?.filter(flow => 
    (cluster1.markets.includes(flow.source) && cluster2.markets.includes(flow.target)) ||
    (cluster1.markets.includes(flow.target) && cluster2.markets.includes(flow.source))
  ) || [];

  const totalFlow = interFlows.reduce((sum, flow) => sum + (flow.total_flow || 0), 0);
  const avgFlow = interFlows.length > 0 ? totalFlow / interFlows.length : 0;
  const connectionCount = interFlows.length;

  const maxPossibleConnections = cluster1.markets.length * cluster2.markets.length;
  const connectionDensity = maxPossibleConnections > 0 ?
    connectionCount / maxPossibleConnections : 0;

  return {
    totalFlow,
    avgFlow,
    connectionCount,
    connectionDensity,
    flows: interFlows
  };
};

/**
 * Calculate market isolation metrics
 */
export const calculateMarketIsolation = (market, flows, coordinates) => {
  const marketCoord = coordinates[transformRegionName(market)];
  if (!marketCoord) return null;

  const marketFlows = flows?.filter(flow => 
    flow.source === market || flow.target === market
  ) || [];

  const connectedMarkets = new Set(
    marketFlows.flatMap(flow => [flow.source, flow.target])
  );
  connectedMarkets.delete(market);

  const avgDistance = Array.from(connectedMarkets)
    .map(connectedMarket => {
      const coord = coordinates[transformRegionName(connectedMarket)];
      return coord ? calculateDistance(marketCoord, coord) : null;
    })
    .filter(Boolean)
    .reduce((sum, dist, i, arr) => sum + dist / arr.length, 0);

  return {
    connectionCount: connectedMarkets.size,
    totalFlow: marketFlows.reduce((sum, flow) => sum + (flow.total_flow || 0), 0),
    avgDistance,
    isolationScore: calculateIsolationScore(connectedMarkets.size, avgDistance)
  };
};

// Helper functions
const calculatePolygonArea = (points) => {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }

  return Math.abs(area) / 2;
};

const calculatePolygonPerimeter = (points) => {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    perimeter += calculateDistance(points[i], points[j]);
  }
  return perimeter;
};

const calculateIsolationScore = (connections, avgDistance) => {
  const maxExpectedConnections = 20; // Based on total possible markets
  const maxExpectedDistance = 500; // Maximum meaningful distance in km

  const connectionScore = 1 - (connections / maxExpectedConnections);
  const distanceScore = avgDistance / maxExpectedDistance;

  return (connectionScore + distanceScore) / 2;
};

// Export all functions
export default {
  YEMEN_COORDINATES,
  transformRegionName,
  getRegionCoordinates,
  calculateDistance,
  calculateCenter,
  createWeightsMatrix,
  calculateStandardDeviation,
  calculateClusterGeometry,
  calculateClusterCohesion,
  calculateMarketCentrality,
  calculateInterClusterFlows,
  calculateMarketIsolation,
  convertUTMtoLatLng
};
