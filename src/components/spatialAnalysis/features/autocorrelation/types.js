/**
 * Constants and types for spatial autocorrelation analysis
 */
import PropTypes from 'prop-types';

// Significance levels for statistical tests
export const SIGNIFICANCE_LEVELS = {
  HIGHLY_SIGNIFICANT: 0.01,
  SIGNIFICANT: 0.05,
  MARGINALLY_SIGNIFICANT: 0.1
};

// Cluster types for LISA analysis
export const CLUSTER_TYPES = {
  HIGH_HIGH: 'high-high',
  LOW_LOW: 'low-low',
  HIGH_LOW: 'high-low',
  LOW_HIGH: 'low-high',
  NOT_SIGNIFICANT: 'not_significant'
};

// Colors for different cluster types
export const CLUSTER_COLORS = {
  [CLUSTER_TYPES.HIGH_HIGH]: '#d73027', // Hot spots (red)
  [CLUSTER_TYPES.LOW_LOW]: '#313695', // Cold spots (blue)
  [CLUSTER_TYPES.HIGH_LOW]: '#fdae61', // High-Low outliers (orange)
  [CLUSTER_TYPES.LOW_HIGH]: '#74add1', // Low-High outliers (light blue)
  [CLUSTER_TYPES.NOT_SIGNIFICANT]: '#969696' // Not significant (gray)
};

// Default metrics for spatial analysis
export const DEFAULT_SPATIAL_METRICS = {
  globalMoranI: 0,
  pValue: 1,
  zScore: 0,
  avgLocalI: 0,
  maxLocalI: 0,
  spatialAssociation: 0,
  significanceLevels: {
    highlySignificant: 0,
    significant: 0,
    marginal: 0,
    notSignificant: 0
  }
};

// Default summary for cluster analysis
export const DEFAULT_CLUSTER_SUMMARY = {
  totals: {
    'high-high': 0,
    'low-low': 0,
    'high-low': 0,
    'low-high': 0,
    'not_significant': 0
  },
  significantCount: 0,
  totalRegions: 0,
  significanceRate: 0,
  hotspotRate: 0,
  coldspotRate: 0,
  outlierRate: 0
};

// PropTypes for components
export const LocalMoranStatisticsPropType = PropTypes.shape({
  local_i: PropTypes.number.isRequired,
  p_value: PropTypes.number.isRequired,
  z_score: PropTypes.number.isRequired,
  cluster_type: PropTypes.oneOf(Object.values(CLUSTER_TYPES)).isRequired,
  variance: PropTypes.number.isRequired,
  spatial_lag: PropTypes.number.isRequired
});

export const GlobalMoranStatisticsPropType = PropTypes.shape({
  moran_i: PropTypes.number.isRequired,
  p_value: PropTypes.number.isRequired,
  z_score: PropTypes.number.isRequired,
  significance: PropTypes.bool.isRequired
});

export const ClusterAnalysisPropType = PropTypes.shape({
  totals: PropTypes.objectOf(PropTypes.number).isRequired,
  significantCount: PropTypes.number.isRequired,
  totalRegions: PropTypes.number.isRequired,
  significanceRate: PropTypes.number.isRequired,
  hotspotRate: PropTypes.number.isRequired,
  coldspotRate: PropTypes.number.isRequired,
  outlierRate: PropTypes.number.isRequired
});

export const SpatialMetricsPropType = PropTypes.shape({
  globalMoranI: PropTypes.number.isRequired,
  pValue: PropTypes.number.isRequired,
  zScore: PropTypes.number.isRequired,
  avgLocalI: PropTypes.number.isRequired,
  maxLocalI: PropTypes.number.isRequired,
  spatialAssociation: PropTypes.number.isRequired,
  significanceLevels: PropTypes.shape({
    highlySignificant: PropTypes.number.isRequired,
    significant: PropTypes.number.isRequired,
    marginal: PropTypes.number.isRequired,
    notSignificant: PropTypes.number.isRequired
  }).isRequired
});

// Component PropTypes
export const LISAMapPropTypes = {
  localStats: PropTypes.objectOf(LocalMoranStatisticsPropType),
  geometry: PropTypes.any.isRequired,
  selectedRegion: PropTypes.string,
  onRegionSelect: PropTypes.func.isRequired
};

export const MoranScatterPlotPropTypes = {
  data: PropTypes.objectOf(LocalMoranStatisticsPropType),
  globalMoranI: PropTypes.number.isRequired,
  selectedRegion: PropTypes.string,
  onPointSelect: PropTypes.func.isRequired
};

export const ClusterMatrixPropTypes = {
  clusters: PropTypes.objectOf(PropTypes.arrayOf(
    PropTypes.shape({
      region: PropTypes.string.isRequired,
      ...LocalMoranStatisticsPropType
    })
  )),
  local: PropTypes.objectOf(LocalMoranStatisticsPropType),
  selectedRegion: PropTypes.string,
  onRegionSelect: PropTypes.func.isRequired
};

export const SpatialAnalysisPanelPropTypes = {
  global: GlobalMoranStatisticsPropType,
  local: PropTypes.objectOf(LocalMoranStatisticsPropType),
  selectedRegion: PropTypes.string,
  clusters: PropTypes.objectOf(PropTypes.arrayOf(
    PropTypes.shape({
      region: PropTypes.string.isRequired,
      ...LocalMoranStatisticsPropType
    })
  )),
  spatialMetrics: SpatialMetricsPropType
};

export const SpatialAnalysisErrorBoundaryPropTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node
};

export const PerformanceMonitorPanelPropTypes = {
  refreshInterval: PropTypes.number,
  showSuggestions: PropTypes.bool
};

export const SpatialOptimizationPropTypes = {
  transformData: PropTypes.bool,
  cacheKey: PropTypes.string
};