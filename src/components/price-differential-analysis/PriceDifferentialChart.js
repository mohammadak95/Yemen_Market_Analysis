// src/components/price-differential/PriceDifferentialChart.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Typography, Paper } from '@mui/material';

const PriceDifferentialChart = ({ data }) => {
  if (!data || !data.price_differential) {
    return (
      <Typography variant="body1">
        No price differential data available for this market pair.
      </Typography>
    );
  }

  const chartData = data.price_differential.map((value, index) => ({
    index,
    differential: Number(value.toFixed(4)),
  }));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Price Differential Chart
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="index"
            label={{ value: 'Time Period', position: 'insideBottom', dy: 10 }}
          />
          <YAxis
            label={{ value: 'Price Differential', angle: -90, position: 'insideLeft' }}
          />
          <RechartsTooltip
            formatter={(value) => value.toFixed(4)}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Legend />
          <Line type="monotone" dataKey="differential" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

PriceDifferentialChart.propTypes = {
  data: PropTypes.shape({
    price_differential: PropTypes.arrayOf(PropTypes.number),
  }),
};

export default PriceDifferentialChart;