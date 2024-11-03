// src/hooks/useSpatialDebug.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { spatialDataInspector } from '../utils/spatialDebugUtils';

export const useSpatialDebug = (geoData) => {
  const [debugReport, setDebugReport] = useState(null);
  const debugTimeoutRef = useRef(null);
  const lastUpdateRef = useRef(null);
  const UPDATE_THRESHOLD = 2000;

  const runDebugAnalysis = useCallback(() => {
    if (!geoData) return;

    const now = Date.now();
    if (lastUpdateRef.current && now - lastUpdateRef.current < UPDATE_THRESHOLD) {
      return;
    }

    if (debugTimeoutRef.current) {
      clearTimeout(debugTimeoutRef.current);
    }

    debugTimeoutRef.current = setTimeout(() => {
      try {
        const geoJSONAnalysis = spatialDataInspector.inspectGeoJSONStructure(geoData, true);
        const pipelineAnalysis = spatialDataInspector.inspectDataLoadingPipeline(geoData);

        setDebugReport({
          geoJSON: {
            featureCount: geoJSONAnalysis.featureCount,
            validFeatures: geoJSONAnalysis.validFeatures,
            geometryTypes: Array.from(geoJSONAnalysis.geometryTypes || []),
            propertyFields: Array.from(geoJSONAnalysis.propertyFields || []).sort(),
            issues: geoJSONAnalysis.issues || [],
          },
          pipeline: {
            stages: pipelineAnalysis.stages.map((stage) => ({
              stage: stage.stage,
              details: stage.details,
              isValid: stage.isValid,
            })),
          },
          timestamp: new Date().toISOString(),
        });

        lastUpdateRef.current = now;
      } catch (error) {
        console.warn('Debug analysis failed:', error);
        setDebugReport({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }, 500);
  }, [geoData]);

  useEffect(() => {
    runDebugAnalysis();

    return () => {
      if (debugTimeoutRef.current) {
        clearTimeout(debugTimeoutRef.current);
      }
    };
  }, [runDebugAnalysis]);

  const clearDebugCache = useCallback(() => {
    spatialDataInspector.clearCache();
    lastUpdateRef.current = null;

    runDebugAnalysis();
  }, [runDebugAnalysis]);

  return {
    debugReport,
    clearDebugCache,
  };
};
