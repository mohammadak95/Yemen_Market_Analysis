// src/components/analysis/price-differential/DiagnosticsTable.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Tooltip,
  IconButton,
  Alert,
  useTheme,
  Chip
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const DiagnosticsTable = ({ data, isMobile }) => {
  const theme = useTheme();

  if (!data) {
    return <Alert severity="info">No diagnostic data available for this market pair.</Alert>;
  }

  const metrics = useMemo(() => [
    {
      section: 'Market Characteristics',
      metrics: [
        { 
          label: 'Common Trading Days',
          value: data.common_dates,
          tooltip: 'Number of days with price data available for both markets',
          format: 'number'
        },
        {
          label: 'Market Distance',
          value: data.distance_km * 250, // Converting to actual distance
          tooltip: 'Physical distance between markets in kilometers',
          format: 'distance',
          threshold: 500,
          unit: 'km'
        },
      ]
    },
    {
      section: 'Market Integration Metrics',
      metrics: [
        {
          label: 'Conflict Correlation',
          value: data.conflict_correlation,
          tooltip: 'Correlation between conflict intensities in both market areas',
          format: 'percentage',
          threshold: 0.5,
          interpretation: value => value > 0.5 ? 'High impact' : 'Low impact'
        },
        ...(data.model_diagnostics?.r_squared ? [{
          label: 'Model R-squared',
          value: data.model_diagnostics.r_squared,
          tooltip: 'Proportion of variance explained by the model',
          format: 'percentage',
          threshold: 0.7,
          interpretation: value => value > 0.7 ? 'Strong fit' : 'Moderate fit'
        }] : []),
      ]
    },
    ...(data.residual_diagnostics ? [{
      section: 'Model Diagnostics',
      metrics: [
        {
          label: 'Normality Test',
          value: data.residual_diagnostics.normality_test?.p_value,
          tooltip: 'Tests if residuals follow a normal distribution',
          format: 'p-value',
          threshold: 0.05,
          interpretation: value => value >= 0.05 ? 'Normal' : 'Non-normal'
        },
        {
          label: 'Heteroskedasticity',
          value: data.residual_diagnostics.heteroskedasticity_test?.p_value,
          tooltip: 'Tests for constant variance in residuals',
          format: 'p-value',
          threshold: 0.05,
          interpretation: value => value >= 0.05 ? 'Homoskedastic' : 'Heteroskedastic'
        },
      ]
    }] : []),
  ], [data]);

  const formatValue = (metric) => {
    if (metric.value === undefined || metric.value === null) return 'N/A';
    
    switch (metric.format) {
      case 'percentage':
        return `${(metric.value * 100).toFixed(1)}%`;
      case 'distance':
        return `${metric.value.toFixed(1)} ${metric.unit}`;
      case 'p-value':
        return metric.value.toFixed(4);
      case 'number':
        return metric.value.toLocaleString();
      default:
        return metric.value.toString();
    }
  };

  const getMetricStatus = (metric) => {
    if (!metric.threshold || metric.value === undefined || metric.value === null) return null;
    
    const isGood = metric.format === 'p-value'
      ? metric.value >= metric.threshold
      : metric.value > metric.threshold;

    return {
      status: isGood ? 'success' : 'warning',
      message: metric.interpretation ? metric.interpretation(metric.value) : (isGood ? 'Good' : 'Warning')
    };
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">
          Market Diagnostics
          <Tooltip title="Comprehensive diagnostics of market relationships">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      {metrics.map((section) => (
        <Box key={section.section} sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            {section.section}
          </Typography>
          <Grid container spacing={3}>
            {section.metrics.map((metric) => {
              const status = getMetricStatus(metric);
              return (
                <Grid item xs={12} sm={6} key={metric.label}>
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
                        {formatValue(metric)}
                      </Typography>
                      {status && (
                        <Chip
                          size="small"
                          icon={status.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                          label={status.message}
                          color={status.status}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}

      <Alert 
        severity="info" 
        variant="outlined"
        sx={{ mt: 2 }}
      >
        <Typography variant="body2">
          Market diagnostics combine multiple indicators to assess market integration quality and reliability. Consider all metrics together for comprehensive market analysis.
        </Typography>
      </Alert>
    </Paper>
  );
};

DiagnosticsTable.propTypes = {
  data: PropTypes.shape({
    common_dates: PropTypes.number,
    distance_km: PropTypes.number,
    conflict_correlation: PropTypes.number,
    model_diagnostics: PropTypes.shape({
      r_squared: PropTypes.number
    }),
    residual_diagnostics: PropTypes.shape({
      normality_test: PropTypes.shape({
        p_value: PropTypes.number
      }),
      heteroskedasticity_test: PropTypes.shape({
        p_value: PropTypes.number
      })
    })
  }),
  isMobile: PropTypes.bool.isRequired
};

export default React.memo(DiagnosticsTable);