// src/components/spatialAnalysis/features/autocorrelation/SpatialAutocorrelationAnalysis.js

import React, { useState, Suspense } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MapIcon from '@mui/icons-material/Map';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import TableChartIcon from '@mui/icons-material/TableChart';

import LISAMap from './LISAMap';
import MoranScatterPlot from './MoranScatterPlot';
import SpatialAnalysisPanel from './SpatialAnalysisPanel';
import ClusterMatrix from './ClusterMatrix';
import SpatialAnalysisErrorBoundary from './components/SpatialAnalysisErrorBoundary';
import { withSpatialOptimization } from './components/SpatialAnalysisOptimizer';
import { useSpatialAutocorrelation } from './hooks/useSpatialAutocorrelation';

// Optimize visualization components
const OptimizedLISAMap = withSpatialOptimization(
  LISAMap,
  { transformData: true, cacheKey: 'lisa-map' }
);

const OptimizedMoranScatterPlot = withSpatialOptimization(
  MoranScatterPlot,
  { transformData: true, cacheKey: 'moran-scatter' }
);

const OptimizedClusterMatrix = withSpatialOptimization(
  ClusterMatrix,
  { transformData: true, cacheKey: 'cluster-matrix' }
);

// Loading component
const LoadingView = () => (
  <Box 
    display="flex" 
    flexDirection="column"
    justifyContent="center" 
    alignItems="center" 
    height="100%" 
    minHeight={400}
    gap={2}
  >
    <CircularProgress />
    <Typography variant="h6" color="textSecondary">
      Loading spatial analysis data...
    </Typography>
  </Box>
);

// Error fallback component
const ErrorFallback = () => (
  <Box p={3}>
    <Alert severity="error">
      <Typography variant="body1">
        Unable to load spatial analysis visualization.
        Please check your data and try again.
      </Typography>
    </Alert>
  </Box>
);

const SpatialAutocorrelationAnalysis = () => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('map');
  const [selectedRegion, setSelectedRegion] = useState(null);

  const {
    global,
    local,
    clusters,
    geometry,
    clusterAnalysis,
    spatialMetrics,
    getRegionMetrics,
    isLoading,
    hasError
  } = useSpatialAutocorrelation();

  // Handle loading state
  if (isLoading) {
    return <LoadingView />;
  }

  // Handle error state
  if (hasError) {
    return <ErrorFallback />;
  }

  const selectedRegionMetrics = selectedRegion ? getRegionMetrics(selectedRegion) : null;

  // Safely format values
  const formatValue = (value) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(3) : value.toString();
  };

  const formatPercentage = (value) => {
    if (value == null || isNaN(value)) return '0%';
    const formatted = Math.min(Math.max(value, 0), 100);
    return `${formatted.toFixed(1)}%`;
  };

  const renderContent = () => (
    <Grid container spacing={2}>

      {/* View Controls */}
      <Grid item xs={12}>
        <Box display="flex" justifyContent="center">
          <Paper sx={{ p: 2, display: 'inline-flex' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="map">
                <MapIcon sx={{ mr: 1 }} />
                LISA MAP
              </ToggleButton>
              <ToggleButton value="scatter">
                <ScatterPlotIcon sx={{ mr: 1 }} />
                MORAN SCATTER
              </ToggleButton>
              <ToggleButton value="table">
                <TableChartIcon sx={{ mr: 1 }} />
                CLUSTER MATRIX
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>
      </Grid>

      {/* Main Visualization */}
      <Grid item xs={12}>
        <Paper sx={{ height: 600 }}>
          <Suspense fallback={<LoadingView />}>
            {viewMode === 'map' && (
              <OptimizedLISAMap
                localStats={local}
                geometry={geometry}
                selectedRegion={selectedRegion}
                onRegionSelect={setSelectedRegion}
              />
            )}
            {viewMode === 'scatter' && (
              <OptimizedMoranScatterPlot
                data={local}
                globalMoranI={global?.moran_i || 0}
                selectedRegion={selectedRegion}
                onPointSelect={setSelectedRegion}
              />
            )}
            {viewMode === 'table' && (
              <OptimizedClusterMatrix
                clusters={clusters}
                local={local}
                selectedRegion={selectedRegion}
                onRegionSelect={setSelectedRegion}
              />
            )}
          </Suspense>
        </Paper>
      </Grid>

      {/* Analysis Panel */}
      <Grid item xs={12}>
        <Paper 
          sx={{ 
            p: 3,
            bgcolor: theme.palette.background.default,
            borderRadius: 2,
            boxShadow: theme.shadows[2]
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Spatial Pattern Analysis
              </Typography>
              {/* The line mentioning negative spatial autocorrelation and zero patterns was removed */}
            </Box>

            {selectedRegionMetrics && (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Selected Region Analysis
                </Typography>
                <Typography variant="body1">
                  {`${selectedRegion} shows ${selectedRegionMetrics.cluster_type?.replace('-', ' ') || 'no'} 
                  pattern with local Moran's I of ${formatValue(selectedRegionMetrics.local_i)} 
                  (${selectedRegionMetrics.significanceLevel || 'Not Significant'}, p-value: ${formatValue(selectedRegionMetrics.p_value)})`}
                </Typography>
              </Box>
            )}

            <SpatialAnalysisPanel
              global={global}
              local={local}
              selectedRegion={selectedRegion}
              clusters={clusters}
              spatialMetrics={spatialMetrics}
            />
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <SpatialAnalysisErrorBoundary fallback={<ErrorFallback />}>
      {renderContent()}
    </SpatialAnalysisErrorBoundary>
  );
};

export default React.memo(SpatialAutocorrelationAnalysis);