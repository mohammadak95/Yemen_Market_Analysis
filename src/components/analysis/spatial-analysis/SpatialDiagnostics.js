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
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Hub,
  Timeline
} from '@mui/icons-material';

const SpatialDiagnostics = ({ 
  data, 
  selectedMonth, 
  selectedRegion,
  marketClusters,
  shocks
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
    vif
  } = data;

  // Calculate cluster metrics for selected region
  const clusterMetrics = useMemo(() => {
    if (!selectedRegion || !marketClusters) return null;

    const regionCluster = marketClusters.find(cluster => 
      cluster.mainMarket === selectedRegion || 
      cluster.connectedMarkets.has(selectedRegion)
    );

    if (!regionCluster) return null;

    return {
      clusterSize: regionCluster.marketCount,
      flowIntensity: regionCluster.avgFlow,
      marketRole: regionCluster.mainMarket === selectedRegion ? 'hub' : 'peripheral',
      integrationLevel: regionCluster.totalFlow / observations
    };
  }, [selectedRegion, marketClusters, observations]);

  // Calculate shock impact for selected month
  const shockImpact = useMemo(() => {
    if (!shocks?.length || !selectedMonth) return null;

    const monthShocks = shocks.filter(shock => shock.month === selectedMonth);
    if (!monthShocks.length) return null;

    return {
      count: monthShocks.length,
      avgMagnitude: monthShocks.reduce((acc, shock) => acc + shock.magnitude, 0) / monthShocks.length,
      severity: monthShocks.some(shock => shock.severity === 'high') ? 'high' : 'medium',
      type: monthShocks[0].type // Most recent shock type
    };
  }, [shocks, selectedMonth]);

  // Enhanced diagnostic calculations
  const diagnostics = useMemo(() => {
    return {
      spatialEffects: {
        moranI: moran_i?.I || 0,
        pValue: moran_i?.['p-value'] || 0,
        spatialLag: coefficients?.spatial_lag_price || 0,
        significance: p_values?.spatial_lag_price < 0.05
      },
      marketEfficiency: {
        rSquared: r_squared || 0,
        adjRSquared: adj_r_squared || 0,
        mse: mse || 0,
        observations: observations || 0
      },
      structuralMetrics: {
        vif: vif?.map(v => ({
          variable: v.Variable,
          value: v.VIF
        })) || [],
        residualStats: residual ? {
          mean: residual.reduce((acc, r) => acc + r.residual, 0) / residual.length,
          variance: residual.reduce((acc, r) => acc + Math.pow(r.residual, 2), 0) / residual.length
        } : null
      }
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
                      icon={diagnostics.spatialEffects.moranI > 0 ? <TrendingUp /> : <TrendingDown />}
                      label={`${(diagnostics.spatialEffects.moranI * 100).toFixed(1)}%`}
                      color={diagnostics.spatialEffects.moranI > 0 ? "success" : "error"}
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Market efficiency measure">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Price Transmission
                    </Typography>
                    <Chip
                      icon={diagnostics.spatialEffects.spatialLag > 0.5 ? <CheckCircle /> : <Warning />}
                      label={`${(diagnostics.spatialEffects.spatialLag * 100).toFixed(1)}%`}
                      color={diagnostics.spatialEffects.spatialLag > 0.5 ? "success" : "warning"}
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Model fit quality">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Market Integration
                    </Typography>
                    <Chip
                      icon={diagnostics.marketEfficiency.rSquared > 0.3 ? <CheckCircle /> : <Warning />}
                      label={`${(diagnostics.marketEfficiency.rSquared * 100).toFixed(1)}%`}
                      color={diagnostics.marketEfficiency.rSquared > 0.3 ? "success" : "warning"}
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Sample size">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Observations
                    </Typography>
                    <Chip
                      label={diagnostics.marketEfficiency.observations}
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>
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
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Market Role
                  </Typography>
                  <Chip
                    icon={<Hub />}
                    label={clusterMetrics.marketRole}
                    color={clusterMetrics.marketRole === 'hub' ? "primary" : "default"}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Cluster Size
                  </Typography>
                  <Chip
                    label={`${clusterMetrics.clusterSize} markets`}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Flow Intensity
                  </Typography>
                  <Chip
                    label={`${clusterMetrics.flowIntensity.toFixed(2)}`}
                    color={clusterMetrics.flowIntensity > 1 ? "success" : "default"}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Integration Level
                  </Typography>
                  <Chip
                    label={`${(clusterMetrics.integrationLevel * 100).toFixed(1)}%`}
                    color={clusterMetrics.integrationLevel > 0.5 ? "success" : "warning"}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Market Shocks */}
        {shockImpact && (
          <Grid item xs={12}>
            <Alert 
              severity={shockImpact.severity === 'high' ? "error" : "warning"}
              icon={<Timeline />}
            >
              <AlertTitle>Market Shock Detected</AlertTitle>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    Type: {shockImpact.type === 'price_surge' ? 'Price Surge' : 'Price Drop'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    Magnitude: {(shockImpact.avgMagnitude * 100).toFixed(1)}%
                  </Typography>
                </Grid>
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
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="right">Significance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Spatial Lag</TableCell>
                  <TableCell align="right">
                    {diagnostics.spatialEffects.spatialLag.toFixed(4)}
                  </TableCell>
                  <TableCell align="right">
                    {diagnostics.spatialEffects.significance ? 
                      <CheckCircle color="success" /> : 
                      <Warning color="warning" />
                    }
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Model Fit (R²)</TableCell>
                  <TableCell align="right">
                    {diagnostics.marketEfficiency.rSquared.toFixed(4)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={diagnostics.marketEfficiency.rSquared > 0.3 ? "Good" : "Poor"}
                      color={diagnostics.marketEfficiency.rSquared > 0.3 ? "success" : "warning"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                {diagnostics.structuralMetrics.vif.map((v, index) => (
                  <TableRow key={index}>
                    <TableCell>{`VIF (${v.variable})`}</TableCell>
                    <TableCell align="right">{v.value.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={v.value < 5 ? "Acceptable" : "High"}
                        color={v.value < 5 ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
    vif: PropTypes.arrayOf(PropTypes.shape({
      Variable: PropTypes.string,
      VIF: PropTypes.number
    })),
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string,
      date: PropTypes.string,
      residual: PropTypes.number
    }))
  }),
  selectedMonth: PropTypes.string,
  selectedRegion: PropTypes.string,
  marketClusters: PropTypes.arrayOf(PropTypes.shape({
    mainMarket: PropTypes.string,
    connectedMarkets: PropTypes.instanceOf(Set),
    totalFlow: PropTypes.number,
    avgFlow: PropTypes.number,
    marketCount: PropTypes.number
  })),
  shocks: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string,
    magnitude: PropTypes.number,
    type: PropTypes.string,
    severity: PropTypes.string
  }))
};

export default React.memo(SpatialDiagnostics);
