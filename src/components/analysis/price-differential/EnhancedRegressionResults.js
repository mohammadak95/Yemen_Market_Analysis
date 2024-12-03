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
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTechnicalHelp } from '@/hooks';

const EnhancedRegressionResults = ({ regressionData }) => {
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
    },
    alertContainer: {
      mt: 3,
      p: 2,
      border: `1px solid ${theme.palette.warning.light}`,
      borderRadius: 1,
      bgcolor: theme.palette.warning.lighter,
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
    durbin_watson,
  } = regressionData;

  const metrics = useMemo(() => [
    {
      section: 'Model Fit',
      metrics: [
        { label: 'R-Squared', value: r_squared, tooltip: 'r_squared' },
        { label: 'Adjusted R-Squared', value: adjusted_r_squared, tooltip: 'adjusted_r_squared' },
      ]
    },
    {
      section: 'Coefficients',
      metrics: [
        { label: 'Intercept', value: intercept, tooltip: 'intercept' },
        { label: 'Slope', value: slope, tooltip: 'slope' },
      ]
    },
    {
      section: 'Diagnostics',
      metrics: [
        { label: 'P-Value', value: p_value, tooltip: 'p_value' },
        { label: 'Durbin-Watson', value: durbin_watson, tooltip: 'durbin_watson' },
      ]
    }
  ], [regressionData]);

  const formatValue = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(4);
  };

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Box sx={styles.title}>
          <Typography variant="h5">Regression Analysis</Typography>
          <Tooltip title={getTechnicalTooltip('regression_analysis')}>
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Chip
          icon={<WarningIcon />}
          label="Model Not Significant"
          color="warning"
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
                  <Typography sx={styles.metricValue}>
                    {formatValue(metric.value)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {p_value >= 0.05 && (
        <Alert 
          severity="warning"
          icon={<WarningIcon />}
          sx={styles.alertContainer}
        >
          The regression model is not statistically significant (p-value ≥ 0.05).
        </Alert>
      )}
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
    durbin_watson: PropTypes.number,
  }).isRequired,
};

export default React.memo(EnhancedRegressionResults);