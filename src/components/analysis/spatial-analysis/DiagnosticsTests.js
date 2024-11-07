// src/components/analysis/spatial-analysis/DiagnosticsTests.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tooltip,
  Box,
  Grid,
  Alert,
  Divider,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const DiagnosticsTests = ({ data, selectedMonth }) => {
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

  // Filter residuals for the selected month
  const currentPeriodResiduals = useMemo(() => {
    if (!residual || !selectedMonth) return [];
    return residual.filter(
      (r) => r.date.slice(0, 7) === selectedMonth
    );
  }, [residual, selectedMonth]);

  // Calculate residual statistics
  const residualStats = useMemo(() => {
    if (!currentPeriodResiduals.length) return null;

    const values = currentPeriodResiduals.map((r) => r.residual);
    const mean =
      values.reduce((sum, val) => sum + val, 0) / values.length || 0;
    const std =
      Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          values.length
      ) || 0;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      mean,
      std,
      min,
      max,
      values, // For visualization
    };
  }, [currentPeriodResiduals]);

  const explanations = {
    moranI:
      "Moran's I measures spatial autocorrelation. Values range from -1 (perfect dispersion) to 1 (perfect clustering), with 0 indicating random spatial distribution.",
    rSquared:
      "R-squared indicates the proportion of variance in the dependent variable that's explained by the independent variables. Values range from 0 to 1, with 1 indicating perfect fit.",
    adjRSquared:
      "Adjusted R-squared modifies R-squared to account for the number of predictors, providing a more accurate measure of model fit.",
    mse: 'Mean Squared Error measures the average squared difference between predicted and actual values. Lower values indicate better model fit.',
    vif: 'Variance Inflation Factor measures multicollinearity. Values > 5 suggest problematic correlation between predictors.',
    coefficients:
      'Regression coefficients show the change in the dependent variable for a one-unit change in each predictor.',
    residuals:
      'Residuals are the differences between observed and predicted values, helping identify areas where the model fits poorly.',
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagnostics Tests
      </Typography>

      <Grid container spacing={3}>
        {/* Global Model Statistics */}
        <Grid item xs={12} md={6}>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {/* Moran's I */}
                <TableRow>
                  <TableCell>
                    <Tooltip title={explanations.moranI} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Moran's I
                        <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    {moran_i?.I?.toFixed(4) || 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    p ={' '}
                    {(
                      moran_i?.['p-value'] ||
                      moran_i?.p_value ||
                      0
                    ).toFixed(4)}
                  </TableCell>
                </TableRow>

                {/* R-squared and Adjusted R-squared */}
                <TableRow>
                  <TableCell>
                    <Tooltip title={explanations.rSquared} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        R² / Adjusted R²
                        <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" colSpan={2}>
                    {r_squared?.toFixed(4) || 'N/A'} /{' '}
                    {adj_r_squared?.toFixed(4) || 'N/A'}
                  </TableCell>
                </TableRow>

                {/* MSE */}
                <TableRow>
                  <TableCell>
                    <Tooltip title={explanations.mse} arrow>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Mean Squared Error
                        <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" colSpan={2}>
                    {mse?.toFixed(4) || 'N/A'}
                  </TableCell>
                </TableRow>

                {/* Observations */}
                <TableRow>
                  <TableCell>Observations</TableCell>
                  <TableCell align="right" colSpan={2}>
                    {observations || 'N/A'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Model Coefficients */}
        <Grid item xs={12} md={6}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Variable</TableCell>
                  <TableCell align="right">Coefficient</TableCell>
                  <TableCell align="right">P-value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coefficients &&
                  Object.entries(coefficients).map(([name, value]) => (
                    <TableRow key={name}>
                      <TableCell>{name}</TableCell>
                      <TableCell align="right">
                        {value?.toFixed(4) || 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        {p_values?.[name] !== undefined
                          ? p_values[name] < 0.001
                            ? '<0.001'
                            : p_values[name].toFixed(4)
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* VIF Details */}
        {vif && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Variance Inflation Factor (VIF)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Variable</TableCell>
                    <TableCell align="right">VIF</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vif.map((v) => (
                    <TableRow key={v.Variable}>
                      <TableCell>{v.Variable}</TableCell>
                      <TableCell align="right">
                        {v.VIF?.toFixed(2) || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        )}

        {/* Residual Statistics */}
        {residualStats && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Residual Statistics for {selectedMonth}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Mean</TableCell>
                          <TableCell align="right">
                            {residualStats.mean.toFixed(4)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Standard Deviation</TableCell>
                          <TableCell align="right">
                            {residualStats.std.toFixed(4)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Min / Max</TableCell>
                          <TableCell align="right">
                            {residualStats.min.toFixed(4)} /{' '}
                            {residualStats.max.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  {/* Histogram */}
                  <Typography variant="subtitle2" gutterBottom>
                    Residual Distribution
                  </Typography>
                  <Bar
                    data={{
                      labels: residualStats.values.map((_, idx) => idx + 1),
                      datasets: [
                        {
                          label: 'Residuals',
                          data: residualStats.values,
                          backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        },
                      ],
                    }}
                    options={{
                      scales: {
                        x: { display: false },
                        y: { display: true },
                      },
                      plugins: {
                        legend: { display: false },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Interpretation Alert */}
        {residualStats && (
          <Grid item xs={12}>
            <Alert
              severity={
                Math.abs(residualStats.mean) < 0.1
                  ? 'success'
                  : Math.abs(residualStats.mean) < 0.5
                  ? 'warning'
                  : 'error'
              }
            >
              {Math.abs(residualStats.mean) < 0.1
                ? 'Residuals are well-centered around zero, indicating unbiased predictions.'
                : Math.abs(residualStats.mean) < 0.5
                ? 'Residuals show slight bias in predictions.'
                : 'Residuals indicate significant bias in predictions.'}
            </Alert>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

DiagnosticsTests.propTypes = {
  data: PropTypes.object.isRequired,
  selectedMonth: PropTypes.string.isRequired,
};

export default DiagnosticsTests;