// src/components/analysis/spatial/SpatialRegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Typography,
  useTheme,
  Paper
} from '@mui/material';
import ResidualsChart from './components/ResidualsChart';

const SpatialRegressionResults = ({ results, windowWidth }) => {
  const theme = useTheme();

  const getParameterInterpretation = (param, value) => {
    switch(param) {
      case 'spatial_lag':
        return {
          label: 'Price Spillovers',
          value: value.toFixed(4),
          symbol: 'ρ',
          interpretation: `${(Math.abs(value) * 100).toFixed(1)}% price transmission`,
          detail: value > 0.5 
            ? 'Strong market integration'
            : value > 0.2 
            ? 'Moderate market linkages'
            : 'Limited price transmission',
          significance: results.p_values.spatial_lag_price < 0.05
        };
      case 'spatial_correlation':
        return {
          label: 'Market Clustering',
          value: value.I.toFixed(4),
          symbol: 'I',
          interpretation: `${Math.abs(value.I) > 0.3 ? 'Strong' : Math.abs(value.I) > 0.1 ? 'Moderate' : 'Weak'} spatial patterns`,
          detail: value.I > 0 
            ? 'Similar prices in neighboring regions'
            : 'Distinct local price dynamics',
          significance: value['p-value'] < 0.05
        };
      case 'model_fit':
        return {
          label: 'Market Integration',
          value: (value * 100).toFixed(1) + '%',
          symbol: 'R²',
          interpretation: `${value > 0.7 ? 'Strong' : value > 0.3 ? 'Moderate' : 'Weak'} explanatory power`,
          detail: value > 0.5
            ? 'Model captures key spatial relationships'
            : 'Additional factors influence prices',
          significance: true
        };
      case 'residual_pattern':
        return {
          label: 'Price Deviations',
          value: value.toFixed(4),
          symbol: 'σ',
          interpretation: `${value > 2 ? 'Large' : value > 1 ? 'Moderate' : 'Small'} price variations`,
          detail: 'Standard deviation of regional price differences',
          significance: value < results.mse * 2
        };
      default:
        return null;
    }
  };

  const renderParameterCard = (param, value) => {
    const interpretation = getParameterInterpretation(param, value);
    return (
      <Box sx={{ 
        p: 2, 
        bgcolor: theme.palette.background.default,
        borderRadius: 1,
        height: '100%',
        '&:hover .parameter-info': {
          opacity: 1
        }
      }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {interpretation.symbol} = {interpretation.value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {interpretation.label}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {interpretation.interpretation}
        </Typography>
        <Typography 
          className="parameter-info"
          variant="caption" 
          sx={{ 
            display: 'block',
            mt: 1,
            opacity: 0,
            transition: 'opacity 0.2s',
            color: theme.palette.text.secondary
          }}
        >
          {interpretation.detail}
          {interpretation.significance && (
            <Box component="span" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
              Statistically significant pattern
            </Box>
          )}
        </Typography>
      </Box>
    );
  };

  // Calculate residual standard deviation
  const residualStd = Math.sqrt(
    results.residual.reduce((acc, r) => acc + Math.pow(r.residual, 0), 0) / 
    results.residual.length
  );

  return (
    <Paper sx={{ p: 2 }}>
      {/* Key Parameters */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Model Parameters
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          {renderParameterCard('spatial_lag', results.coefficients.spatial_lag_price)}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderParameterCard('spatial_correlation', results.moran_i)}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderParameterCard('model_fit', results.r_squared)}
        </Grid>
        <Grid item xs={12} md={3}>
          {renderParameterCard('residual_pattern', residualStd)}
        </Grid>
      </Grid>

      {/* Price Deviations */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Regional Price Patterns
        </Typography>
        <Box sx={{ height: 400 }}>
          <ResidualsChart 
            residuals={results.residual}
            isMobile={windowWidth < theme.breakpoints.values.sm}
          />
        </Box>
      </Box>
    </Paper>
  );
};

SpatialRegressionResults.propTypes = {
  results: PropTypes.shape({
    coefficients: PropTypes.shape({
      spatial_lag_price: PropTypes.number
    }).isRequired,
    p_values: PropTypes.shape({
      spatial_lag_price: PropTypes.number
    }).isRequired,
    r_squared: PropTypes.number.isRequired,
    mse: PropTypes.number.isRequired,
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired
    }).isRequired,
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      residual: PropTypes.number.isRequired
    })).isRequired
  }).isRequired,
  windowWidth: PropTypes.number.isRequired
};

export default SpatialRegressionResults;
