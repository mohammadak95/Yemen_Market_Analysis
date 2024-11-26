// src/components/analysis/spatial-analysis/components/autocorrelation/SpatialAutocorrelationAnalysis.js

import React from 'react';
import { Grid, Box, Typography, Paper } from '@mui/material';
import MoranScatterPlot from './MoranScatterPlot';
import LISAMap from './LISAMap';

const SpatialAutocorrelationAnalysis = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Spatial Autocorrelation Analysis
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Moran's I Scatterplot
            </Typography>
            <MoranScatterPlot />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              LISA Cluster Map
            </Typography>
            <LISAMap />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SpatialAutocorrelationAnalysis;