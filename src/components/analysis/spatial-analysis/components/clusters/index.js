// src/components/analysis/spatial-analysis/index.js
export { default as ClusterMap } from './ClusterMap';
export { default as ClusterMetricsPanel } from './ClusterMetricsPanel';
export { default as EfficiencyRadarChart } from './EfficiencyRadarChart';
export { default as ClusterComparisonTable } from './ClusterComparisonTable';
export { default as SpatialClusterAnalysis } from './SpatialClusterAnalysis';
export { default as ClusterEfficiencyDashboard } from './ClusterEfficiencyDashboard';

// src/constants/clusterAnalysis.js
export const CLUSTER_ANALYSIS_CONFIG = {
  thresholds: {
    high: 0.7,
    medium: 0.4,
    low: 0
  },
  colors: {
    high: '#4caf50',
    medium: '#ff9800',
    low: '#f44336'
  },
  mapSettings: {
    center: [15.3694, 44.191],
    zoom: 6,
    minZoom: 5,
    maxZoom: 10
  }
};

// src/styles/clusterAnalysis.js
import { alpha } from '@mui/material/styles';

export const clusterAnalysisStyles = (theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  mapContainer: {
    height: 600,
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden'
  },
  metricsPanel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  comparisonTable: {
    '& .MuiDataGrid-root': {
      border: 'none',
      '& .MuiDataGrid-cell': {
        borderColor: theme.palette.divider
      },
      '& .MuiDataGrid-columnHeaders': {
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
        borderBottom: `1px solid ${theme.palette.divider}`
      }
    }
  }
});