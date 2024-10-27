// src/component./components/analysis/ecm/ResidualsChart.js

import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Typography, Paper, Box } from '@mui/material';
import PropTypes from 'prop-types';

const ResidualsChart = ({ residuals = [], fittedValues = [], isMobile = false }) => {
  // Enhanced check for valid data
  if (!residuals.length || !fittedValues.length || residuals.length !== fittedValues.length) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="textSecondary">No residuals data available to display the chart.</Typography>
      </Box>
    );
  }

  const data = residuals.map((residual, index) => ({
    fitted: fittedValues[index],
    residual,
  }));

  const interpretResiduals = () => {
    const meanResidual = residuals.reduce((sum, val) => sum + val, 0) / residuals.length;
    const maxResidual = Math.max(...residuals.map(Math.abs));
    const percentageWithinTwoSD = residuals.filter(r => Math.abs(r) <= 2 * Math.sqrt(meanResidual)).length / residuals.length * 100;

    return `
      Residual Analysis:
      - Mean residual: ${meanResidual.toFixed(4)}
      - Maximum absolute residual: ${maxResidual.toFixed(4)}
      - ${percentageWithinTwoSD.toFixed(2)}% of residuals are within 2 standard deviations
      ${Math.abs(meanResidual) < 0.1 ? 'The residuals appear to be centered around zero, which is good.' : 'The residuals show some bias, as they are not centered around zero.'}
      ${percentageWithinTwoSD > 95 ? 'The spread of residuals appears normal.' : 'The spread of residuals may indicate non-normal errors.'}
    `;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Residuals vs Fitted Values
      </Typography>
      <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />
          <XAxis
            dataKey="fitted"
            name="Fitted Values"
            label={{ value: 'Fitted Values', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            dataKey="residual"
            name="Residuals"
            label={{ value: 'Residuals', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Residuals" data={data} fill="#8884d8" />
          <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
        </ScatterChart>
      </ResponsiveContainer>
      <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
        <strong>Interpretation:</strong>
        {interpretResiduals()}
      </Typography>
    </Paper>
  );
};

// Adjusted PropTypes to make `fittedValues` and `residuals` optional
ResidualsChart.propTypes = {
  residuals: PropTypes.arrayOf(PropTypes.number),
  fittedValues: PropTypes.arrayOf(PropTypes.number),
  isMobile: PropTypes.bool,
};

export default ResidualsChart;
