// src/components/spatial-analysis/SpatialStatistics.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Tooltip,
  IconButton,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Info as InfoIcon } from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';


const SpatialStatistics = ({ analysisResults }) => {
  if (!analysisResults?.statistics) {
    return (
      <Alert severity="info">
        <AlertTitle>No Analysis Results</AlertTitle>
        Spatial statistics are not available for the current selection.
      </Alert>
    );
  }

  const {
    global_moran,
    local_moran,
    clustering_coefficient,
    network_density
  } = analysisResults.statistics;

  const formatValue = (value) => {
    return typeof value === 'number' ? value.toFixed(3) : 'N/A';
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Spatial Statistics
        <Tooltip title="Statistical measures of spatial relationships">
          <IconButton size="small">
            <InfoIcon size={16} />
          </IconButton>
        </Tooltip>
      </Typography>

      <Grid container spacing={2}>
        {/* Global Spatial Autocorrelation */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Global Spatial Autocorrelation
              </Typography>
              <Box sx={{ mb: 2 }}>
                <BlockMath>
                  {"I = \\frac{N}{W} \\frac{\\sum_i \\sum_j w_{ij}(x_i - \\bar{x})(x_j - \\bar{x})}{\\sum_i (x_i - \\bar{x})^2}"}
                </BlockMath>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Where <InlineMath>{"w_{ij}"}</InlineMath> represents spatial weights
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2">
                  Moran's I: {formatValue(global_moran?.value)}
                </Typography>
                <Typography variant="body2">
                  P-value: {formatValue(global_moran?.p_value)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Local Spatial Patterns */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Local Spatial Patterns
              </Typography>
              <Box>
                <Typography variant="body2">
                  Average Local Moran's I: {formatValue(local_moran?.mean)}
                </Typography>
                <Typography variant="body2">
                  Significant Clusters: {local_moran?.significant_clusters || 0}
                </Typography>
                <Typography variant="body2">
                  Clustering Coefficient: {formatValue(clustering_coefficient)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Network Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Market Network Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Network Density: {formatValue(network_density)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Interpretation */}
        <Grid item xs={12}>
          <Alert severity={global_moran?.value > 0.3 ? 'success' : 'info'}>
            <AlertTitle>Interpretation</AlertTitle>
            {global_moran?.value > 0.3 ? (
              'Strong spatial autocorrelation detected, indicating significant clustering of similar values.'
            ) : global_moran?.value > 0 ? (
              'Moderate spatial autocorrelation present, suggesting some clustering patterns.'
            ) : (
              'Weak or no significant spatial autocorrelation detected.'
            )}
          </Alert>
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialStatistics.propTypes = {
  analysisResults: PropTypes.shape({
    statistics: PropTypes.shape({
      global_moran: PropTypes.shape({
        value: PropTypes.number,
        p_value: PropTypes.number
      }),
      local_moran: PropTypes.shape({
        mean: PropTypes.number,
        significant_clusters: PropTypes.number
      }),
      clustering_coefficient: PropTypes.number,
      network_density: PropTypes.number
    })
  })
};

export default SpatialStatistics;