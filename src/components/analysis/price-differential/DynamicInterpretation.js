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
    chipContainer: {
      display: 'flex',
      gap: 1,
      flexWrap: 'wrap',
      mb: 2,
    },
  };

  const interpretations = useMemo(() => {
    const results = [];

    // Regression Analysis
    if (data.regression_results) {
      const {
        p_value,
        r_squared,
        beta_distance,
        beta_conflict_corr,
      } = data.regression_results;

      results.push({
        type: 'regression',
        title: 'Regression Analysis',
        severity: p_value < 0.05 && r_squared > 0.7 ? 'success' : 'warning',
        content: p_value < 0.05
          ? `Strong statistical relationship found (R² = ${(r_squared * 100).toFixed(1)}%)`
          : 'No significant statistical relationship detected.',
        details: [
          `Model fit: ${r_squared > 0.7 ? 'Strong' : r_squared > 0.5 ? 'Moderate' : 'Weak'}`,
          `Distance effect: ${Math.abs(beta_distance || 0).toFixed(4)}`,
          `Conflict effect: ${Math.abs(beta_conflict_corr || 0).toFixed(4)}`,
        ],
      });
    }

    // Cointegration Analysis
    const cointegrationResults = data.cointegration_results || data.cointegration_test;
    if (cointegrationResults) {
      const { p_value, test_statistic } = cointegrationResults;
      results.push({
        type: 'cointegration',
        title: 'Market Integration',
        severity: p_value < 0.05 ? 'success' : 'warning',
        content: p_value < 0.05
          ? 'Strong evidence of long-term market integration'
          : 'Limited evidence of market integration',
        details: [
          `Test statistic: ${test_statistic.toFixed(4)}`,
          `P-value: ${p_value.toFixed(4)}`,
          `Interpretation: ${p_value < 0.01 ? 'Very strong' : p_value < 0.05 ? 'Strong' : 'Weak'} evidence`,
        ],
      });
    }

    // Stationarity Analysis
    const stationarityResults = data.stationarity_results || data.stationarity_test;
    if (stationarityResults) {
      const adfTest = stationarityResults.adf_test || stationarityResults;
      const kpssTest = stationarityResults.kpss_test;

      const isStationaryADF = adfTest.p_value < 0.05;
      const isStationaryKPSS = kpssTest ? kpssTest.p_value >= 0.05 : null;
      const overallStationarity = kpssTest
        ? isStationaryADF && isStationaryKPSS
        : isStationaryADF;

      results.push({
        type: 'stationarity',
        title: 'Price Behavior',
        severity: overallStationarity ? 'success' : 'warning',
        content: overallStationarity
          ? 'Price differential series shows stable behavior'
          : 'Price differential series shows unstable behavior',
        details: [
          `ADF test: ${isStationaryADF ? 'Stationary' : 'Non-stationary'} (p=${adfTest.p_value.toFixed(4)})`,
          ...(kpssTest ? [`KPSS test: ${isStationaryKPSS ? 'Stationary' : 'Non-stationary'} (p=${kpssTest.p_value.toFixed(4)})`] : []),
          `Overall: ${overallStationarity ? 'Strong' : 'Weak'} evidence of stationarity`,
        ],
      });
    }

    // Market Conditions
    if (data.diagnostics) {
      const { conflict_correlation, distance_km } = data.diagnostics;
      const actualDistance = distance_km * 250;

      results.push({
        type: 'conditions',
        title: 'Market Conditions',
        severity: conflict_correlation > 0.5 || actualDistance > 500 ? 'warning' : 'info',
        content: `Market conditions ${conflict_correlation > 0.5 || actualDistance > 500 ? 'may hinder' : 'support'} integration`,
        details: [
          `Distance: ${actualDistance.toFixed(1)} km (${actualDistance > 500 ? 'High' : actualDistance > 300 ? 'Moderate' : 'Low'} impact)`,
          `Conflict correlation: ${conflict_correlation.toFixed(3)} (${conflict_correlation > 0.7 ? 'High' : conflict_correlation > 0.4 ? 'Moderate' : 'Low'} impact)`,
        ],
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
          <Tooltip title="Comprehensive interpretation of market dynamics and relationships">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {interpretations.map((interpretation) => (
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
              <Box sx={styles.chipContainer}>
                {interpretation.details.map((detail, index) => (
                  <Chip
                    key={index}
                    size="small"
                    variant="outlined"
                    label={detail}
                  />
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Alert severity="info" variant="outlined">
        <Typography variant="body2">
          This analysis combines multiple statistical tests and market conditions to provide a comprehensive view of market relationships. 
          Interpretations should be considered alongside local market context and temporal factors.
        </Typography>
      </Alert>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      p_value: PropTypes.number,
      r_squared: PropTypes.number,
      beta_distance: PropTypes.number,
      beta_conflict_corr: PropTypes.number,
    }),
    cointegration_results: PropTypes.shape({
      test_statistic: PropTypes.number,
      p_value: PropTypes.number,
    }),
    cointegration_test: PropTypes.shape({
      test_statistic: PropTypes.number,
      p_value: PropTypes.number,
    }),
    stationarity_results: PropTypes.shape({
      adf_test: PropTypes.shape({
        test_statistic: PropTypes.number,
        p_value: PropTypes.number,
      }),
      kpss_test: PropTypes.shape({
        test_statistic: PropTypes.number,
        p_value: PropTypes.number,
      }),
    }),
    stationarity_test: PropTypes.shape({
      test_statistic: PropTypes.number,
      p_value: PropTypes.number,
    }),
    diagnostics: PropTypes.shape({
      conflict_correlation: PropTypes.number,
      distance_km: PropTypes.number,
    }),
  }).isRequired,
};

export default React.memo(DynamicInterpretation);
