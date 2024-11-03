// src/utils/spatialDebugUtils.js

/**
 * Debug utility for spatial data inspection and validation
 */
export class SpatialDataInspector {
  constructor() {
    this.debugCache = new Map();
    this.lastInspectionTime = null;
    this.INSPECTION_THROTTLE = 2000;
  }

  inspectGeoJSONStructure(data) {
    // Throttle inspections
    const now = Date.now();
    if (this.lastInspectionTime && (now - this.lastInspectionTime) < this.INSPECTION_THROTTLE) {
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
        sampleFeatures: [] // Initialize this array
      };

      if (!data?.features?.length) {
        analysis.issues.push('No features found in data');
        return this.cacheAndReturn(analysis, now);
      }

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
      }

      return this.cacheAndReturn(analysis, now);
    } catch (error) {
      console.error('Error during GeoJSON inspection:', error);
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
      return validation;

    } catch (error) {
      validation.issues.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  inspectDataLoadingPipeline(data) {
    try {
      return {
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
    } catch (error) {
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
    this.debugCache.clear();
    this.lastInspectionTime = null;
  }
}

export const spatialDataInspector = new SpatialDataInspector();