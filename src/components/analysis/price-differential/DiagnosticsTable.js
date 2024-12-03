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
import { useTechnicalHelp } from '@/hooks';

const DiagnosticsTable = ({ data, isMobile }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');
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
    p_value,
  } = data;

  const actualDistance = useMemo(() => 
    distance_km !== undefined ? distance_km * 250 : undefined
  , [distance_km]);

  const metrics = useMemo(() => [
    {
      section: 'Market Statistics',
      metrics: [
        { 
          label: 'Common Dates',
          value: common_dates,
          tooltip: 'common_dates',
          format: 'number'
        },
        {
          label: 'Distance',
          value: actualDistance,
          tooltip: 'distance_km',
          format: 'distance',
          unit: 'km'
        },
      ]
    },
    {
      section: 'Correlation Analysis',
      metrics: [
        {
          label: 'Conflict Correlation',
          value: conflict_correlation,
          tooltip: 'conflict_correlation',
          format: 'decimal'
        },
        {
          label: 'P-Value',
          value: p_value,
          tooltip: 'p_value',
          format: 'decimal',
          showStatus: true
        },
      ]
    }
  ], [common_dates, actualDistance, conflict_correlation, p_value]);

  const formatValue = (metric) => {
    if (metric.value === undefined) return 'N/A';
    
    switch (metric.format) {
      case 'decimal':
        return metric.value.toFixed(4);
      case 'distance':
        return `${metric.value.toFixed(1)} ${metric.unit}`;
      case 'number':
        return metric.value.toString();
      default:
        return metric.value;
    }
  };

  const overallStatus = p_value < 0.05 ? 'warning' : 'success';
  const statusMessage = p_value < 0.05 
    ? 'Model needs review'
    : 'Model validated';

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Box sx={styles.title}>
          <Typography variant="h5">Diagnostic Results</Typography>
          <Tooltip title={getTechnicalTooltip('diagnostics_overview')}>
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Chip
          icon={overallStatus === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
          label={statusMessage}
          color={overallStatus}
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
            {section.metrics.map((metric) => (
              <Grid item xs={12} sm={6} key={metric.label}>
                <Box sx={styles.metricContainer}>
                  <Box sx={styles.metricHeader}>
                    {metric.label}
                    <Tooltip title={getTechnicalTooltip(metric.tooltip)}>
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={styles.metricValue}>
                    {formatValue(metric)}
                    {metric.showStatus && (
                      <Chip
                        size="small"
                        icon={overallStatus === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                        label={overallStatus.toUpperCase()}
                        color={overallStatus}
                        sx={styles.statusChip}
                      />
                    )}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      <Alert 
        severity={overallStatus}
        variant="outlined"
        icon={overallStatus === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
        sx={styles.alertContainer}
      >
        <Typography variant="body1">
          {p_value < 0.05
            ? 'Statistical analysis indicates potential model assumption violations. Consider reviewing the analysis parameters and data quality.'
            : 'Model diagnostics indicate valid statistical assumptions. The analysis results can be interpreted with confidence.'}
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
    p_value: PropTypes.number,
  }).isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default React.memo(DiagnosticsTable);