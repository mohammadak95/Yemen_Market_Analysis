// src/utils/spatialDebugUtils.js

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Enhanced debug utility for spatial data inspection and validation
 */
export class SpatialDataInspector {
  constructor() {
    this.debugCache = new Map();
    this.lastInspectionTime = null;
    this.INSPECTION_THROTTLE = 2000;
    this.debugLog('Inspector initialized');
  }

  debugLog(message, data = null) {
    if (DEBUG) {
      console.group(`[SpatialDataInspector] ${message}`);
      if (data) console.log(data);
      console.groupEnd();
    }
  }

  inspectGeoJSONStructure(data) {
    this.debugLog('Starting GeoJSON inspection');
    
    // Throttle inspections
    const now = Date.now();
    if (this.lastInspectionTime && (now - this.lastInspectionTime) < this.INSPECTION_THROTTLE) {
      this.debugLog('Using cached inspection');
      return this.debugCache.get('lastInspection');
    }

    try {
      const analysis = {
        featureCount: data?.features?.length || 0,
        validFeatures: 0,
        invalidFeatures: [],
        geometryTypes: new Set(),
        propertyFields: new Set(),
        issues: [],
        sampleFeatures: [], // Initialize this array
        timestamp: new Date().toISOString()
      };

      if (!data?.features?.length) {
        analysis.issues.push('No features found in data');
        this.debugLog('No features found');
        return this.cacheAndReturn(analysis, now);
      }

      this.debugLog('Processing features', {
        totalFeatures: data.features.length
      });

      data.features.forEach((feature, index) => {
        const validation = this.validateFeature(feature, index);

        if (validation.isValid) {
          analysis.validFeatures++;
          if (feature?.geometry?.type) {
            analysis.geometryTypes.add(feature.geometry.type);
          }
        } else {
          analysis.invalidFeatures.push({
            index,
            issues: validation.issues
          });
        }

        // Collect property fields
        if (feature?.properties) {
          Object.keys(feature.properties).forEach(key => 
            analysis.propertyFields.add(key)
          );
        }

        // Add to sample features if within sample size
        if (analysis.sampleFeatures.length < 5) {
          analysis.sampleFeatures.push({
            index,
            validation,
            properties: feature?.properties ? Object.keys(feature.properties) : [],
            geometryType: feature?.geometry?.type || 'unknown'
          });
        }
      });

      if (analysis.invalidFeatures.length > 0) {
        analysis.issues.push(`${analysis.invalidFeatures.length} invalid features found`);
        this.debugLog('Invalid features found', {
          count: analysis.invalidFeatures.length
        });
      }

      this.debugLog('Inspection complete', {
        validFeatures: analysis.validFeatures,
        invalidFeatures: analysis.invalidFeatures.length,
        geometryTypes: Array.from(analysis.geometryTypes),
        issues: analysis.issues
      });

      return this.cacheAndReturn(analysis, now);
    } catch (error) {
      this.debugLog('Inspection failed', error);
      return {
        error: error.message,
        featureCount: 0,
        validFeatures: 0,
        geometryTypes: new Set(),
        propertyFields: new Set(),
        issues: ['Inspection failed: ' + error.message],
        sampleFeatures: []
      };
    }
  }

  validateFeature(feature) {
    this.debugLog('Validating feature', {
      type: feature?.type,
      hasProperties: !!feature?.properties,
      hasGeometry: !!feature?.geometry
    });

    const validation = {
      isValid: false,
      issues: []
    };

    try {
      if (!feature) {
        validation.issues.push('Feature is undefined');
        return validation;
      }

      if (!feature.type || feature.type !== 'Feature') {
        validation.issues.push('Invalid feature type');
      }

      if (!feature.properties) {
        validation.issues.push('Missing properties');
      } else {
        const requiredProps = ['date', 'commodity', 'price', 'usdprice'];
        requiredProps.forEach(prop => {
          if (!(prop in feature.properties)) {
            validation.issues.push(`Missing required property: ${prop}`);
          }
        });
      }

      if (!feature.geometry) {
        validation.issues.push('Missing geometry');
      } else {
        if (!feature.geometry.type) {
          validation.issues.push('Missing geometry type');
        }
        if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
          validation.issues.push('Invalid coordinates');
        }
      }

      validation.isValid = validation.issues.length === 0;

      if (!validation.isValid) {
        this.debugLog('Feature validation failed', {
          issues: validation.issues
        });
      }

      return validation;

    } catch (error) {
      this.debugLog('Validation error', error);
      validation.issues.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  inspectDataLoadingPipeline(data) {
    this.debugLog('Inspecting data loading pipeline');
    
    try {
      const inspection = {
        stages: [
          {
            stage: 'initialCheck',
            isValid: Boolean(data),
            details: typeof data
          },
          {
            stage: 'structureValidation',
            isValid: data?.type === 'FeatureCollection' && Array.isArray(data?.features),
            details: data?.type || 'unknown'
          },
          {
            stage: 'featureProcessing',
            isValid: Boolean(data?.features?.length),
            details: `${data?.features?.length || 0} features`
          }
        ],
        timestamp: new Date().toISOString()
      };

      this.debugLog('Pipeline inspection complete', inspection);
      return inspection;
    } catch (error) {
      this.debugLog('Pipeline inspection failed', error);
      return {
        stages: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  cacheAndReturn(analysis, timestamp) {
    this.lastInspectionTime = timestamp;
    this.debugCache.set('lastInspection', analysis);
    return analysis;
  }

  clearCache() {
    this.debugLog('Clearing cache');
    this.debugCache.clear();
    this.lastInspectionTime = null;
  }
}

export const spatialDataInspector = new SpatialDataInspector();