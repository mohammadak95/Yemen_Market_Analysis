// src/utils/dynamicImports.js

import { lazy } from 'react';

/**
 * Enhances dynamic imports with chunk naming and tracking.
 * @param {Function} importFn - The import function.
 * @param {string} name - The name of the chunk.
 * @returns {Promise} - The dynamically imported module.
 */
const withChunkName = (promise, name) => {
  promise.then(() => {
    window.__loadedChunks = window.__loadedChunks || new Set();
    window.__loadedChunks.add(name);
  });
  return promise;
};

/**
 * Lazily loads a component with an associated chunk name.
 * @param {Function} importFn - The import function.
 * @param {string} name - The name of the chunk.
 * @returns {React.LazyExoticComponent} - The lazy-loaded component.
 */
export const lazyLoadComponent = (importFn, name) => {
  return lazy(() => {
    if (process.env.NODE_ENV === 'development') {
      return new Promise((resolve) => {
        // Prevent rapid re-renders in development
        setTimeout(() => {
          resolve(withChunkName(importFn(), name));
        }, 100);
      });
    }
    return withChunkName(importFn(), name);
  });
};

/**
 * Lazily loads a spatial component.
 * @param {Function} importFn - The import function.
 * @param {string} name - The name of the spatial component.
 * @returns {React.LazyExoticComponent} - The lazy-loaded spatial component.
 */
export const lazyLoadSpatialComponent = (importFn, name) => {
  return lazyLoadComponent(importFn, name);
};

// **Export Spatial Analysis Components**

export const SpatialAnalysis = lazyLoadSpatialComponent(
  () =>
    import(
      /* webpackChunkName: "spatial-analysis" */
      '../components/analysis/spatial-analysis/SpatialAnalysis'
    ),
  'spatial-analysis'
);

export const ECMAnalysis = lazyLoadSpatialComponent(
  () =>
    import(
      /* webpackChunkName: "ecm-analysis" */
      '../components/analysis/ecm/ECMAnalysis'
    ),
  'ecm-analysis'
);

export const PriceDifferentialAnalysis = lazyLoadSpatialComponent(
  () =>
    import(
      /* webpackChunkName: "price-differential-analysis" */
      '../components/analysis/price-differential/PriceDifferentialAnalysis'
    ),
  'price-differential-analysis'
);

export const TVMIIAnalysis = lazyLoadSpatialComponent(
  () =>
    import(
      /* webpackChunkName: "tvmii-analysis" */
      '../components/analysis/tvmii/TVMIIAnalysis'
    ),
  'tvmii-analysis'
);

export const PrecomputedAnalysis = lazyLoadSpatialComponent(
  () =>
    import(
      /* webpackChunkName: "precomputed-analysis" */
      '../components/analysis/precomputed/PrecomputedAnalysis'
    ),
  'precomputed-analysis'
);
