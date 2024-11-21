// src/utils/geometryValidation.js
export const validateGeometryData = (geometry) => {
    if (!geometry) return false;
    
    const validation = {
      hasPoints: Array.isArray(geometry.points),
      hasPolygons: Array.isArray(geometry.polygons),
      hasUnified: Boolean(geometry.unified),
      isValid: false
    };
  
    // Check points structure
    if (validation.hasPoints) {
      validation.pointsValid = geometry.points.every(point => 
        Array.isArray(point.coordinates) && 
        point.coordinates.length === 2 &&
        point.properties?.normalizedName
      );
    }
  
    // Check polygons structure
    if (validation.hasPolygons) {
      validation.polygonsValid = geometry.polygons.every(polygon => 
        polygon.geometry?.coordinates &&
        polygon.properties?.normalizedName &&
        polygon.properties?.shapeISO
      );
    }
  
    validation.isValid = validation.hasPoints && 
                        validation.hasPolygons && 
                        validation.pointsValid && 
                        validation.polygonsValid;
  
    return validation;
  };