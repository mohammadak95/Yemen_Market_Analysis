// src/components/analysis/price-differential/DynamicInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Alert,
  Box,
} from '@mui/material';

const DynamicInterpretation = ({ data }) => {
  if (!data) {
    return null;
  }

  const {
    regression_results,
    cointegration_test,
    stationarity_test,
    diagnostics,
  } = data;

  const interpretations = [];

  // Regression Interpretation
  if (regression_results) {
    if (regression_results.p_value < 0.05) {
      interpretations.push(
        'The regression analysis indicates a statistically significant relationship between the price differentials over time.'
      );
    } else {
      interpretations.push(
        'The regression analysis does not show a statistically significant relationship between the price differentials over time.'
      );
    }
  }

  // Cointegration Interpretation
  if (cointegration_test) {
    if (cointegration_test.p_value < 0.05) {
      interpretations.push(
        'The cointegration test suggests that the two markets share a long-term equilibrium relationship.'
      );
    } else {
      interpretations.push(
        'The cointegration test does not find evidence of a long-term equilibrium relationship between the markets.'
      );
    }
  }

  // Stationarity Interpretation
  if (stationarity_test) {
    if (stationarity_test.p_value < 0.05) {
      interpretations.push(
        `The price series for ${stationarity_test.market_name} is stationary, implying mean-reverting behavior.`
      );
    } else {
      interpretations.push(
        `The price series for ${stationarity_test.market_name} is non-stationary, indicating potential trends or unit roots.`
      );
    }
  }

  // Diagnostics Interpretation
  if (diagnostics && diagnostics.conflict_correlation !== undefined) {
    if (diagnostics.conflict_correlation > 0.5) {
      interpretations.push(
        'High conflict correlation suggests that conflict intensity may be impacting price integration between the markets.'
      );
    } else {
      interpretations.push(
        'Low conflict correlation indicates that conflict intensity may not be a significant factor in price integration between the markets.'
      );
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Interpretation
      </Typography>
      {interpretations.map((text, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Typography variant="body1">{text}</Typography>
        </Box>
      ))}
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.object,
    cointegration_test: PropTypes.object,
    stationarity_test: PropTypes.object,
    diagnostics: PropTypes.object,
  }).isRequired,
};

export default DynamicInterpretation;
