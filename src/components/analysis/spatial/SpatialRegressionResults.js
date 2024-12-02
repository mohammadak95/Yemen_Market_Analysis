import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Typography,
  Divider,
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

  const {
    coefficients,
    intercept,
    p_values,
    r_squared,
    adj_r_squared,
    mse,
    moran_i,
    observations,
    residual
  } = results;

  // Additional model-specific statistics
  const renderModelStats = () => (
    <>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>
        Advanced Model Statistics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Direct Effects"
            value={coefficients.direct_effects || 0}
            precision={4}
            subvalue="Immediate Impact"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Indirect Effects"
            value={coefficients.indirect_effects || 0}
            precision={4}
            subvalue="Spillover Effects"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Total Effects"
            value={coefficients.total_effects || 0}
            precision={4}
            subvalue="Combined Impact"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Model Selection"
            value={coefficients.aic || 0}
            precision={2}
            subvalue="AIC Score"
          />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Spatial Dependence Tests
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="LM (lag)"
            value={coefficients.lm_lag || 0}
            precision={4}
            subvalue={`p-value: ${(p_values.lm_lag || 0).toExponential(2)}`}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="LM (error)"
            value={coefficients.lm_error || 0}
            precision={4}
            subvalue={`p-value: ${(p_values.lm_error || 0).toExponential(2)}`}
          />
        </Grid>
      </Grid>
    </>
  );

  return (
    <Box>
      {/* Key Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Spatial Lag Coefficient"
            value={coefficients.spatial_lag_price}
            precision={4}
            subvalue={`p-value: ${p_values.spatial_lag_price.toExponential(2)}`}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Model Fit (R²)"
            value={r_squared}
            precision={4}
            subvalue={`Adjusted R²: ${adj_r_squared.toFixed(4)}`}
            format="percentage"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Spatial Autocorrelation"
            value={moran_i.I}
            precision={4}
            subvalue={`p-value: ${moran_i["p-value"].toExponential(2)}`}
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
        mode={mode}
      />
    </Box>
  );
};

SpatialRegressionResults.propTypes = {
  results: PropTypes.shape({
    coefficients: PropTypes.shape({
      spatial_lag_price: PropTypes.number.isRequired,
      direct_effects: PropTypes.number,
      indirect_effects: PropTypes.number,
      total_effects: PropTypes.number,
      aic: PropTypes.number,
      lm_lag: PropTypes.number,
      lm_error: PropTypes.number
    }).isRequired,
    intercept: PropTypes.number.isRequired,
    p_values: PropTypes.shape({
      spatial_lag_price: PropTypes.number.isRequired,
      lm_lag: PropTypes.number,
      lm_error: PropTypes.number
    }).isRequired,
    r_squared: PropTypes.number.isRequired,
    adj_r_squared: PropTypes.number.isRequired,
    mse: PropTypes.number.isRequired,
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      "p-value": PropTypes.number.isRequired
    }).isRequired,
    observations: PropTypes.number.isRequired,
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      residual: PropTypes.number.isRequired
    })).isRequired
  }).isRequired,
  windowWidth: PropTypes.number.isRequired,
  mode: PropTypes.oneOf(['analysis', 'model'])
};

export default SpatialRegressionResults;
