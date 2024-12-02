// src/components/analysis/spatial/SpatialRegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Typography,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { analysisStyles } from '../../../styles/analysisStyles';
import StatCard from './components/StatCard';
import ResidualsChart from './components/ResidualsChart';
import ModelDiagnostics from './components/ModelDiagnostics';

const SpatialRegressionResults = ({ results, windowWidth, mode = 'analysis' }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // Destructure with default values to handle potential missing data
  const {
    coefficients = {},
    intercept = 0,
    p_values = {},
    r_squared = 0,
    adj_r_squared = 0,
    mse = 0,
    moran_i = { I: 0, 'p-value': 1 },
    observations = 0,
    residual = [],
    vif = [],
    regime = 'unified'
  } = results || {};

  // Format p-value display
  const formatPValue = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (value < 0.001) return '< 0.001';
    return value.toExponential(3);
  };

  // Calculate additional statistics
  const getAdditionalStats = () => {
    const residualValues = residual.map(r => r.residual);
    const mean = residualValues.reduce((a, b) => a + b, 0) / residualValues.length;
    const variance = residualValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / residualValues.length;
    
    return {
      residualMean: mean,
      residualVariance: variance,
      standardError: Math.sqrt(mse / observations)
    };
  };

  const additionalStats = getAdditionalStats();

  // Model-specific statistics component
  const renderModelStats = () => (
    <>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>
        Advanced Model Statistics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Variable</TableCell>
                  <TableCell align="right">Coefficient</TableCell>
                  <TableCell align="right">P-value</TableCell>
                  {vif.length > 0 && <TableCell align="right">VIF</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(coefficients).map(([variable, value]) => (
                  <TableRow key={variable}>
                    <TableCell>{variable.replace(/_/g, ' ')}</TableCell>
                    <TableCell align="right">{value.toFixed(4)}</TableCell>
                    <TableCell align="right">{formatPValue(p_values[variable])}</TableCell>
                    {vif.length > 0 && (
                      <TableCell align="right">
                        {vif.find(v => v.Variable === variable)?.VIF.toFixed(2) || 'N/A'}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} sm={6}>
          <StatCard
            title="Standard Error"
            value={additionalStats.standardError}
            format="decimal"
            subvalue="Regression Standard Error"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Mean Residual"
            value={additionalStats.residualMean}
            format="decimal"
            subvalue={`Variance: ${additionalStats.residualVariance.toFixed(4)}`}
          />
        </Grid>
      </Grid>
    </>
  );

  return (
    <Box>
      {/* Header with regime information */}
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Analysis for {regime.toUpperCase()} regime
      </Typography>

      {/* Key Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Spatial Lag Coefficient"
            value={coefficients.spatial_lag_price}
            subvalue={`p-value: ${formatPValue(p_values.spatial_lag_price)}`}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Model Fit (R²)"
            value={r_squared}
            subvalue={`Adjusted R²: ${adj_r_squared.toFixed(4)}`}
            format="percentage"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Spatial Autocorrelation"
            value={moran_i.I}
            subvalue={`p-value: ${formatPValue(moran_i['p-value'])}`}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Sample Size"
            value={observations}
            subvalue={`MSE: ${mse.toFixed(4)}`}
            format="number"
          />
        </Grid>
      </Grid>

      {/* Model-specific statistics */}
      {mode === 'model' && renderModelStats()}

      {/* Residuals Time Series Chart */}
      <Box sx={styles.chartContainer}>
        <Typography variant="h6" gutterBottom>
          Residuals Over Time
        </Typography>
        <ResidualsChart 
          residuals={residual}
          isMobile={isMobile}
        />
      </Box>

      {/* Model Diagnostics Panel */}
      <ModelDiagnostics
        intercept={intercept}
        coefficients={coefficients}
        moranI={moran_i}
        rSquared={r_squared}
        observations={observations}
        vif={vif}
        mode={mode}
      />
    </Box>
  );
};

SpatialRegressionResults.propTypes = {
  results: PropTypes.shape({
    coefficients: PropTypes.shape({
      spatial_lag_price: PropTypes.number
    }).isRequired,
    intercept: PropTypes.number.isRequired,
    p_values: PropTypes.shape({
      spatial_lag_price: PropTypes.number
    }).isRequired,
    r_squared: PropTypes.number.isRequired,
    adj_r_squared: PropTypes.number.isRequired,
    mse: PropTypes.number.isRequired,
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired
    }).isRequired,
    observations: PropTypes.number.isRequired,
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      residual: PropTypes.number.isRequired
    })).isRequired,
    vif: PropTypes.arrayOf(PropTypes.shape({
      Variable: PropTypes.string,
      VIF: PropTypes.number
    })),
    regime: PropTypes.string
  }).isRequired,
  windowWidth: PropTypes.number.isRequired,
  mode: PropTypes.oneOf(['analysis', 'model'])
};

export default SpatialRegressionResults;