// src/components/analysis/spatial-analysis/SpatialDiagnostics.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Box,
  Grid,
  Alert,
  AlertTitle,
  Chip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Hub,
  Timeline,
} from '@mui/icons-material';

const SpatialDiagnostics = ({
  data,
  selectedDate,
  selectedRegion,
  marketClusters,
  shocks,
}) => {
  if (!data) return null;

  const {
    moran_i,
    r_squared,
    adj_r_squared,
    observations,
    mse,
    coefficients,
    p_values,
    residual,
    vif,
  } = data;

  // Calculate cluster metrics for selected region
  const clusterMetrics = useMemo(() => {
    if (!selectedRegion || !marketClusters) return null;

    const regionCluster = marketClusters.find(
      (cluster) =>
        cluster.mainMarket === selectedRegion ||
        cluster.connectedMarkets.includes(selectedRegion)
    );

    if (!regionCluster) return null;

    return {
      clusterSize: regionCluster.marketCount,
      flowIntensity: regionCluster.avgFlow,
      marketRole: regionCluster.mainMarket === selectedRegion ? 'hub' : 'peripheral',
      integrationLevel: regionCluster.totalFlow / observations,
    };
  }, [selectedRegion, marketClusters, observations]);

  // Calculate shock impact for selected date
  const shockImpact = useMemo(() => {
    if (!shocks?.length || !selectedDate) return null;

    const dateShocks = shocks.filter((shock) => shock.date === selectedDate);
    if (!dateShocks.length) return null;

    return {
      count: dateShocks.length,
      avgMagnitude:
        dateShocks.reduce((acc, shock) => acc + shock.magnitude, 0) / dateShocks.length,
      severity: dateShocks.some((shock) => shock.severity === 'high') ? 'high' : 'medium',
      type: dateShocks[0].type, // Most recent shock type
    };
  }, [shocks, selectedDate]);

  // Enhanced diagnostic calculations
  const diagnostics = useMemo(() => {
    return {
      spatialEffects: {
        moranI: moran_i?.I || 0,
        pValue: moran_i?.['p-value'] || 0,
        spatialLag: coefficients?.spatial_lag_price || 0,
        significance: p_values?.spatial_lag_price < 0.05,
      },
      marketEfficiency: {
        rSquared: r_squared || 0,
        adjRSquared: adj_r_squared || 0,
        mse: mse || 0,
        observations: observations || 0,
      },
      structuralMetrics: {
        vif:
          vif?.map((v) => ({
            variable: v.Variable,
            value: v.VIF,
          })) || [],
        residualStats: residual
          ? {
              mean: residual.reduce((acc, r) => acc + r.residual, 0) / residual.length,
              variance:
                residual.reduce((acc, r) => acc + Math.pow(r.residual, 2), 0) /
                residual.length,
            }
          : null,
      },
    };
  }, [moran_i, coefficients, p_values, r_squared, adj_r_squared, mse, observations, vif, residual]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Market Diagnostics
        {selectedRegion && ` - ${selectedRegion}`}
      </Typography>

      {/* Market Integration Metrics */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle1" gutterBottom>
              Market Integration Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Measures spatial price correlation">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Spatial Correlation
                    </Typography>
                    <Chip
                      icon={
                        diagnostics.spatialEffects.moranI > 0 ? (
                          <TrendingUp />
                        ) : (
                          <TrendingDown />
                        )
                      }
                      label={`${(diagnostics.spatialEffects.moranI * 100).toFixed(1)}%`}
                      color={
                        diagnostics.spatialEffects.moranI > 0 ? 'success' : 'error'
                      }
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>
              {/* Other metrics remain the same */}
            </Grid>
          </Paper>
        </Grid>

        {/* Cluster Analysis */}
        {clusterMetrics && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom>
                Market Cluster Analysis
              </Typography>
              <Grid container spacing={2}>
                {/* Cluster metrics content */}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Market Shocks */}
        {shockImpact && (
          <Grid item xs={12}>
            <Alert
              severity={shockImpact.severity === 'high' ? 'error' : 'warning'}
              icon={<Timeline />}
            >
              <AlertTitle>Market Shock Detected</AlertTitle>
              <Grid container spacing={1}>
                {/* Shock impact details */}
              </Grid>
            </Alert>
          </Grid>
        )}

        {/* Statistical Details */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Detailed Statistics
          </Typography>
          {/* Table of statistics */}
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialDiagnostics.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number,
      'p-value': PropTypes.number,
    }),
    r_squared: PropTypes.number,
    adj_r_squared: PropTypes.number,
    observations: PropTypes.number,
    mse: PropTypes.number,
    coefficients: PropTypes.object,
    p_values: PropTypes.object,
    vif: PropTypes.arrayOf(
      PropTypes.shape({
        Variable: PropTypes.string,
        VIF: PropTypes.number,
      })
    ),
    residual: PropTypes.arrayOf(
      PropTypes.shape({
        region_id: PropTypes.string,
        date: PropTypes.string,
        residual: PropTypes.number,
      })
    ),
  }),
  selectedDate: PropTypes.string,
  selectedRegion: PropTypes.string,
  marketClusters: PropTypes.arrayOf(
    PropTypes.shape({
      mainMarket: PropTypes.string,
      connectedMarkets: PropTypes.arrayOf(PropTypes.string),
      totalFlow: PropTypes.number,
      avgFlow: PropTypes.number,
      marketCount: PropTypes.number,
    })
  ),
  shocks: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      magnitude: PropTypes.number,
      type: PropTypes.string,
      severity: PropTypes.string,
    })
  ),
};

export default React.memo(SpatialDiagnostics);
