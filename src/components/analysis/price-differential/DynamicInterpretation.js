// src/components/analysis/price-differential/DynamicInterpretation.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Alert,
  Box,
  Grid,
  Chip,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const DynamicInterpretation = ({ data }) => {
  const theme = useTheme();

  const interpretations = useMemo(() => {
    if (!data) return [];

    const results = [];

    // Market Integration
    if (data.cointegration_results) {
      const isIntegrated = data.cointegration_results.p_value < 0.05;
      results.push({
        title: 'Market Integration',
        severity: isIntegrated ? 'success' : 'warning',
        content: isIntegrated 
          ? 'Markets show significant long-term integration'
          : 'Limited evidence of market integration',
        details: [
          `Test statistic: ${data.cointegration_results.test_statistic?.toFixed(4) ?? 'N/A'}`,
          `P-value: ${data.cointegration_results.p_value?.toFixed(4) ?? 'N/A'}`,
          `Integration level: ${isIntegrated ? 'Strong' : 'Weak'}`
        ]
      });
    }

    // Stationarity Results
    if (data.stationarity_results) {
      const adfTest = data.stationarity_results.adf_test;
      const kpssTest = data.stationarity_results.kpss_test;

      const isStationaryADF = adfTest?.p_value < 0.05;
      const isStationaryKPSS = kpssTest?.p_value >= 0.05;

      results.push({
        title: 'ADF Test',
        severity: isStationaryADF ? 'success' : 'warning',
        content: isStationaryADF 
          ? 'Series is stationary according to ADF test'
          : 'Series is not stationary according to ADF test',
        details: [
          `Test statistic: ${adfTest?.test_statistic?.toFixed(4) ?? 'N/A'}`,
          `P-value: ${adfTest?.p_value?.toFixed(4) ?? 'N/A'}`
        ]
      });

      results.push({
        title: 'KPSS Test',
        severity: isStationaryKPSS ? 'success' : 'warning',
        content: isStationaryKPSS 
          ? 'Series is stationary according to KPSS test'
          : 'Series is not stationary according to KPSS test',
        details: [
          `Test statistic: ${kpssTest?.test_statistic?.toFixed(4) ?? 'N/A'}`,
          `P-value: ${kpssTest?.p_value?.toFixed(4) ?? 'N/A'}`
        ]
      });
    }

    return results;
  }, [data]);

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Dynamic Interpretation
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {interpretations.map((interpretation, index) => (
          <Grid item xs={12} key={index}>
            <Alert severity={interpretation.severity}>
              <Typography variant="subtitle1">{interpretation.title}</Typography>
              <Typography variant="body2">{interpretation.content}</Typography>
              <ul>
                {interpretation.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </Alert>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.shape({
    cointegration_results: PropTypes.shape({
      p_value: PropTypes.number,
      test_statistic: PropTypes.number
    }),
    stationarity_results: PropTypes.shape({
      adf_test: PropTypes.shape({
        p_value: PropTypes.number,
        test_statistic: PropTypes.number
      }),
      kpss_test: PropTypes.shape({
        p_value: PropTypes.number,
        test_statistic: PropTypes.number
      })
    })
  })
};

export default DynamicInterpretation;