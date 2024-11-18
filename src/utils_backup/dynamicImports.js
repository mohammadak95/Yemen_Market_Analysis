// src/utils/dynamicImports.js

import { lazy } from 'react';

const withChunkName = (promise, name) => {
  promise.then(module => {
    window.__loadedChunks = window.__loadedChunks || new Set();
    window.__loadedChunks.add(name);
  });
  return promise;
};

export const lazyLoadComponent = (importFn, name) => {
  return lazy(() => {
    if (process.env.NODE_ENV === 'development') {
      return new Promise(resolve => {
        // Prevent rapid re-renders in development
        setTimeout(() => {
          resolve(withChunkName(importFn(), name));
        }, 100);
      });
    }
    return withChunkName(importFn(), name);
  });
};

// Pre-define chunks for better code splitting
export const SpatialAnalysis = lazyLoadComponent(
  () => import(
    /* webpackChunkName: "spatial-analysis" */
    '../components/analysis/spatial-analysis/SpatialAnalysis'
  ),
  'spatial-analysis'
);

export const ECMAnalysis = lazyLoadComponent(
  () => import(
    /* webpackChunkName: "ecm-analysis" */
    '../components/analysis/ecm/ECMAnalysis'
  ),
  'ecm-analysis'
);

export const PriceDifferentialAnalysis = lazyLoadComponent(
  () => import(
    /* webpackChunkName: "price-differential-analysis" */
    '../components/analysis/price-differential/PriceDifferentialAnalysis'
  ),
  'price-differential-analysis'
);

export const TVMIIAnalysis = lazyLoadComponent(
  () => import(
    /* webpackChunkName: "tvmii-analysis" */
    '../components/analysis/tvmii/TVMIIAnalysis'
  ),
  'tvmii-analysis'
);

export const PrecomputedAnalysis = lazyLoadComponent(
  () => import(
    /* webpackChunkName: "precomputed-analysis" */
    '../components/analysis/precomputed/PrecomputedAnalysis'
  ),
  'precomputed-analysis'
);