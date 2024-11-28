// src/components/analysis/spatial-analysis/components/autocorrelation/SpatialAutocorrelationAnalysis.js

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import MetricCard from '../common/MetricCard';
import LISAMap from './LISAMap';
import MoranScatterPlot from './MoranScatterPlot';
import { selectSpatialAutocorrelation, selectUnifiedGeometry, selectStatus } from '../../../../../selectors/optimizedSelectors';

const SpatialAutocorrelationAnalysis = () => {
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);
  const geometry = useSelector(selectUnifiedGeometry);
  const status = useSelector(selectStatus);

  const { global, local } = spatialAutocorrelation || {};

  const summaryMetrics = useMemo(() => {
    if (!local) return null;

    const processedClusters = Object.entries(local).map(([region, data]) => ({
      ...data,
      normalizedName: region,
    }));

    const highHigh = processedClusters.filter((c) => c.cluster_type === 'high-high').length;
    const lowLow = processedClusters.filter((c) => c.cluster_type === 'low-low').length;
    const outliers = processedClusters.filter((c) =>
      ['high-low', 'low-high'].includes(c.cluster_type)
    ).length;

    return {
      highHigh,
      lowLow,
      outliers,
      totalClusters: processedClusters.length,
    };
  }, [local]);

  if (status.loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!spatialAutocorrelation || !geometry) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No spatial autocorrelation data available.
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Spatial Price Autocorrelation Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analysis of spatial price relationships and clustering patterns across markets.
          </Typography>
        </Paper>
      </Grid>

      {/* Global Metrics */}
      <Grid item xs={12} md={4}>
        <MetricCard
          title="Global Moran's I"
          value={global?.moran_i}
          format="number"
          description="Measure of overall spatial autocorrelation."
        />
        <MetricCard
          title="High-High Clusters"
          value={summaryMetrics?.highHigh}
          format="integer"
          description="Number of high-price clusters."
        />
        <MetricCard
          title="Low-Low Clusters"
          value={summaryMetrics?.lowLow}
          format="integer"
          description="Number of low-price clusters."
        />
        <MetricCard
          title="Spatial Outliers"
          value={summaryMetrics?.outliers}
          format="integer"
          description="Number of spatial outliers."
        />
      </Grid>

      {/* LISA Map */}
      <Grid item xs={12} md={8}>
        <LISAMap localMorans={local} geometry={geometry} />
      </Grid>

      {/* Moran Scatter Plot */}
      <Grid item xs={12}>
        <MoranScatterPlot />
      </Grid>
    </Grid>
  );
};

export default SpatialAutocorrelationAnalysis;