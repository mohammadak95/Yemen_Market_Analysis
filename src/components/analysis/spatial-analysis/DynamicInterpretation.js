// src/components/analysis/spatial-analysis/DynamicInterpretation.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Box } from '@mui/material';

const DynamicInterpretation = ({ preprocessedData, selectedRegion, selectedCommodity }) => {
  const { analysisMetrics, timeSeriesData, detectedShocks } = preprocessedData;

  const integrationLevel = analysisMetrics?.integrationLevel || 0;
  const priceTrend = calculatePriceTrend(timeSeriesData);
  const shocks = detectedShocks?.length || 0;

  const recommendations = generatePolicyRecommendations(integrationLevel, priceTrend, shocks);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Analytical Insights
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Market Integration Level</Typography>
        <Typography variant="body2">
          The market integration level is {integrationLevel.toFixed(2)}. This suggests that the
          markets are{' '}
          {integrationLevel > 0.7 ? 'highly integrated' : 'moderately integrated'}.
        </Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Price Trend Analysis</Typography>
        <Typography variant="body2">
          The price trend over the selected period shows a{' '}
          {priceTrend > 0 ? 'rising' : 'declining'} trend, with an overall change of{' '}
          {priceTrend.toFixed(2)}%.
        </Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Shock Detection</Typography>
        <Typography variant="body2">
          A total of {shocks} significant market shocks were detected during the selected period.
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle1">Policy Recommendations</Typography>
        {recommendations.map((rec, index) => (
          <Typography key={index} variant="body2" sx={{ mb: 1 }}>
            - {rec}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  preprocessedData: PropTypes.shape({
    analysisMetrics: PropTypes.object,
    timeSeriesData: PropTypes.array,
    detectedShocks: PropTypes.array,
  }),
  selectedRegion: PropTypes.string,
  selectedCommodity: PropTypes.string,
};

export default React.memo(DynamicInterpretation);

// Helper functions
const calculatePriceTrend = (data) => {
  if (!data || data.length === 0) return 0;
  const startPrice = data[0].avgUsdPrice;
  const endPrice = data[data.length - 1].avgUsdPrice;
  return ((endPrice - startPrice) / startPrice) * 100;
};

const generatePolicyRecommendations = (integrationLevel, priceTrend, shocks) => {
  const recommendations = [];

  if (integrationLevel < 0.5) {
    recommendations.push('Consider policies to enhance market connectivity and reduce trade barriers.');
  }

  if (priceTrend > 5) {
    recommendations.push('Monitor inflationary pressures and consider monetary policy adjustments.');
  }

  if (shocks > 3) {
    recommendations.push('Implement measures to improve market resilience against shocks.');
  }

  return recommendations;
};