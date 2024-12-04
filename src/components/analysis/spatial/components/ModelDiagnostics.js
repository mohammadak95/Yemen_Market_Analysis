// src/components/analysis/spatial/components/ModelDiagnostics.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Grid,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { analysisStyles } from '../../../../styles/analysisStyles';

const ModelDiagnostics = ({ 
  intercept, 
  coefficients, 
  moranI, 
  rSquared, 
  observations, 
  vif = [] 
}) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  const spatialDependence = moranI.I > 0 ? 'positive' : 'negative';
  const significanceLevel = moranI['p-value'] < 0.05;
  const spatialLagCoef = coefficients.spatial_lag_price || 0;

  // Economic interpretation thresholds
  const interpretations = {
    spatialLag: {
      strength: Math.abs(spatialLagCoef) > 0.8 ? 'strong' : 
                Math.abs(spatialLagCoef) > 0.4 ? 'moderate' : 'weak',
      implication: Math.abs(spatialLagCoef) > 0.8 ? 
        'High market integration with efficient price transmission' :
        Math.abs(spatialLagCoef) > 0.4 ?
        'Moderate market connectivity with some friction in price transmission' :
        'Limited market integration suggesting significant barriers'
    },
    moranI: {
      pattern: Math.abs(moranI.I) > 0.3 ? 'strong' :
               Math.abs(moranI.I) > 0.1 ? 'moderate' : 'weak',
      implication: Math.abs(moranI.I) > 0.3 ?
        'Clear spatial price patterns indicating connected markets' :
        Math.abs(moranI.I) > 0.1 ?
        'Some spatial price clustering with partial market segmentation' :
        'Limited spatial patterns suggesting fragmented markets'
    }
  };

  return (
    <Accordion sx={{ mt: 3 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="model-diagnostics-content"
        id="model-diagnostics-header"
      >
        <Typography variant="h6">
          Spatial Model Diagnostics
          <Tooltip title="Technical analysis of spatial price relationships">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          {/* Spatial Dependencies */}
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 2,
              '&:hover .diagnostic-info': {
                opacity: 1
              }
            }}>
              <Typography variant="subtitle1" gutterBottom>
                Spatial Dependencies
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.background.default,
                    borderRadius: 1
                  }}>
                    <Typography variant="body1" gutterBottom>
                      Price Spillover Effect: {interpretations.spatialLag.strength}
                    </Typography>
                    <Typography 
                      className="diagnostic-info"
                      variant="body2"
                      sx={{ 
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        color: theme.palette.text.secondary
                      }}
                    >
                      {interpretations.spatialLag.implication}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.background.default,
                    borderRadius: 1
                  }}>
                    <Typography variant="body1" gutterBottom>
                      Spatial Autocorrelation: {interpretations.moranI.pattern}
                    </Typography>
                    <Typography 
                      className="diagnostic-info"
                      variant="body2"
                      sx={{ 
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        color: theme.palette.text.secondary
                      }}
                    >
                      {interpretations.moranI.implication}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Model Specification */}
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 2,
              '&:hover .specification-info': {
                opacity: 1
              }
            }}>
              <Typography variant="subtitle1" gutterBottom>
                Model Specification
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: theme.palette.background.default,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}>
                <Typography variant="body2">
                  Price = {intercept.toFixed(4)} + {spatialLagCoef.toFixed(4)} × W_Price
                </Typography>
                <Typography 
                  className="specification-info"
                  variant="caption"
                  sx={{ 
                    display: 'block',
                    mt: 1,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: theme.palette.text.secondary
                  }}
                >
                  W_Price represents spatially weighted average prices of neighboring markets
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Statistical Validity */}
          <Grid item xs={12}>
            <Paper sx={{ 
              p: 2,
              '&:hover .validity-info': {
                opacity: 1
              }
            }}>
              <Typography variant="subtitle1" gutterBottom>
                Statistical Validity
              </Typography>
              <Box sx={{ p: 2, bgcolor: theme.palette.background.default, borderRadius: 1 }}>
                <Typography variant="body2" paragraph>
                  • Model explains {(rSquared * 100).toFixed(1)}% of price variations
                </Typography>
                <Typography variant="body2" paragraph>
                  • Spatial dependence is {significanceLevel ? 'statistically significant' : 'not significant'}
                </Typography>
                <Typography variant="body2">
                  • Based on {observations} market-month observations
                </Typography>
                <Typography 
                  className="validity-info"
                  variant="caption"
                  sx={{ 
                    display: 'block',
                    mt: 1,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: theme.palette.text.secondary
                  }}
                >
                  {significanceLevel ? 
                    `Strong evidence of ${spatialDependence} spatial price relationships` :
                    'Limited evidence of systematic spatial patterns'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

ModelDiagnostics.propTypes = {
  intercept: PropTypes.number.isRequired,
  coefficients: PropTypes.shape({
    spatial_lag_price: PropTypes.number
  }).isRequired,
  moranI: PropTypes.shape({
    I: PropTypes.number.isRequired,
    'p-value': PropTypes.number.isRequired
  }).isRequired,
  rSquared: PropTypes.number.isRequired,
  observations: PropTypes.number.isRequired,
  vif: PropTypes.arrayOf(PropTypes.shape({
    Variable: PropTypes.string,
    VIF: PropTypes.number
  }))
};

export default ModelDiagnostics;
