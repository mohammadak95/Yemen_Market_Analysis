/**
 * Types for spatial autocorrelation analysis
 */

// Significance levels for statistical tests
export const SIGNIFICANCE_LEVELS = {
  HIGHLY_SIGNIFICANT: 0.01,
  SIGNIFICANT: 0.05,
  MARGINALLY_SIGNIFICANT: 0.1
} as const;

// Cluster types for LISA analysis
export const CLUSTER_TYPES = {
  HIGH_HIGH: 'high-high',
  LOW_LOW: 'low-low',
  HIGH_LOW: 'high-low',
  LOW_HIGH: 'low-high',
  NOT_SIGNIFICANT: 'not_significant'
} as const;

// Colors for different cluster types
export const CLUSTER_COLORS = {
  [CLUSTER_TYPES.HIGH_HIGH]: '#d73027', // Hot spots (red)
  [CLUSTER_TYPES.LOW_LOW]: '#313695', // Cold spots (blue)
  [CLUSTER_TYPES.HIGH_LOW]: '#fdae61', // High-Low outliers (orange)
  [CLUSTER_TYPES.LOW_HIGH]: '#74add1', // Low-High outliers (light blue)
  [CLUSTER_TYPES.NOT_SIGNIFICANT]: '#969696' // Not significant (gray)
} as const;

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
} as const;

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
} as const;

// Types for spatial data
export interface TimeSeriesDataPoint {
  region: string;
  month: string;
  usdPrice: number;
  conflictIntensity: number;
  additionalProperties?: Record<string, any>;
}

export interface GlobalMoranStatistics {
  moran_i: number;
  p_value: number;
  z_score: number;
  significance: boolean;
}

export interface LocalMoranStatistics {
  local_i: number;
  p_value: number;
  z_score: number;
  cluster_type: keyof typeof CLUSTER_TYPES;
  variance: number;
  spatial_lag: number;
}

export interface ClusterAnalysis {
  totals: {
    [K in keyof typeof CLUSTER_TYPES]: number;
  };
  significantCount: number;
  totalRegions: number;
  significanceRate: number;
  hotspotRate: number;
  coldspotRate: number;
  outlierRate: number;
}

export interface SpatialMetrics {
  globalMoranI: number;
  pValue: number;
  zScore: number;
  avgLocalI: number;
  maxLocalI: number;
  spatialAssociation: number;
  significanceLevels: {
    highlySignificant: number;
    significant: number;
    marginal: number;
    notSignificant: number;
  };
}

export interface RegionMetrics extends LocalMoranStatistics {
  isSignificant: boolean;
  significanceLevel: string;
  standardizedValue: number;
}

export interface WeightsMatrix {
  [region: string]: {
    [neighbor: string]: number;
  };
}

export interface SpatialAutocorrelationState {
  global: GlobalMoranStatistics | null;
  local: Record<string, LocalMoranStatistics> | null;
  clusters: Record<keyof typeof CLUSTER_TYPES, Array<LocalMoranStatistics & { region: string }>> | null;
  geometry: any; // GeometryData type from your GIS library
  clusterAnalysis: ClusterAnalysis | null;
  spatialMetrics: SpatialMetrics | null;
  getRegionMetrics: (regionId: string) => RegionMetrics | null;
  isLoading: boolean;
  hasError: boolean;
}

// Props for visualization components
export interface LISAMapProps {
  localStats: Record<string, LocalMoranStatistics> | null;
  geometry: any;
  selectedRegion: string | null;
  onRegionSelect: (region: string) => void;
}

export interface MoranScatterPlotProps {
  data: Record<string, LocalMoranStatistics> | null;
  globalMoranI: number;
  selectedRegion: string | null;
  onPointSelect: (region: string) => void;
}

export interface ClusterMatrixProps {
  clusters: Record<keyof typeof CLUSTER_TYPES, Array<LocalMoranStatistics & { region: string }>> | null;
  local: Record<string, LocalMoranStatistics> | null;
  selectedRegion: string | null;
  onRegionSelect: (region: string) => void;
}

export interface SpatialAnalysisPanelProps {
  global: GlobalMoranStatistics | null;
  local: Record<string, LocalMoranStatistics> | null;
  selectedRegion: string | null;
  clusters: Record<keyof typeof CLUSTER_TYPES, Array<LocalMoranStatistics & { region: string }>> | null;
  spatialMetrics: SpatialMetrics | null;
}

// Error boundary props
export interface SpatialAnalysisErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Performance monitor props
export interface PerformanceMonitorPanelProps {
  refreshInterval?: number;
  showSuggestions?: boolean;
}

// Spatial optimization props
export interface SpatialOptimizationProps {
  transformData?: boolean;
  cacheKey?: string;
}
