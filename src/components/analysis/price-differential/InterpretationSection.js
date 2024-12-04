// src/components/analysis/price-differential/InterpretationSection.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper, Alert } from '@mui/material';

const InterpretationSection = ({ data, baseMarket, comparisonMarket }) => {
  if (!data) {
    return (
      <Alert severity="info">
        No data available for interpretation.
      </Alert>
    );
  }

  const { regression_results, cointegration_results, stationarity_results, diagnostics } = data;

  const getStationarityInterpretation = () => {
    if (!stationarity_results) return null;

    const isStationaryADF = stationarity_results.ADF['p-value'] < 0.05;
    const isStationaryKPSS = stationarity_results.KPSS
      ? stationarity_results.KPSS['p-value'] >= 0.05
      : null;

    if (isStationaryADF && isStationaryKPSS !== null && isStationaryKPSS) {
      return 'Both ADF and KPSS tests confirm that the price differential series is stationary, indicating stable price relationships.';
    } else if (!isStationaryADF && isStationaryKPSS !== null && !isStationaryKPSS) {
      return 'Both tests indicate non-stationarity, suggesting persistent trends or unit roots in the price differential.';
    } else {
      return 'Mixed results from the stationarity tests suggest potential complexities in the price behavior.';
    }
  };

  const getCointegrationInterpretation = () => {
    if (!cointegration_results) return null;

    const pValue = cointegration_results.p_value;

    if (pValue < 0.01) {
      return 'There is very strong evidence of cointegration between the markets, indicating a robust long-term price relationship.';
    } else if (pValue < 0.05) {
      return 'There is significant evidence of cointegration, suggesting the markets share a long-term equilibrium relationship.';
    } else {
      return 'There is no significant evidence of cointegration, indicating the markets may operate independently.';
    }
  };

  const getRegressionInterpretation = () => {
    if (!regression_results) return null;

    const { slope, p_value, r_squared } = regression_results;
    const trendDirection = slope > 0 ? 'increasing' : 'decreasing';
    const significance = p_value < 0.05 ? 'significant' : 'not significant';
    const fitQuality = r_squared > 0.7 ? 'strong' : r_squared > 0.5 ? 'moderate' : 'weak';

    return `The regression analysis indicates a ${trendDirection} trend in the price differential over time with a ${significance} slope. The model has a ${fitQuality} fit (R² = ${(r_squared * 100).toFixed(1)}%).`;
  };

  const getDiagnosticsInterpretation = () => {
    if (!diagnostics) return null;

    const { conflict_correlation, distance_km } = diagnostics;

    const conflictImpact = conflict_correlation > 0.5 ? 'high' : conflict_correlation > 0.3 ? 'moderate' : 'low';
    const distanceImpact = distance_km > 500 ? 'high' : distance_km > 300 ? 'moderate' : 'low';

    return `The conflict intensity correlation between the markets is ${conflict_correlation.toFixed(2)}, indicating a ${conflictImpact} impact of conflict on market relationships. The distance between the markets is ${distance_km.toFixed(2)} km, resulting in a ${distanceImpact} impact on market integration.`;
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Interpretation of Analysis Results
      </Typography>

      {/* 1. Key Findings */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          1. Key Findings
        </Typography>

        {/* Stationarity Interpretation */}
        {getStationarityInterpretation() && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Stationarity Analysis
            </Typography>
            <Typography variant="body2">{getStationarityInterpretation()}</Typography>
          </Box>
        )}

        {/* Cointegration Interpretation */}
        {getCointegrationInterpretation() && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Cointegration Analysis
            </Typography>
            <Typography variant="body2">{getCointegrationInterpretation()}</Typography>
          </Box>
        )}

        {/* Regression Interpretation */}
        {getRegressionInterpretation() && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Regression Analysis
            </Typography>
            <Typography variant="body2">{getRegressionInterpretation()}</Typography>
          </Box>
        )}

        {/* Diagnostics Interpretation */}
        {getDiagnosticsInterpretation() && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Diagnostics
            </Typography>
            <Typography variant="body2">{getDiagnosticsInterpretation()}</Typography>
          </Box>
        )}
      </Box>

      {/* Additional Insights */}
      {/* You can add more sections here if needed */}
    </Paper>
  );
};

InterpretationSection.propTypes = {
  data: PropTypes.object.isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
};

export default React.memo(InterpretationSection);