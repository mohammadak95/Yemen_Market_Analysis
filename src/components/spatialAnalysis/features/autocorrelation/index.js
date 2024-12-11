//src/components/spatialAnalysis/features/autocorrelation/index.js

import SpatialAutocorrelationAnalysis from './SpatialAutocorrelationAnalysis';
import LISAMap from './LISAMap';
import MoranScatterPlot from './MoranScatterPlot';
import ClusterMatrix from './ClusterMatrix';
import SpatialAnalysisPanel from './SpatialAnalysisPanel';
import { useSpatialAutocorrelation } from './hooks/useSpatialAutocorrelation';
import { withSpatialOptimization } from './components/SpatialAnalysisOptimizer';
import SpatialAnalysisErrorBoundary from './components/SpatialAnalysisErrorBoundary';
import {
  CLUSTER_TYPES,
  SIGNIFICANCE_LEVELS,
  CLUSTER_COLORS,
  DEFAULT_SPATIAL_METRICS,
  DEFAULT_CLUSTER_SUMMARY
} from './types';
import { calculateGlobalMoranI, calculateLocalMoranI } from './utils/spatialCalculations';

// Export individual components for granular imports
export {
  SpatialAutocorrelationAnalysis,
  LISAMap,
  MoranScatterPlot,
  ClusterMatrix,
  SpatialAnalysisPanel,
  SpatialAnalysisErrorBoundary
};

// Export hooks and utilities
export {
  useSpatialAutocorrelation,
  withSpatialOptimization,
  calculateGlobalMoranI,
  calculateLocalMoranI
};

// Export types and constants
export {
  CLUSTER_TYPES,
  SIGNIFICANCE_LEVELS,
  CLUSTER_COLORS,
  DEFAULT_SPATIAL_METRICS,
  DEFAULT_CLUSTER_SUMMARY
};

// Export optimized components
export const OptimizedLISAMap = withSpatialOptimization(
  LISAMap,
  { transformData: true, cacheKey: 'lisa-map' }
);

export const OptimizedMoranScatterPlot = withSpatialOptimization(
  MoranScatterPlot,
  { transformData: true, cacheKey: 'moran-scatter' }
);

export const OptimizedClusterMatrix = withSpatialOptimization(
  ClusterMatrix,
  { transformData: true, cacheKey: 'cluster-matrix' }
);

// Export feature configuration
export const featureConfig = {
  defaultView: 'map',
  visualization: {
    map: {
      center: [15.5527, 48.5164], // Yemen's approximate center
      zoom: 6,
      maxZoom: 10,
      minZoom: 5
    },
    colors: CLUSTER_COLORS
  },
  analysis: {
    moranI: {
      permutations: 999,
      significanceLevels: [0.01, 0.05, 0.1]
    },
    clustering: {
      minClusterSize: 2,
      maxClusterSize: 10
    }
  }
};

// Export feature metadata
export const featureMetadata = {
  id: 'spatial-autocorrelation',
  name: 'Spatial Autocorrelation',
  description: 'Analyze spatial dependencies and clustering patterns in market data',
  version: '1.0.0',
  category: 'spatial-analysis',
  capabilities: [
    'LISA statistics calculation',
    'Cluster identification',
    'Pattern visualization',
    'Statistical significance testing'
  ],
  dependencies: [
    'leaflet',
    'd3',
    '@mui/material'
  ],
  dataRequirements: {
    spatialData: true,
    timeSeriesData: true,
    geometryData: true
  }
};

// Export integration helpers
export const integrationHelpers = {
  prepareAnalysisData: (timeSeriesData, geometryData) => ({
    prepared: true,
    timeSeriesData,
    geometryData
  }),

  validateDataStructure: (data) => {
    if (!data) return false;
    if (!data.timeSeriesData || !data.geometryData) return false;
    return true;
  }
};

// Export main component as default
export default withSpatialOptimization(SpatialAutocorrelationAnalysis);
