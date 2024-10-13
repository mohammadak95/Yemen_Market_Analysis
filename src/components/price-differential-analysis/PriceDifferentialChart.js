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
  ReferenceLine,
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
    period: index,
    differential: Number(value.toFixed(4)),
  }));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Price Differential Over Time
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            label={{ value: 'Time Period', position: 'insideBottom', offset: -5, fontSize: '1rem' }}
          />
          <YAxis
            label={{
              value: 'Price Differential',
              angle: -90,
              position: 'insideLeft',
              fontSize: '1rem',
            }}
            tickFormatter={(value) => value.toFixed(2)}
          />
          <RechartsTooltip
            formatter={(value) => value.toFixed(4)}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="differential"
            stroke="#8884d8"
            name="Price Differential"
            dot={false}
            isAnimationActive={true}
          />
          <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>
      <Typography variant="body2" sx={{ mt: 2 }}>
        This chart displays the price differential between the selected markets over time. A positive value indicates higher prices in the base market compared to the comparison market, while a negative value indicates lower prices.
      </Typography>
    </Paper>
  );
};

PriceDifferentialChart.propTypes = {
  data: PropTypes.shape({
    price_differential: PropTypes.arrayOf(PropTypes.number),
  }),
};

export default PriceDifferentialChart;