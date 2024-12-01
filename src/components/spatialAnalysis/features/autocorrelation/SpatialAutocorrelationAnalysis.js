// src/components/spatialAnalysis/features/autocorrelation/SpatialAutocorrelationAnalysis.js

import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';
import LISAMap from './LISAMap';
import MoranScatterPlot from './MoranScatterPlot';

import { useSpatialAutocorrelation } from '../../hooks/useSpatialAutocorrelation';

const SpatialAutocorrelationAnalysis = () => {
  const theme = useTheme();
  const { data, loading, error } = useSpatialAutocorrelation();

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <MetricProgress message="Loading spatial autocorrelation analysis..." />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Show empty state
  if (!data) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No spatial autocorrelation data available</Typography>
      </Box>
    );
  }

  const { global, summary, clusters } = data;

  return (
    <Grid container spacing={2}>
      {/* Global Statistics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Global Moran's I"
              value={global.moranI}
              format="decimal"
              description="Spatial autocorrelation measure"
              significance={global.isSignificant}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Significant Regions"
              value={summary.significanceRate}
              format="percentage"
              description={`${summary.significantRegions} out of ${summary.totalRegions} regions`}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="High-High Clusters"
              value={clusters.highHigh.length}
              format="number"
              description="Regions with high values surrounded by high values"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Low-Low Clusters"
              value={clusters.lowLow.length}
              format="number"
              description="Regions with low values surrounded by low values"
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Map and Scatter Plot */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ height: 600, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            LISA Cluster Map
          </Typography>
          <LISAMap
            data={data.local}
            geometry={data.geometry}
          />
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ height: 600, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Moran Scatter Plot
          </Typography>
          <MoranScatterPlot
            data={data.local}
            globalMoranI={global.moranI}
          />
        </Paper>
      </Grid>

      {/* Summary */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Spatial Analysis Summary
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {global.isSignificant ? (
              `The analysis shows significant spatial autocorrelation (Moran's I: ${global.moranI.toFixed(3)}, p-value: ${global.pValue.toFixed(3)}). 
              ${summary.significantRegions} out of ${summary.totalRegions} regions show significant local spatial patterns, 
              with ${clusters.highHigh.length} high-high clusters and ${clusters.lowLow.length} low-low clusters.`
            ) : (
              `The analysis shows no significant global spatial autocorrelation (Moran's I: ${global.moranI.toFixed(3)}, p-value: ${global.pValue.toFixed(3)}). 
              However, ${summary.significantRegions} regions show significant local spatial patterns.`
            )}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(SpatialAutocorrelationAnalysis);
