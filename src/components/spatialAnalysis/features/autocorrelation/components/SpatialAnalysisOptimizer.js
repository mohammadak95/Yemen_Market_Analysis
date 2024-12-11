//src/components/spatialAnalysis/features/autocorrelation/components/SpatialAnalysisOptimizer.js

import React, { useMemo } from 'react';

/**
 * HOC for optimizing spatial analysis components
 * Handles data transformations and caching
 */
export const withSpatialOptimization = (WrappedComponent, options = {}) => {
  const {
    transformData = false,
    cacheKey = null
  } = options;

  return function OptimizedComponent(props) {
    // Memoize transformed data
    const transformedData = useMemo(() => {
      if (!transformData) return props;

      try {
        // Handle geometry data specifically for LISA map
        if (cacheKey === 'lisa-map') {
          const { geometry, localStats, ...rest } = props;
          
          // Validate geometry data
          if (!geometry || !geometry.features || !Array.isArray(geometry.features)) {
            console.warn('Invalid geometry data provided to LISA map');
            return { ...rest, geometry: null, localStats };
          }

          // Transform and validate geometry features
          const validatedGeometry = {
            ...geometry,
            features: geometry.features.map(feature => {
              if (!feature.properties) {
                feature.properties = {};
              }
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  name: feature.properties.name || feature.properties.region_id || ''
                }
              };
            })
          };

          return {
            ...rest,
            geometry: validatedGeometry,
            localStats
          };
        }

        // Handle other components' data transformation
        return {
          ...props,
          transformed: true,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('Data transformation error:', error);
        // Return null for geometry in case of error
        if (cacheKey === 'lisa-map') {
          const { geometry, ...rest } = props;
          return { ...rest, geometry: null };
        }
        return props;
      }
    }, [props, transformData, cacheKey]);

    // Pass transformed data to wrapped component
    return <WrappedComponent {...transformedData} />;
  };
};

export default withSpatialOptimization;
