// src/components/analysis/price-differential/RegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Tooltip,
  IconButton,
  Chip,
  useTheme
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const RegressionResults = ({ data, baseMarket, comparisonMarket }) => {
  const theme = useTheme();

  if (!data) return null;

  const metrics = [
    {
      label: 'R-Squared',
      value: (data.r_squared * 100).toFixed(1) + '%',
      tooltip: 'Percentage of price differential variation explained by the model',
      threshold: 0.7,
      thresholdType: 'above'
    },
    {
      label: 'Distance Effect',
      value: data.beta_distance?.toFixed(4),
      tooltip: 'Impact of geographical distance on price differences',
      threshold: 0.5,
      thresholdType: 'below'
    },
    {
      label: 'Conflict Effect',
      value: data.beta_conflict?.toFixed(4),
      tooltip: 'Impact of conflict on price differences',
      threshold: 0.3,
      thresholdType: 'below'
    }
  ];

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ mb: 3 }}>
            <BlockMath>
              {`PD_{t} = \\alpha + \\beta_1 Distance + \\beta_2 Conflict + \\epsilon_t`}
            </BlockMath>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Where PD₍t₎ represents the price differential between {baseMarket} and {comparisonMarket} markets
            </Typography>
          </Box>
        </Grid>

        {metrics.map((metric) => (
          <Grid item xs={12} md={4} key={metric.label}>
            <Box sx={{
              p: 2,
              bgcolor: theme.palette.grey[50],
              borderRadius: 1,
              height: '100%'
            }}>
              <Typography variant="subtitle2" gutterBottom>
                {metric.label}
                <Tooltip title={metric.tooltip}>
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">
                  {metric.value}
                </Typography>
                {metric.threshold && (
                  <Chip
                    size="small"
                    icon={
                      metric.thresholdType === 'above' 
                        ? (data.r_squared > metric.threshold ? <CheckCircleIcon /> : <WarningIcon />)
                        : (Math.abs(metric.value) < metric.threshold ? <CheckCircleIcon /> : <WarningIcon />)
                    }
                    label={
                      metric.thresholdType === 'above'
                        ? (data.r_squared > metric.threshold ? 'Good Fit' : 'Poor Fit')
                        : (Math.abs(metric.value) < metric.threshold ? 'Normal' : 'High')
                    }
                    color={
                      metric.thresholdType === 'above'
                        ? (data.r_squared > metric.threshold ? 'success' : 'warning')
                        : (Math.abs(metric.value) < metric.threshold ? 'success' : 'warning')
                    }
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Box sx={{
            p: 2,
            bgcolor: theme.palette.grey[50],
            borderRadius: 1
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Model Interpretation
            </Typography>
            <Typography variant="body2">
              {data.r_squared > 0.7 
                ? 'The model shows strong explanatory power for price differences between markets.'
                : 'The model suggests other factors may influence price differences between markets.'}
              {Math.abs(data.beta_distance) > 0.5 
                ? ' Distance has a significant impact on price disparities.'
                : ' Distance has a moderate effect on price disparities.'}
              {Math.abs(data.beta_conflict) > 0.3 
                ? ' Conflict conditions strongly influence market integration.'
                : ' Conflict has a limited effect on market integration.'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

RegressionResults.propTypes = {
  data: PropTypes.shape({
    r_squared: PropTypes.number.isRequired,
    beta_distance: PropTypes.number,
    beta_conflict: PropTypes.number,
    p_value: PropTypes.number.isRequired
  }),
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired
};

export default React.memo(RegressionResults);