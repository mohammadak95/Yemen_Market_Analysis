// src/components/ecm-analysis/ResidualsChart.js

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Typography, Paper, Box, Tooltip } from '@mui/material';
import PropTypes from 'prop-types';

const ResidualsChart = ({ residuals, fittedValues }) => {
  if (!residuals || !fittedValues || residuals.length === 0 || fittedValues.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No residuals data available to display the chart.</Typography>
      </Box>
    );
  }

  const data = residuals.map((residual, index) => ({
    fitted: fittedValues[index],
    residual,
  }));

  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(2) : 'N/A');

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Residuals vs Fitted Values
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid />
          <XAxis
            dataKey="fitted"
            name="Fitted Values"
            label={
              <Tooltip title="Predicted values from the model">
                <text x="0" y="0" dy={16} dx={250} textAnchor="middle">
                  Fitted Values
                </text>
              </Tooltip>
            }
          />
          <YAxis
            dataKey="residual"
            name="Residuals"
            label={
              <Tooltip title="Difference between observed and predicted values">
                <text x="0" y="0" dx={-30} dy={200} textAnchor="middle" transform="rotate(-90)">
                  Residuals
                </text>
              </Tooltip>
            }
          />
          <RechartsTooltip
            formatter={(value) => formatNumber(value)}
            labelFormatter={(label) => `Fitted Value: ${formatNumber(label)}`}
          />
          <Scatter name="Residuals" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </Paper>
  );
};

ResidualsChart.propTypes = {
  residuals: PropTypes.arrayOf(PropTypes.number),
  fittedValues: PropTypes.arrayOf(PropTypes.number),
};

export default ResidualsChart;
