// src/hooks/useSpatialDebug.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { spatialDataInspector } from '../utils/spatialDebugUtils';

export const useSpatialDebug = (geoData) => {
  const [debugReport, setDebugReport] = useState(null);
  const debugTimeoutRef = useRef(null);
  const lastUpdateRef = useRef(null);
  const UPDATE_THRESHOLD = 2000; // 2 seconds between updates

  const runDebugAnalysis = useCallback(() => {
    if (!geoData) return;

    const now = Date.now();
    if (lastUpdateRef.current && (now - lastUpdateRef.current) < UPDATE_THRESHOLD) {
      return; // Skip this update if it is within the threshold time
    }

    if (debugTimeoutRef.current) {
      clearTimeout(debugTimeoutRef.current);
    }

    // Set a delay before running the debug analysis to prevent excessive computations
    debugTimeoutRef.current = setTimeout(() => {
      try {
        // Run spatial data inspections
        const geoJSONAnalysis = spatialDataInspector.inspectGeoJSONStructure(geoData, true); // Silent mode
        const pipelineAnalysis = spatialDataInspector.inspectDataLoadingPipeline(geoData);

        // Set the debug report state with the analysis results
        setDebugReport({
          geoJSON: {
            featureCount: geoJSONAnalysis.featureCount,
            validFeatures: geoJSONAnalysis.validFeatures,
            geometryTypes: Array.from(geoJSONAnalysis.geometryTypes || []),
            propertyFields: Array.from(geoJSONAnalysis.propertyFields || []).sort(),
            issues: geoJSONAnalysis.issues || []
          },
          pipeline: {
            stages: pipelineAnalysis.stages.map(stage => ({
              stage: stage.stage,
              details: stage.details,
              isValid: stage.isValid
            }))
          },
          timestamp: new Date().toISOString()
        });

        // Update the last run timestamp
        lastUpdateRef.current = now;
      } catch (error) {
        console.warn('Debug analysis failed:', error);
      }
    }, 500);
  }, [geoData]);

  useEffect(() => {
    // Run debug analysis whenever `geoData` changes
    runDebugAnalysis();

    // Clean up timeout on unmount
    return () => {
      if (debugTimeoutRef.current) {
        clearTimeout(debugTimeoutRef.current);
      }
    };
  }, [runDebugAnalysis]);

  const clearDebugCache = useCallback(() => {
    // Clear the debug cache to ensure subsequent analyses are not cached
    spatialDataInspector.clearCache();
    lastUpdateRef.current = null;

    // Run analysis after clearing the cache
    runDebugAnalysis();
  }, [runDebugAnalysis]);

  return {
    debugReport,
    clearDebugCache
  };
};
