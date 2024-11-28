// src/utils/polygonNormalizer.js

class PolygonNormalizer {
  constructor() {
    // Cache for normalized names
    this.normalizedNameCache = new Map();
    this._instance = null;
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new PolygonNormalizer();
    }
    return this._instance;
  }

  normalizePolygons(polygonFeatures) {
    if (!Array.isArray(polygonFeatures)) {
      console.warn('Invalid polygon features provided');
      return [];
    }
  
    // Add cache check
    const cacheKey = JSON.stringify(polygonFeatures.map(f => f?.properties?.shapeName));
    if (this.normalizedNameCache.has(cacheKey)) {
      return this.normalizedNameCache.get(cacheKey);
    }
  
    const normalized = polygonFeatures.map(feature => {
      if (!feature?.properties?.shapeName) return feature;
  
      const normalizedName = this.getNormalizedName(feature.properties.shapeName);
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          originalName: feature.properties.shapeName,
          normalizedName,
          region_id: normalizedName
        }
      };
    });
  
    // Cache the result
    this.normalizedNameCache.set(cacheKey, normalized);
    return normalized;
  }

  getNormalizedName(name) {
    if (!name) return null;
  
    // Check cache first
    if (this.normalizedNameCache.has(name.toLowerCase())) {
      return this.normalizedNameCache.get(name.toLowerCase());
    }
  
    // First try exact match with governorate
    let normalized = name.toLowerCase();
    const withGovernorate = normalized + (normalized.endsWith(' governorate') ? '' : ' governorate');
  
    // Check if there's an exact match in our fixes
    const exactMatch = this.applyYemenRegionFixes(withGovernorate);
    if (exactMatch !== withGovernorate) {
      this.normalizedNameCache.set(name.toLowerCase(), exactMatch);
      return exactMatch;
    }
  
    // If no exact match, try basic normalization
    normalized = normalized
      .replace(/\s+governorate$/i, '')
      .replace(/[ʿʾ]/g, "'") // Replace both special characters with apostrophe
      .replace(/['']/g, "'")
      .trim();
  
    // Apply specific Yemen region fixes
    normalized = this.applyYemenRegionFixes(normalized);
  
    // Cache the result
    this.normalizedNameCache.set(name.toLowerCase(), normalized);
    return normalized;
  }

  applyYemenRegionFixes(name) {
    const fixes = {
      "'amran governorate": "amran",
      "abyan governorate": "abyan",
      "'adan governorate": "aden",
      "al bayda' governorate": "al bayda",
      "ad dali' governorate": "al dhale'e",
      "al hudaydah governorate": "al hudaydah",
      "al jawf governorate": "al jawf",
      "al mahrah governorate": "al maharah",
      "al mahwit governorate": "al mahwit",
      "san'a'": "amanat al asimah",
      "dhamar governorate": "dhamar",
      "hadhraumaut": "hadramaut",
      "hajjah governorate": "hajjah",
      "ibb governorate": "ibb",
      "lahij governorate": "lahj",
      "ma'rib governorate": "marib",
      "raymah governorate": "raymah",
      "san'a' governorate": "sana'a",
      "shabwah governorate": "shabwah",
      "socotra": "socotra",
      "ta'izz governorate": "taizz"
    };

    return fixes[name] || name;
  }

  matchPolygonsWithPoints(polygons, points) {
    if (!Array.isArray(polygons) || !Array.isArray(points)) {
      console.warn('Invalid input for polygon-point matching');
      return [];
    }

    const pointsByRegion = new Map();
    points.forEach(point => {
      const normalizedName = this.getNormalizedName(point.properties?.admin1);
      if (normalizedName) {
        pointsByRegion.set(normalizedName, point);
      }
    });

    return polygons.map(polygon => {
      const normalizedName = polygon.properties?.normalizedName;
      if (!normalizedName) return polygon;

      const matchingPoint = pointsByRegion.get(normalizedName);
      if (!matchingPoint) return polygon;

      return {
        ...polygon,
        properties: {
          ...polygon.properties,
          coordinates: matchingPoint.coordinates,
          population: matchingPoint.properties?.population,
          population_percentage: matchingPoint.properties?.population_percentage
        }
      };
    });
  }

  // Utility method to clear the cache if needed
  clearCache() {
    this.normalizedNameCache.clear();
  }
}

// Export the class and create a singleton instance using getInstance
export const polygonNormalizer = PolygonNormalizer.getInstance();
export default PolygonNormalizer;
