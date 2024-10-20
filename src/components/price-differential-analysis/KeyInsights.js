// src/components/price-differential-analysis/KeyInsights.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const KeyInsights = ({ data }) => {
  const generateKeyInsights = () => {
    const insights = [];

    if (data) {
      const { regression_results, diagnostics } = data;

      if (regression_results?.slope != null && regression_results?.p_value != null) {
        const slopeSignificance = regression_results.p_value < 0.05 ? 'statistically significant' : 'not statistically significant';
        insights.push(
          `The time trend coefficient (β) is ${regression_results.slope.toFixed(4)} and is ${slopeSignificance} (p-value: ${regression_results.p_value.toFixed(4)}), indicating ${
            slopeSignificance === 'statistically significant' ? 'a significant trend' : 'no significant trend'
          } in the price differential over time.`
        );
      }

      if (diagnostics?.p_value != null) {
        const stationarity = diagnostics.p_value < 0.05 ? 'stationary' : 'non-stationary';
        insights.push(
          `The price differential series is ${stationarity} (ADF p-value: ${diagnostics.p_value.toFixed(4)}), indicating ${
            stationarity === 'stationary' ? 'temporary' : 'potentially long-lasting'
          } effects of shocks on price differences.`
        );
      }

      if (diagnostics?.conflict_correlation != null) {
        const conflictPattern = diagnostics.conflict_correlation > 0 ? 'similar' : 'opposite';
        insights.push(
          `The conflict correlation between the markets is ${diagnostics.conflict_correlation.toFixed(4)}, suggesting ${conflictPattern} patterns of conflict intensity between the markets.`
        );
      }

      if (regression_results?.r_squared != null) {
        insights.push(
          `The R-squared value of ${regression_results.r_squared.toFixed(4)} indicates that ${(regression_results.r_squared * 100).toFixed(2)}% of the variability in the price differential is explained by the time trend.`
        );
      }

      if (diagnostics?.distance_km != null) {
        insights.push(
          `The markets are approximately ${diagnostics.distance_km.toFixed(2)} km apart, which may influence price differentials due to transportation costs and market integration.`
        );
      }
    }

    return insights;
  };

  const insights = generateKeyInsights();

  if (insights.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Key Insights</Typography>
      <List>
        {insights.map((insight, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary={insight} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

KeyInsights.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      slope: PropTypes.number,
      p_value: PropTypes.number,
      r_squared: PropTypes.number,
    }),
    diagnostics: PropTypes.shape({
      p_value: PropTypes.number,
      conflict_correlation: PropTypes.number,
      distance_km: PropTypes.number,
    }),
  }).isRequired,
};

export default KeyInsights;