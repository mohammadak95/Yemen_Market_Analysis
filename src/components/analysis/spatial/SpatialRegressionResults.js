// src/components/analysis/spatial/SpatialRegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ExpandMore as ExpandMoreIcon, Info as InfoIcon } from '@mui/icons-material';
import { analysisStyles } from '../../../styles/analysisStyles';
import ResidualsChart from './components/ResidualsChart';
import ModelDiagnostics from './components/ModelDiagnostics';

const SpatialRegressionResults = ({ results, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;

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
    marketIntegration = {}
  } = results || {};

  // Calculate market integration metrics
  const integrationMetrics = {
    globalStrength: Math.abs(moran_i.I),
    significance: moran_i['p-value'] < 0.05,
    direction: moran_i.I > 0 ? 'positive' : 'negative',
    spilloverMagnitude: Math.abs(coefficients.spatial_lag_price || 0)
  };

  return (
    <Box>
      {/* Market Integration Analysis */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Market Integration Analysis
          <Tooltip title="Analysis of spatial price relationships and market connectivity">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2, 
              bgcolor: theme.palette.background.default,
              borderRadius: 1,
              '&:hover .analysis-info': {
                opacity: 1
              }
            }}>
              <Typography variant="subtitle1" gutterBottom>
                Global Integration Pattern
              </Typography>
              <Typography variant="body1">
                {integrationMetrics.globalStrength > 0.3 ? 'Strong' : 
                 integrationMetrics.globalStrength > 0.1 ? 'Moderate' : 'Weak'} 
                {' '}{integrationMetrics.direction} spatial dependence
              </Typography>
              <Typography 
                className="analysis-info"
                variant="body2" 
                sx={{ 
                  mt: 1,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: theme.palette.text.secondary
                }}
              >
                {integrationMetrics.significance ? 
                  'Statistically significant spatial price relationships' : 
                  'Limited evidence of systematic spatial patterns'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2, 
              bgcolor: theme.palette.background.default,
              borderRadius: 1,
              '&:hover .analysis-info': {
                opacity: 1
              }
            }}>
              <Typography variant="subtitle1" gutterBottom>
                Price Transmission
              </Typography>
              <Typography variant="body1">
                {integrationMetrics.spilloverMagnitude > 0.8 ? 'High' :
                 integrationMetrics.spilloverMagnitude > 0.4 ? 'Moderate' : 'Low'} 
                {' '}spillover effects
              </Typography>
              <Typography 
                className="analysis-info"
                variant="body2" 
                sx={{ 
                  mt: 1,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: theme.palette.text.secondary
                }}
              >
                {`${(integrationMetrics.spilloverMagnitude * 100).toFixed(1)}% price transmission between neighboring markets`}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Residuals Analysis */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            Spatial Price Deviations
            <Tooltip title="Analysis of systematic price variations across regions">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ height: isMobile ? 300 : 400 }}>
            <ResidualsChart 
              residuals={residual}
              isMobile={isMobile}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Model Diagnostics */}
      <ModelDiagnostics
        intercept={intercept}
        coefficients={coefficients}
        moranI={moran_i}
        rSquared={r_squared}
        observations={observations}
        vif={vif}
      />

      {/* Economic Implications */}
      <Paper sx={{ 
        p: 2, 
        mt: 3,
        bgcolor: theme.palette.grey[50],
        '&:hover .implications-info': {
          opacity: 1
        }
      }}>
        <Typography variant="h6" gutterBottom color="primary">
          Economic Implications
        </Typography>
        <Typography variant="body1" paragraph>
          {integrationMetrics.globalStrength > 0.3 ? 
            'Markets exhibit strong spatial integration, suggesting efficient price transmission mechanisms.' :
            integrationMetrics.globalStrength > 0.1 ?
            'Moderate spatial integration indicates partially connected markets with some friction in price transmission.' :
            'Weak spatial integration suggests significant barriers to market connectivity.'}
        </Typography>
        <Typography 
          className="implications-info"
          variant="body2" 
          sx={{ 
            opacity: 0,
            transition: 'opacity 0.2s',
            color: theme.palette.text.secondary
          }}
        >
          {`Model explains ${(r_squared * 100).toFixed(1)}% of price variations, with 
           ${integrationMetrics.significance ? 'significant' : 'limited'} spatial dependencies. 
           ${integrationMetrics.spilloverMagnitude > 0.5 ? 
             'Strong price spillovers suggest well-connected markets despite conflict conditions.' :
             'Limited price spillovers indicate potential market fragmentation due to conflict barriers.'}`}
        </Typography>
      </Paper>
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
    marketIntegration: PropTypes.object
  }).isRequired,
  windowWidth: PropTypes.number.isRequired
};

export default SpatialRegressionResults;
