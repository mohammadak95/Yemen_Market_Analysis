//src/routes/AnalysisRoutes.js

import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy load analysis components
const ECMAnalysis = lazy(() => import('./components/analysis/ecm/ECMAnalysis'));
const PriceDifferentialAnalysis = lazy(() => 
  import('./components/analysis/price-differential/PriceDifferentialAnalysis')
);
const SpatialAnalysis = lazy(() => import('./components/analysis/spatial/SpatialAnalysis'));
const TVMIIAnalysis = lazy(() => import('./components/analysis/tvmii/TVMIIAnalysis'));
const LargeComponent = lazy(() => import('../components/LargeComponent'));

// Route configuration with prefetching
const AnalysisComponent = ({ type, ...props }) => {
  const components = {
    ecm: ECMAnalysis,
    priceDiff: PriceDifferentialAnalysis,
    spatial: SpatialAnalysis,
    tvmii: TVMIIAnalysis,
    large: LargeComponent,
  };

  const Component = components[type];

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  );
};

// Prefetch on hover/menu interaction
const prefetchComponent = (type) => {
  switch (type) {
    case 'ecm':
      ECMAnalysis.preload();
      break;
    case 'priceDiff':
      PriceDifferentialAnalysis.preload();
      break;
    // Add other cases
  }
};

export { AnalysisComponent, prefetchComponent };