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
  Chip,
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const DiagnosticsTable = ({ data, isMobile }) => {
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
    statusChip: {
      height: 28,
      fontSize: '0.875rem',
    },
    alertContainer: {
      mt: 4,
      p: 2,
      borderRadius: 1,
    },
  };

  if (!data) {
    return (
      <Alert severity="info">
        No diagnostic test results available for this market pair.
      </Alert>
    );
  }

  const {
    common_dates,
    conflict_correlation,
    distance_km,
    model_diagnostics,
    residual_diagnostics,
  } = data;

  const metrics = useMemo(() => [
    {
      section: 'Market Characteristics',
      metrics: [
        { 
          label: 'Common Trading Days',
          value: common_dates,
          tooltip: 'Number of days with price data available for both markets',
          format: 'number'
        },
        {
          label: 'Market Distance',
          value: distance_km,
          tooltip: 'Physical distance between markets in kilometers',
          format: 'distance',
          unit: 'km'
        },
      ]
    },
    {
      section: 'Market Integration Metrics',
      metrics: [
        {
          label: 'Conflict Correlation',
          value: conflict_correlation,
          tooltip: 'Correlation between conflict intensities in both market areas',
          format: 'decimal',
          threshold: 0.5,
          interpretation: value => value > 0.5 ? 'High correlation' : 'Low correlation'
        },
        ...(model_diagnostics?.r_squared ? [{
          label: 'Model R-squared',
          value: model_diagnostics.r_squared,
          tooltip: 'Proportion of variance explained by the model',
          format: 'percentage',
          threshold: 0.7,
          interpretation: value => value > 0.7 ? 'Strong fit' : 'Moderate fit'
        }] : []),
      ]
    },
    ...(residual_diagnostics ? [{
      section: 'Residual Diagnostics',
      metrics: [
        {
          label: 'Normality Test p-value',
          value: residual_diagnostics.normality_test?.p_value,
          tooltip: 'Tests if residuals follow a normal distribution',
          format: 'decimal',
          showStatus: true,
          threshold: 0.05,
          interpretation: value => value >= 0.05 ? 'Normal distribution' : 'Non-normal distribution'
        },
        {
          label: 'Heteroskedasticity Test p-value',
          value: residual_diagnostics.heteroskedasticity_test?.p_value,
          tooltip: 'Tests for constant variance in residuals',
          format: 'decimal',
          showStatus: true,
          threshold: 0.05,
          interpretation: value => value >= 0.05 ? 'Homoskedastic' : 'Heteroskedastic'
        },
      ]
    }] : []),
  ], [common_dates, distance_km, conflict_correlation, model_diagnostics, residual_diagnostics]);

  const formatValue = (metric) => {
    if (metric.value === undefined || metric.value === null) return 'N/A';
    
    switch (metric.format) {
      case 'decimal':
        return metric.value.toFixed(4);
      case 'percentage':
        return `${(metric.value * 100).toFixed(1)}%`;
      case 'distance':
        return `${metric.value.toFixed(1)} ${metric.unit}`;
      case 'number':
        return metric.value.toLocaleString();
      default:
        return metric.value.toString();
    }
  };

  const getMetricStatus = (metric) => {
    if (!metric.threshold || metric.value === undefined || metric.value === null) return null;
    
    const isGood = metric.format === 'decimal' && metric.showStatus
      ? metric.value >= metric.threshold
      : metric.value > metric.threshold;

    return {
      status: isGood ? 'success' : 'warning',
      message: metric.interpretation ? metric.interpretation(metric.value) : (isGood ? 'Good' : 'Warning'),
    };
  };

  const overallStatus = useMemo(() => {
    if (!residual_diagnostics) return { status: 'info', message: 'Limited diagnostics available' };

    const hasNormalResiduals = residual_diagnostics.normality_test?.p_value >= 0.05;
    const hasHomoskedasticity = residual_diagnostics.heteroskedasticity_test?.p_value >= 0.05;
    const hasGoodFit = model_diagnostics?.r_squared > 0.7;

    if (hasNormalResiduals && hasHomoskedasticity && hasGoodFit) {
      return { status: 'success', message: 'Model assumptions validated' };
    } else if (!hasNormalResiduals && !hasHomoskedasticity) {
      return { status: 'warning', message: 'Multiple assumption violations' };
    } else {
      return { status: 'warning', message: 'Some assumptions violated' };
    }
  }, [residual_diagnostics, model_diagnostics]);

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Box sx={styles.title}>
          <Typography variant="h5">Market Pair Diagnostics</Typography>
          <Tooltip title="Comprehensive diagnostics of market pair relationships">
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Chip
          icon={overallStatus.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
          label={overallStatus.message}
          color={overallStatus.status}
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
                          sx={styles.statusChip}
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
        severity={overallStatus.status}
        variant="outlined"
        icon={overallStatus.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
        sx={styles.alertContainer}
      >
        <Typography variant="body1">
          {overallStatus.status === 'success'
            ? 'All diagnostic tests indicate reliable model results. The analysis provides a robust basis for market integration assessment.'
            : overallStatus.status === 'warning'
            ? 'Some diagnostic tests indicate potential issues. Consider the results with appropriate caution and potentially investigate alternative model specifications.'
            : 'Limited diagnostic information available. Results should be interpreted within the context of available metrics.'}
        </Typography>
      </Alert>
    </Paper>
  );
};

DiagnosticsTable.propTypes = {
  data: PropTypes.shape({
    common_dates: PropTypes.number,
    conflict_correlation: PropTypes.number,
    distance_km: PropTypes.number,
    model_diagnostics: PropTypes.shape({
      r_squared: PropTypes.number,
    }),
    residual_diagnostics: PropTypes.shape({
      normality_test: PropTypes.shape({
        p_value: PropTypes.number,
      }),
      heteroskedasticity_test: PropTypes.shape({
        p_value: PropTypes.number,
      }),
    }),
  }),
  isMobile: PropTypes.bool.isRequired,
};

export default React.memo(DiagnosticsTable);
