// src/components/analysis/spatial-analysis/utils/coordinateHandler.js

const debug = (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
        console.group(`📍 CoordinateHandler: ${message}`);
        Object.entries(data).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });
        console.groupEnd();
    }
};

const YEMEN_BOUNDS = {
    minLon: 41.0,
    maxLon: 54.0,
    minLat: 12.0,
    maxLat: 19.0
};

const isWithinYemenBounds = (coordinates) => {
    const [lon, lat] = coordinates;
    return (
        lon >= YEMEN_BOUNDS.minLon && 
        lon <= YEMEN_BOUNDS.maxLon &&
        lat >= YEMEN_BOUNDS.minLat && 
        lat <= YEMEN_BOUNDS.maxLat
    );
};

const calculatePolygonCentroid = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;

    try {
        // Handle nested arrays - get the first ring of coordinates
        let points = coordinates;
        while (Array.isArray(points[0][0])) {
            points = points[0];
        }

        let sumX = 0;
        let sumY = 0;
        let pointCount = 0;

        // Sample points from the polygon (use every 10th point to reduce computation)
        for (let i = 0; i < points.length; i += 10) {
            const [x, y] = points[i];
            if (typeof x === 'number' && typeof y === 'number') {
                sumX += x;
                sumY += y;
                pointCount++;
            }
        }

        if (pointCount === 0) return null;

        const centroid = [sumX / pointCount, sumY / pointCount];
        debug('Calculated Centroid', { 
            pointCount,
            centroid,
            isValid: isWithinYemenBounds(centroid)
        });

        return isWithinYemenBounds(centroid) ? centroid : null;
    } catch (error) {
        debug('Centroid Calculation Error', { error: error.message });
        return null;
    }
};

const YEMEN_FALLBACK_COORDINATES = {
    'sana\'a': [44.2067, 15.3694],
    'aden': [45.0357, 12.7797],
    'taizz': [44.0075, 13.5769],
    'al hudaydah': [42.9552, 14.7979],
    'ibb': [44.1821, 13.9673],
    'dhamar': [44.4018, 14.5430],
    'hadramaut': [48.7867, 15.9320],
    'al jawf': [45.5837, 16.7875],
    'marib': [45.3223, 15.4542],
    'shabwah': [47.0124, 14.7616],
    'abyan': [46.3262, 13.6339],
    'lahj': [44.8838, 13.0382],
    'al bayda': [45.5723, 14.3516],
    'al dhale\'e': [44.7313, 13.7247],
    'hajjah': [43.6027, 15.6943],
    'amran': [43.9436, 16.0174],
    'al mahwit': [43.5446, 15.4700],
    'raymah': [43.7117, 14.6779],
    'amanat al asimah': [44.2067, 15.3694]
};

const coordinateCache = new Map();

export const normalizeCoordinates = (data, regionId) => {
    if (!regionId) {
        debug('Missing Region ID', { data });
        return null;
    }

    // Check cache first
    if (coordinateCache.has(regionId)) {
        return coordinateCache.get(regionId);
    }

    let coordinates = null;

    // Try to extract coordinates from data
    if (data) {
        if (data.geometry?.coordinates) {
            // Handle GeoJSON
            if (data.geometry.type === 'Point') {
                coordinates = data.geometry.coordinates;
            } else if (data.geometry.type === 'Polygon' || data.geometry.type === 'MultiPolygon') {
                coordinates = calculatePolygonCentroid(data.geometry.coordinates);
            }
        } else if (data.type === 'polygon' && data.geometry?.coordinates) {
            coordinates = calculatePolygonCentroid(data.geometry.coordinates);
        } else if (Array.isArray(data.coordinates)) {
            coordinates = data.coordinates;
        }

        debug('Extracted Coordinates', { 
            regionId, 
            coordinates,
            dataType: data.type,
            geometryType: data.geometry?.type
        });
    }

    // Validate or use fallback
    if (!coordinates || !isWithinYemenBounds(coordinates)) {
        coordinates = YEMEN_FALLBACK_COORDINATES[regionId.toLowerCase()];
        debug('Using Fallback', { regionId, coordinates });
    }

    if (coordinates && isWithinYemenBounds(coordinates)) {
        coordinateCache.set(regionId, coordinates);
        return coordinates;
    }

    debug('No Valid Coordinates Found', { regionId });
    return null;
};

export const clearCoordinateCache = () => {
    coordinateCache.clear();
};