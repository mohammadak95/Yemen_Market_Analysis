//src/components/analysis/price-differential/DynamicInterpretation.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Alert,
  Box,
  Divider,
  Grid,
  useTheme,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const DynamicInterpretation = ({ data }) => {
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
      mb: 3,
    },
    section: {
      mb: 3,
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      mb: 2,
    },
    interpretationBox: {
      p: 2,
      bgcolor: theme.palette.background.default,
      borderRadius: 1,
      mb: 2,
    },
    alert: {
      mb: 2,
    },
  };

  const interpretations = useMemo(() => {
    const results = [];

    // Regression Interpretation
    if (data.regression_results) {
      results.push({
        type: 'regression',
        title: 'Regression Analysis',
        severity: data.regression_results.p_value < 0.05 ? 'success' : 'warning',
        content: data.regression_results.p_value < 0.05
          ? 'Statistically significant relationship found between price differentials.'
          : 'No significant relationship detected in price differentials.',
        details: `P-value: ${data.regression_results.p_value.toFixed(4)}`,
      });
    }

    // Cointegration Interpretation
    if (data.cointegration_test) {
      results.push({
        type: 'cointegration',
        title: 'Market Integration',
        severity: data.cointegration_test.p_value < 0.05 ? 'success' : 'warning',
        content: data.cointegration_test.p_value < 0.05
          ? 'Markets share a long-term equilibrium relationship.'
          : 'No evidence of long-term market integration.',
        details: `P-value: ${data.cointegration_test.p_value.toFixed(4)}`,
      });
    }

    // Stationarity Interpretation
    if (data.stationarity_test) {
      results.push({
        type: 'stationarity',
        title: 'Price Behavior',
        severity: data.stationarity_test.p_value < 0.05 ? 'success' : 'info',
        content: data.stationarity_test.p_value < 0.05
          ? `${data.stationarity_test.market_name} shows mean-reverting behavior.`
          : `${data.stationarity_test.market_name} shows trending behavior.`,
        details: `P-value: ${data.stationarity_test.p_value.toFixed(4)}`,
      });
    }

    // Conflict Impact
    if (data.diagnostics?.conflict_correlation !== undefined) {
      results.push({
        type: 'conflict',
        title: 'Conflict Impact',
        severity: Math.abs(data.diagnostics.conflict_correlation) > 0.5 ? 'warning' : 'info',
        content: data.diagnostics.conflict_correlation > 0.5
          ? 'Strong impact of conflict on market integration.'
          : 'Limited impact of conflict on market integration.',
        details: `Correlation: ${data.diagnostics.conflict_correlation.toFixed(3)}`,
      });
    }

    return results;
  }, [data]);

  if (!data || interpretations.length === 0) {
    return null;
  }

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Typography variant="h6">
          Dynamic Market Analysis
          <Tooltip title="Comprehensive interpretation of market dynamics">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {interpretations.map((interpretation, index) => (
          <Grid item xs={12} md={6} key={interpretation.type}>
            <Box sx={styles.interpretationBox}>
              <Box sx={styles.sectionTitle}>
                <Typography variant="subtitle1">
                  {interpretation.title}
                </Typography>
                <Chip
                  size="small"
                  color={interpretation.severity}
                  icon={interpretation.severity === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                  label={interpretation.severity.toUpperCase()}
                />
              </Box>
              <Typography variant="body1" gutterBottom>
                {interpretation.content}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {interpretation.details}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Alert severity="info" variant="outlined">
        <Typography variant="body2">
          Note: These interpretations are based on statistical analysis and should be considered alongside market-specific context and conditions.
        </Typography>
      </Alert>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      p_value: PropTypes.number,
    }),
    cointegration_test: PropTypes.shape({
      p_value: PropTypes.number,
    }),
    stationarity_test: PropTypes.shape({
      p_value: PropTypes.number,
      market_name: PropTypes.string,
    }),
    diagnostics: PropTypes.shape({
      conflict_correlation: PropTypes.number,
    }),
  }).isRequired,
};

export default React.memo(DynamicInterpretation);