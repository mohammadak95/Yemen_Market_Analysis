//src/components/analysis/price-differential/EnhancedRegressionResults.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Tooltip,
  IconButton,
  useTheme,
  Chip,
  Alert,
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const tooltips = {
  regression_analysis: 'Statistical analysis examining the relationship between market prices',
  r_squared: 'Measure of model fit (0-1). Higher values indicate better fit.',
  adjusted_r_squared: 'R-squared adjusted for model complexity',
  intercept: 'Base price differential when all factors are zero',
  slope: 'Rate of change in price differential',
  p_value: 'Statistical significance of the model',
  f_statistic: 'Overall model significance test statistic',
  standard_error: 'Measure of coefficient estimation precision',
  residual_std_error: 'Average deviation of predictions from actual values',
  durbin_watson: 'Test for autocorrelation in residuals (ideal: close to 2)',
  beta_distance: 'Effect of distance on price differential',
  beta_conflict: 'Effect of conflict on price differential',
};

const EnhancedRegressionResults = ({ regressionData }) => {
  const theme = useTheme();

  const styles = {
    container: {
      p: 3,
      height: '100%',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      mb: 4,
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      '& .MuiIconButton-root': {
        ml: 1,
      },
    },
    sectionTitle: {
      fontSize: '1.25rem',
      fontWeight: 600,
      mb: 3,
    },
    metricContainer: {
      p: 3,
      bgcolor: theme.palette.grey[50],
      borderRadius: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    metricHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      mb: 2,
      color: theme.palette.text.secondary,
    },
    metricValue: {
      fontSize: '1.5rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    },
    alertContainer: {
      mt: 3,
      p: 2,
      borderRadius: 1,
    },
  };

  if (!regressionData) {
    return (
      <Alert severity="info">
        No regression results available for this market pair.
      </Alert>
    );
  }

  const {
    intercept,
    slope,
    r_squared,
    adjusted_r_squared,
    p_value,
    f_statistic,
    standard_error,
    residual_std_error,
    durbin_watson,
    beta_distance,
    beta_conflict_corr,
  } = regressionData;

  const metrics = useMemo(() => [
    {
      section: 'Model Fit Statistics',
      metrics: [
        { 
          label: 'R-Squared',
          value: r_squared,
          tooltip: tooltips.r_squared,
          threshold: 0.7,
          format: 'percentage'
        },
        { 
          label: 'Adjusted R-Squared',
          value: adjusted_r_squared,
          tooltip: tooltips.adjusted_r_squared,
          threshold: 0.65,
          format: 'percentage'
        },
      ]
    },
    {
      section: 'Model Parameters',
      metrics: [
        { 
          label: 'Distance Effect',
          value: beta_distance,
          tooltip: tooltips.beta_distance,
          format: 'decimal'
        },
        { 
          label: 'Conflict Effect',
          value: beta_conflict_corr,
          tooltip: tooltips.beta_conflict,
          format: 'decimal'
        },
      ]
    },
    {
      section: 'Model Diagnostics',
      metrics: [
        { 
          label: 'F-Statistic',
          value: f_statistic,
          tooltip: tooltips.f_statistic,
          format: 'decimal'
        },
        { 
          label: 'P-Value',
          value: p_value,
          tooltip: tooltips.p_value,
          threshold: 0.05,
          format: 'decimal',
          inverse: true
        },
        { 
          label: 'Standard Error',
          value: standard_error,
          tooltip: tooltips.standard_error,
          format: 'decimal'
        },
        { 
          label: 'Durbin-Watson',
          value: durbin_watson,
          tooltip: tooltips.durbin_watson,
          threshold: [1.5, 2.5],
          format: 'decimal'
        },
      ]
    }
  ], [regressionData]);

  const formatValue = (metric) => {
    if (metric.value === undefined || metric.value === null) return 'N/A';
    
    switch (metric.format) {
      case 'percentage':
        return `${(metric.value * 100).toFixed(1)}%`;
      case 'decimal':
        return metric.value.toFixed(4);
      default:
        return metric.value.toString();
    }
  };

  const getMetricStatus = (metric) => {
    if (!metric.threshold || metric.value === undefined || metric.value === null) return null;

    let isGood;
    if (Array.isArray(metric.threshold)) {
      // For range thresholds (e.g., Durbin-Watson)
      isGood = metric.value >= metric.threshold[0] && metric.value <= metric.threshold[1];
    } else {
      // For single thresholds
      isGood = metric.inverse 
        ? metric.value < metric.threshold 
        : metric.value > metric.threshold;
    }

    return {
      status: isGood ? 'success' : 'warning',
      message: isGood ? 'Good' : 'Warning',
    };
  };

  const modelStatus = useMemo(() => {
    const isSignificant = p_value < 0.05;
    const hasGoodFit = r_squared > 0.7;
    const hasDurbinWatsonIssue = durbin_watson < 1.5 || durbin_watson > 2.5;

    if (isSignificant && hasGoodFit && !hasDurbinWatsonIssue) {
      return { status: 'success', message: 'Model Validated' };
    } else if (!isSignificant) {
      return { status: 'warning', message: 'Not Significant' };
    } else if (!hasGoodFit) {
      return { status: 'warning', message: 'Poor Fit' };
    } else {
      return { status: 'warning', message: 'Diagnostic Issues' };
    }
  }, [p_value, r_squared, durbin_watson]);

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Box sx={styles.title}>
          <Typography variant="h5">Regression Analysis</Typography>
          <Tooltip title={tooltips.regression_analysis}>
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Chip
          icon={modelStatus.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
          label={modelStatus.message}
          color={modelStatus.status}
          variant="outlined"
          sx={{ px: 2 }}
        />
      </Box>

      {metrics.map((section) => (
        <Box key={section.section} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={styles.sectionTitle}>
            {section.section}
          </Typography>
          <Grid container spacing={3}>
            {section.metrics.map((metric) => {
              const status = getMetricStatus(metric);
              return (
                <Grid item xs={12} sm={6} key={metric.label}>
                  <Box sx={styles.metricContainer}>
                    <Box sx={styles.metricHeader}>
                      {metric.label}
                      <Tooltip title={metric.tooltip}>
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={styles.metricValue}>
                      {formatValue(metric)}
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
        severity={modelStatus.status}
        variant="outlined"
        sx={styles.alertContainer}
      >
        <Typography variant="body1">
          {modelStatus.status === 'success'
            ? `The regression model shows strong statistical significance (p=${p_value.toFixed(4)}) and good fit (R²=${(r_squared * 100).toFixed(1)}%). The model provides reliable insights into market price relationships.`
            : `The regression model shows ${p_value < 0.05 ? 'statistical significance but ' : 'no statistical significance and '}${r_squared > 0.7 ? 'good' : 'poor'} fit. Consider the results with appropriate caution.`}
        </Typography>
      </Alert>
    </Paper>
  );
};

EnhancedRegressionResults.propTypes = {
  regressionData: PropTypes.shape({
    intercept: PropTypes.number,
    slope: PropTypes.number,
    r_squared: PropTypes.number,
    adjusted_r_squared: PropTypes.number,
    p_value: PropTypes.number,
    f_statistic: PropTypes.number,
    standard_error: PropTypes.number,
    residual_std_error: PropTypes.number,
    durbin_watson: PropTypes.number,
    beta_distance: PropTypes.number,
    beta_conflict_corr: PropTypes.number,
  }),
};

export default React.memo(EnhancedRegressionResults);
