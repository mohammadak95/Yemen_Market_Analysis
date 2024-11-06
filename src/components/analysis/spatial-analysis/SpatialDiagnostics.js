// src/components/analysis/spatial-analysis/SpatialDiagnostics.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableHead,
  Tooltip,
  Box,
  Alert,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
} from '@mui/icons-material';

const SpatialDiagnostics = ({ data, selectedMonth }) => {
  if (!data) {
    return (
      <Alert severity="info">
        No diagnostics available
      </Alert>
    );
  }

  // Ensure we're accessing the correct analysis result
  const currentAnalysis = Array.isArray(data) ? 
    data.find(d => d.regime === 'unified') : 
    data;

  if (!currentAnalysis) {
    return (
      <Alert severity="warning">
        No unified analysis results available
      </Alert>
    );
  }

  const {
    moran_i,
    r_squared,
    adj_r_squared,
    observations,
    mse,
    coefficients,
    p_values,
    vif,
  } = currentAnalysis;

  const moranIValue = moran_i?.I || moran_i?.value;
  const pValue = moran_i?.['p-value'] || moran_i?.p_value;

  const getSpatialStrength = (value) => {
    if (Math.abs(value) > 0.7) return { text: 'Strong', color: 'success' };
    if (Math.abs(value) > 0.4) return { text: 'Moderate', color: 'primary' };
    if (Math.abs(value) > 0.2) return { text: 'Weak', color: 'warning' };
    return { text: 'Very Weak', color: 'error' };
  };

  const getModelFitQuality = (rsq) => {
    if (rsq > 0.7) return { text: 'Excellent', color: 'success' };
    if (rsq > 0.5) return { text: 'Good', color: 'primary' };
    if (rsq > 0.3) return { text: 'Fair', color: 'warning' };
    return { text: 'Poor', color: 'error' };
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Diagnostics
      </Typography>

      <Grid container spacing={3}>
        {/* Spatial Autocorrelation */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Spatial Autocorrelation
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Tooltip title="Measures spatial autocorrelation from -1 (dispersion) to 1 (clustering)" arrow>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                          Moran's I
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {moranIValue !== undefined ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {moranIValue.toFixed(4)}
                          {moranIValue > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                          <Chip
                            size="small"
                            label={getSpatialStrength(moranIValue).text}
                            color={getSpatialStrength(moranIValue).color}
                          />
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Tooltip title="Statistical significance level" arrow>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                          P-Value
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {pValue !== undefined ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {pValue.toFixed(4)}
                          {pValue < 0.05 ? (
                            <CheckCircle color="success" />
                          ) : (
                            <Warning color="warning" />
                          )}
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>

        {/* Model Fit Statistics */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Model Fit Statistics
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Tooltip title="Proportion of variance explained by the model" arrow>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                          R-Squared
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {r_squared !== undefined ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {r_squared.toFixed(4)}
                          <Chip
                            size="small"
                            label={getModelFitQuality(r_squared).text}
                            color={getModelFitQuality(r_squared).color}
                          />
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Tooltip title="R-squared adjusted for model complexity" arrow>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                          Adjusted R-Squared
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {adj_r_squared !== undefined ? adj_r_squared.toFixed(4) : 'N/A'}
                    </TableCell>
                  </TableRow>
                  {mse !== undefined && (
                    <TableRow>
                      <TableCell>
                        <Tooltip title="Mean Squared Error" arrow>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                            MSE
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{mse.toFixed(4)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>

        {/* Spatial Coefficients */}
        {coefficients && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Spatial Coefficients
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Variable</TableCell>
                    <TableCell>Coefficient</TableCell>
                    <TableCell>P-Value</TableCell>
                    <TableCell>VIF</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(coefficients).map(([name, value]) => (
                    <TableRow key={name}>
                      <TableCell>{name}</TableCell>
                      <TableCell>{value.toFixed(4)}</TableCell>
                      <TableCell>
                        {p_values?.[name] !== undefined ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {p_values[name].toFixed(4)}
                            {p_values[name] < 0.05 && <CheckCircle color="success" fontSize="small" />}
                          </Box>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {vif?.find(v => v.Variable === name)?.VIF?.toFixed(2) || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        )}

        {/* Analysis Summary */}
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mt: 2 }}>
            Analysis based on {observations || 'unknown'} observations.
            {pValue < 0.05 && moranIValue !== undefined && 
              ` Significant spatial autocorrelation detected (${
                moranIValue > 0 ? 'clustering' : 'dispersion'
              } pattern).`
            }
          </Alert>
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialDiagnostics.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.shape({
      moran_i: PropTypes.shape({
        I: PropTypes.number,
        value: PropTypes.number,
        'p-value': PropTypes.number,
        p_value: PropTypes.number,
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
      regime: PropTypes.string
    }),
    PropTypes.arrayOf(PropTypes.object)
  ]),
  selectedMonth: PropTypes.string
};

export default React.memo(SpatialDiagnostics);