// src/middleware/spatialMiddleware.js
import { backgroundMonitor } from '../utils/backgroundMonitor';

export const createSpatialMiddleware = () => {
  return store => next => action => {
    // Monitor spatial actions
    if (action.type?.startsWith('spatial/')) {
      const startTime = performance.now();
      const result = next(action);
      const duration = performance.now() - startTime;

      // Validate geometry data when received
      if (action.type === 'spatial/fetchAllSpatialData/fulfilled') {
        const geometryData = action.payload?.geometry;
        
        // Validate required geometry structure
        if (geometryData) {
          const validation = {
            hasPoints: Array.isArray(geometryData.points),
            hasPolygons: Array.isArray(geometryData.polygons),
            hasUnified: Boolean(geometryData.unified),
            pointCount: geometryData.points?.length || 0,
            polygonCount: geometryData.polygons?.length || 0
          };

          // Log validation results
          backgroundMonitor.logMetric('geometry-validation', {
            ...validation,
            timestamp: Date.now()
          });

          // Warn if missing required data
          if (!validation.hasPoints || !validation.hasPolygons) {
            console.warn('Spatial data missing required geometry properties', validation);
          }
        }
      }

      backgroundMonitor.logMetric('spatial-action', {
        type: action.type,
        duration,
        timestamp: Date.now()
      });

      return result;
    }
    return next(action);
  };
};