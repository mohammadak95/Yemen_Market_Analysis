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

/**
 * SpatialDiagnostics Component
 * 
 * This component displays various spatial market diagnostics, including integration analysis,
 * cluster analysis, shock detection, flow analysis, and detailed statistical metrics.
 * 
 * Props:
 * - preprocessedData: Object containing all necessary diagnostic data.
 * - selectedDate: String representing the currently selected date for filtering shocks.
 * - selectedRegion: String representing the currently selected region for filtering flows and clusters.
 */
const SpatialDiagnostics = ({
  preprocessedData,
  selectedDate,
  selectedRegion,
}) => {
  // Extract relevant data from preprocessedData
  const diagnostics = useMemo(() => {
    if (!preprocessedData) return null;

    const { 
      spatial_autocorrelation,
      market_clusters,
      market_shocks,
      flow_analysis,
      regression_stats
    } = preprocessedData;

    return {
      integration: {
        moranI: spatial_autocorrelation.moran_i,
        significance: spatial_autocorrelation.significance,
        clusterCount: market_clusters.length,
      },
      shocks: market_shocks.filter(shock => shock.date.startsWith(selectedDate)),
      flows: flow_analysis.filter(flow => 
        flow.source === selectedRegion || flow.target === selectedRegion
      ),
      cluster: market_clusters.find(cluster => 
        cluster.main_market === selectedRegion || 
        cluster.connected_markets.includes(selectedRegion)
      ),
      regression: regression_stats,
    };
  }, [preprocessedData, selectedDate, selectedRegion]);

  // Calculate cluster metrics for the selected region
  const clusterMetrics = useMemo(() => {
    if (!selectedRegion || !diagnostics?.cluster) return null;

    const { cluster, regression } = diagnostics;
    const { observations } = regression || {};

    return {
      clusterSize: cluster.marketCount,
      flowIntensity: cluster.avgFlow,
      marketRole: cluster.main_market === selectedRegion ? 'Hub' : 'Peripheral',
      integrationLevel: cluster.totalFlow / (observations || 1),
    };
  }, [diagnostics, selectedRegion]);

  // Calculate shock impact for the selected date
  const shockImpact = useMemo(() => {
    if (!diagnostics?.shocks?.length || !selectedDate) return null;

    const dateShocks = diagnostics.shocks;
    if (!dateShocks.length) return null;

    const avgMagnitude = dateShocks.reduce((acc, shock) => acc + shock.magnitude, 0) / dateShocks.length;
    const severity = dateShocks.some(shock => shock.severity === 'high') ? 'high' : 'medium';
    const type = dateShocks[dateShocks.length - 1].type; // Most recent shock type

    return {
      count: dateShocks.length,
      avgMagnitude,
      severity,
      type,
    };
  }, [diagnostics, selectedDate]);

  // Enhanced diagnostic calculations
  const detailedDiagnostics = useMemo(() => {
    if (!diagnostics?.regression) return null;

    const {
      moranI,
      pValue,
      spatialLag,
      significance,
      rSquared,
      adjRSquared,
      mse,
      observations,
      vif,
      residualStats,
    } = diagnostics.regression;

    return {
      spatialEffects: {
        moranI: moranI || 0,
        pValue: pValue || 0,
        spatialLag: spatialLag || 0,
        significance: significance || false,
      },
      marketEfficiency: {
        rSquared: rSquared || 0,
        adjRSquared: adjRSquared || 0,
        mse: mse || 0,
        observations: observations || 0,
      },
      structuralMetrics: {
        vif: vif?.map(v => ({
          variable: v.Variable,
          value: v.VIF,
        })) || [],
        residualStats: residualStats || null,
      },
    };
  }, [diagnostics]);

  if (!diagnostics) return null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Market Diagnostics
        {selectedRegion && ` - ${selectedRegion}`}
      </Typography>

      <Grid container spacing={2}>
        {/* Integration Analysis */}
        <Grid item xs={12}>
          <Alert severity={detailedDiagnostics?.spatialEffects.significance ? "success" : "info"}>
            <AlertTitle>Market Integration Analysis</AlertTitle>
            <Grid container spacing={2}>
              {/* Spatial Correlation */}
              <Grid item xs={6} sm={3}>
                <Tooltip title="Measures spatial price correlation">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Spatial Correlation (Moran's I)
                    </Typography>
                    <Chip
                      icon={
                        detailedDiagnostics?.spatialEffects.moranI > 0 ? (
                          <TrendingUp />
                        ) : (
                          <TrendingDown />
                        )
                      }
                      label={`${(detailedDiagnostics?.spatialEffects.moranI * 100).toFixed(1)}%`}
                      color={
                        detailedDiagnostics?.spatialEffects.significance ? 'success' : 'default'
                      }
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>

              {/* Significance */}
              <Grid item xs={6} sm={3}>
                <Tooltip title="Statistical significance of Moran's I">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Significance
                    </Typography>
                    <Chip
                      icon={
                        detailedDiagnostics?.spatialEffects.significance ? (
                          <CheckCircle />
                        ) : (
                          <Warning />
                        )
                      }
                      label={detailedDiagnostics?.spatialEffects.significance ? 'Significant' : 'Not Significant'}
                      color={
                        detailedDiagnostics?.spatialEffects.significance ? 'success' : 'warning'
                      }
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>

              {/* Cluster Count */}
              <Grid item xs={6} sm={3}>
                <Tooltip title="Number of market clusters identified">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Cluster Count
                    </Typography>
                    <Chip
                      icon={<Hub />}
                      label={detailedDiagnostics?.marketEfficiency.observations || 0}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>

              {/* Integration Level */}
              <Grid item xs={6} sm={3}>
                <Tooltip title="Level of integration based on total flow">
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Integration Level
                    </Typography>
                    <Chip
                      icon={<TrendingUp />}
                      label={`${(clusterMetrics?.integrationLevel * 100).toFixed(1)}%`}
                      color="success"
                      size="small"
                    />
                  </Box>
                </Tooltip>
              </Grid>
            </Grid>
          </Alert>
        </Grid>

        {/* Cluster Analysis */}
        {clusterMetrics && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" gutterBottom>
                Market Cluster Analysis
              </Typography>
              <Grid container spacing={2}>
                {/* Cluster Size */}
                <Grid item xs={6} sm={3}>
                  <Tooltip title="Number of markets in the cluster">
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Cluster Size
                      </Typography>
                      <Chip
                        icon={<Hub />}
                        label={clusterMetrics.clusterSize}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </Tooltip>
                </Grid>

                {/* Flow Intensity */}
                <Grid item xs={6} sm={3}>
                  <Tooltip title="Average flow intensity within the cluster">
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Flow Intensity
                      </Typography>
                      <Chip
                        icon={<TrendingUp />}
                        label={`${clusterMetrics.flowIntensity.toFixed(2)}`}
                        color="success"
                        size="small"
                      />
                    </Box>
                  </Tooltip>
                </Grid>

                {/* Market Role */}
                <Grid item xs={6} sm={3}>
                  <Tooltip title="Role of the selected region in the cluster">
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Market Role
                      </Typography>
                      <Chip
                        icon={<Hub />}
                        label={clusterMetrics.marketRole}
                        color={clusterMetrics.marketRole === 'Hub' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Tooltip>
                </Grid>

                {/* Integration Level */}
                <Grid item xs={6} sm={3}>
                  <Tooltip title="Integration level based on total flow">
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Integration Level
                      </Typography>
                      <Chip
                        icon={<TrendingUp />}
                        label={`${(clusterMetrics.integrationLevel * 100).toFixed(1)}%`}
                        color="success"
                        size="small"
                      />
                    </Box>
                  </Tooltip>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Flow Analysis */}
        {diagnostics.flows && diagnostics.flows.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" gutterBottom>
                Flow Analysis
              </Typography>
              <Grid container spacing={2}>
                {diagnostics.flows.map((flow, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                        {flow.source} → {flow.target}
                      </Typography>
                      <Chip
                        label={`Flow: ${flow.flow_weight.toFixed(2)}`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Shock Detection */}
        {shockImpact && (
          <Grid item xs={12}>
            <Alert
              severity={shockImpact.severity === 'high' ? 'error' : 'warning'}
              icon={<Timeline />}
            >
              <AlertTitle>Market Shock Detected</AlertTitle>
              <Grid container spacing={1}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Shock Count
                  </Typography>
                  <Chip
                    label={shockImpact.count}
                    color="secondary"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Avg. Magnitude
                  </Typography>
                  <Chip
                    label={shockImpact.avgMagnitude.toFixed(2)}
                    color="secondary"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Severity
                  </Typography>
                  <Chip
                    icon={
                      shockImpact.severity === 'high' ? <Warning /> : <CheckCircle />
                    }
                    label={shockImpact.severity.charAt(0).toUpperCase() + shockImpact.severity.slice(1)}
                    color={shockImpact.severity === 'high' ? 'error' : 'warning'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    Shock Type
                  </Typography>
                  <Chip
                    label={shockImpact.type}
                    color="secondary"
                    size="small"
                  />
                </Grid>
              </Grid>
            </Alert>
          </Grid>
        )}

        {/* Detailed Statistics */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Detailed Statistics
          </Typography>
          {detailedDiagnostics && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Spatial Effects */}
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Moran's I
                    </TableCell>
                    <TableCell align="right">{detailedDiagnostics.spatialEffects.moranI.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      P-Value
                    </TableCell>
                    <TableCell align="right">{detailedDiagnostics.spatialEffects.pValue.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Spatial Lag Price
                    </TableCell>
                    <TableCell align="right">{detailedDiagnostics.spatialEffects.spatialLag.toFixed(3)}</TableCell>
                  </TableRow>

                  {/* Market Efficiency */}
                  <TableRow>
                    <TableCell component="th" scope="row">
                      R-Squared
                    </TableCell>
                    <TableCell align="right">{detailedDiagnostics.marketEfficiency.rSquared.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Adjusted R-Squared
                    </TableCell>
                    <TableCell align="right">{detailedDiagnostics.marketEfficiency.adjRSquared.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Mean Squared Error (MSE)
                    </TableCell>
                    <TableCell align="right">{detailedDiagnostics.marketEfficiency.mse.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Observations
                    </TableCell>
                    <TableCell align="right">{detailedDiagnostics.marketEfficiency.observations}</TableCell>
                  </TableRow>

                  {/* Structural Metrics */}
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Variance Inflation Factor (VIF)
                    </TableCell>
                    <TableCell align="right">
                      {detailedDiagnostics.structuralMetrics.vif.map((v, idx) => (
                        <Chip
                          key={idx}
                          label={`${v.variable}: ${v.value.toFixed(2)}`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Residual Mean
                    </TableCell>
                    <TableCell align="right">
                      {detailedDiagnostics.structuralMetrics.residualStats
                        ? detailedDiagnostics.structuralMetrics.residualStats.mean.toFixed(3)
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Residual Variance
                    </TableCell>
                    <TableCell align="right">
                      {detailedDiagnostics.structuralMetrics.residualStats
                        ? detailedDiagnostics.structuralMetrics.residualStats.variance.toFixed(3)
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialDiagnostics.propTypes = {
  preprocessedData: PropTypes.shape({
    spatial_autocorrelation: PropTypes.shape({
      moran_i: PropTypes.number.isRequired,
      significance: PropTypes.bool.isRequired,
    }),
    market_clusters: PropTypes.arrayOf(
      PropTypes.shape({
        main_market: PropTypes.string.isRequired,
        connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired,
        totalFlow: PropTypes.number.isRequired,
        avgFlow: PropTypes.number.isRequired,
        marketCount: PropTypes.number.isRequired,
      })
    ),
    market_shocks: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string.isRequired,
        magnitude: PropTypes.number.isRequired,
        type: PropTypes.string.isRequired,
        severity: PropTypes.string.isRequired,
      })
    ),
    flow_analysis: PropTypes.arrayOf(
      PropTypes.shape({
        source: PropTypes.string.isRequired,
        target: PropTypes.string.isRequired,
        flow_weight: PropTypes.number.isRequired,
      })
    ),
    regression_stats: PropTypes.shape({
      moran_i: PropTypes.shape({
        I: PropTypes.number,
        'p-value': PropTypes.number,
      }),
      r_squared: PropTypes.number,
      adj_r_squared: PropTypes.number,
      observations: PropTypes.number,
      mse: PropTypes.number,
      coefficients: PropTypes.shape({
        spatial_lag_price: PropTypes.number,
      }),
      p_values: PropTypes.shape({
        spatial_lag_price: PropTypes.number,
      }),
      vif: PropTypes.arrayOf(
        PropTypes.shape({
          Variable: PropTypes.string.isRequired,
          VIF: PropTypes.number.isRequired,
        })
      ),
      residual: PropTypes.arrayOf(
        PropTypes.shape({
          region_id: PropTypes.string.isRequired,
          date: PropTypes.string.isRequired,
          residual: PropTypes.number.isRequired,
        })
      ),
    }),
  }),
  selectedDate: PropTypes.string,
  selectedRegion: PropTypes.string,
};

export default React.memo(SpatialDiagnostics);
