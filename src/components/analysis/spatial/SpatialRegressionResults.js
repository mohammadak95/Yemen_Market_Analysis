import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { analysisStyles } from '../../../styles/analysisStyles';
import StatCard from './components/StatCard';
import ResidualsChart from './components/ResidualsChart';
import ModelDiagnostics from './components/ModelDiagnostics';

const SpatialRegressionResults = ({ results, windowWidth }) => {
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
      />
    </Box>
  );
};

SpatialRegressionResults.propTypes = {
  results: PropTypes.shape({
    coefficients: PropTypes.shape({
      spatial_lag_price: PropTypes.number.isRequired
    }).isRequired,
    intercept: PropTypes.number.isRequired,
    p_values: PropTypes.shape({
      spatial_lag_price: PropTypes.number.isRequired
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
  windowWidth: PropTypes.number.isRequired
};

export default SpatialRegressionResults;