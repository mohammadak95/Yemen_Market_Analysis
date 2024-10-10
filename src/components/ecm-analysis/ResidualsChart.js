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
  Line,
  ReferenceLine,
} from 'recharts';
import { Typography, Paper, Box, Tooltip as MuiTooltip } from '@mui/material';
import PropTypes from 'prop-types';
import { formatNumber } from '../../utils/formatNumber';

const ResidualsChart = ({ residuals, fittedValues }) => {
  if (
    !residuals ||
    !fittedValues ||
    residuals.length === 0 ||
    fittedValues.length === 0 ||
    residuals.length !== fittedValues.length
  ) {
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

  // Calculate trend line (simple linear regression)
  const calculateTrendLine = (data) => {
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.fitted, 0);
    const sumY = data.reduce((sum, d) => sum + d.residual, 0);
    const sumXY = data.reduce((sum, d) => sum + d.fitted * d.residual, 0);
    const sumX2 = data.reduce((sum, d) => sum + d.fitted * d.fitted, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return data.map((d) => ({ fitted: d.fitted, trend: 0 }));

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return data.map((d) => ({
      fitted: d.fitted,
      trend: slope * d.fitted + intercept,
    }));
  };

  const trendData = calculateTrendLine(data);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Residuals vs Fitted Values
      </Typography>
      <Typography variant="body2" gutterBottom>
        Scatter plot of residuals against fitted values to assess model fit.
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid />
          <XAxis
            dataKey="fitted"
            name="Fitted Values"
            label={
              <MuiTooltip title="Predicted values from the model" arrow>
                <text x="0" y="0" dy={16} dx={250} textAnchor="middle">
                  Fitted Values
                </text>
              </MuiTooltip>
            }
            tickFormatter={(value) => formatNumber(value)}
          />
          <YAxis
            dataKey="residual"
            name="Residuals"
            label={
              <MuiTooltip title="Difference between observed and predicted values" arrow>
                <text x="0" y="0" dx={-30} dy={200} textAnchor="middle" transform="rotate(-90)">
                  Residuals
                </text>
              </MuiTooltip>
            }
            tickFormatter={(value) => formatNumber(value)}
          />
          <RechartsTooltip
            formatter={(value, name) => [
              formatNumber(value),
              name === 'residual' ? 'Residual' : name,
            ]}
            labelFormatter={(label) => `Fitted Value: ${formatNumber(label)}`}
          />
          <Scatter name="Residuals" data={data} fill="#8884d8" />
          <Line
            type="linear"
            dataKey="trend"
            data={trendData}
            stroke="#ff7300"
            dot={false}
            name="Trend Line"
          />
          <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
        </ScatterChart>
      </ResponsiveContainer>
      <Typography variant="body2" sx={{ mt: 2 }}>
        This scatter plot helps in identifying any systematic patterns in the residuals. A random scatter around the trend line indicates a good model fit. Patterns or trends may suggest model misspecification.
      </Typography>
    </Paper>
  );
};

ResidualsChart.propTypes = {
  residuals: PropTypes.arrayOf(PropTypes.number),
  fittedValues: PropTypes.arrayOf(PropTypes.number),
};

export default ResidualsChart;