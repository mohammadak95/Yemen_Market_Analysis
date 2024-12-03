// src/components/analysis/price-differential/InterpretationSection.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper } from '@mui/material';

const InterpretationSection = ({ data, baseMarket, comparisonMarket }) => {
  if (!data) {
    return (
      <Typography variant="body2" color="text.secondary">
        No interpretation data available.
      </Typography>
    );
  }

  const {
    regression_results,
    cointegration_test,
    stationarity_test,
    diagnostics,
  } = data;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Interpretation of Price Differential Analysis Results
      </Typography>

      {/* 1. Key Findings */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          1. Key Findings
        </Typography>
        {/* Regression Analysis */}
        {regression_results && regression_results.beta_distance != null && regression_results.beta_conflict_corr != null && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Regression Analysis
            </Typography>
            <Typography variant="body2" paragraph>
              The regression analysis indicates a relationship between price differentials and factors such as distance and conflict intensity.
            </Typography>
            <Typography variant="body2" paragraph>
              The coefficient for distance (\\( \\beta_1 \\)) is <strong>{Number(regression_results.beta_distance).toFixed(4)}</strong>, suggesting that for every unit increase in distance, the price differential changes by this amount.
            </Typography>
            <Typography variant="body2" paragraph>
              The coefficient for conflict correlation (\\( \\beta_2 \\)) is <strong>{Number(regression_results.beta_conflict_corr).toFixed(4)}</strong>, indicating the impact of conflict correlation on price differentials.
            </Typography>
          </Box>
        )}
        {/* Cointegration Test */}
        {cointegration_test && typeof cointegration_test.p_value === 'number' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Cointegration Test
            </Typography>
            <Typography variant="body2" paragraph>
              The cointegration test results suggest that the markets {cointegration_test.p_value < 0.05 ? 'share' : 'do not share'} a long-term equilibrium relationship.
            </Typography>
          </Box>
        )}
        {/* Stationarity Test */}
        {stationarity_test && typeof stationarity_test.p_value === 'number' && stationarity_test.market_name && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Stationarity Test
            </Typography>
            <Typography variant="body2" paragraph>
              The stationarity test indicates that the price series for {stationarity_test.market_name} is {stationarity_test.p_value < 0.05 ? 'stationary' : 'non-stationary'}.
            </Typography>
          </Box>
        )}
      </Box>

      {/* 2. Market Integration */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          2. Market Integration
        </Typography>
        <Typography variant="body2" paragraph>
          Analysis of price differentials and statistical tests provide insights into the level of integration between {baseMarket} and {comparisonMarket}.
        </Typography>
        {diagnostics && typeof diagnostics.distance_km === 'number' && (
          <Typography variant="body2" paragraph>
            The distance between the markets is <strong>{diagnostics.distance_km.toFixed(1)} km</strong>, which {diagnostics.distance_km > 200 ? 'may contribute to higher' : 'suggests lower'} price differentials due to transportation costs.
          </Typography>
        )}
      </Box>

      {/* 3. Impact of Conflict Intensity */}
      {diagnostics && typeof diagnostics.conflict_correlation === 'number' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            3. Impact of Conflict Intensity
          </Typography>
          <Typography variant="body2" paragraph>
            Conflict intensity plays a role in market dynamics. The conflict correlation between the markets is <strong>{diagnostics.conflict_correlation.toFixed(3)}</strong>, indicating {diagnostics.conflict_correlation > 0.5 ? 'a strong' : 'a weak'} relationship in conflict patterns.
          </Typography>
          <Typography variant="body2" paragraph>
            Higher conflict correlation may lead to synchronized market disruptions, affecting price differentials.
          </Typography>
        </Box>
      )}

      {/* Conclusions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Conclusions
        </Typography>
        <Typography variant="body2" paragraph>
          The analysis reveals that factors such as distance and conflict intensity influence the price differentials between {baseMarket} and {comparisonMarket}. Understanding these factors can inform policy decisions aimed at improving market integration and stability.
        </Typography>
      </Box>
    </Paper>
  );
};

InterpretationSection.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      beta_distance: PropTypes.number,
      beta_conflict_corr: PropTypes.number,
    }),
    cointegration_test: PropTypes.shape({
      p_value: PropTypes.number,
    }),
    stationarity_test: PropTypes.shape({
      p_value: PropTypes.number,
      market_name: PropTypes.string,
    }),
    diagnostics: PropTypes.shape({
      distance_km: PropTypes.number,
      conflict_correlation: PropTypes.number,
    }),
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
};

export default InterpretationSection;
