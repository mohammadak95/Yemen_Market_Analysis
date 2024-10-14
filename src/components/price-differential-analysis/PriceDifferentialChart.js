// src/components/price-differential-analysis/PriceDifferentialChart.js

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

  const { dates, values } = data.price_differential;

  const chartData = dates.map((dateStr, index) => ({
    date: new Date(dateStr),
    differential: Number(values[index].toFixed(4)),
  }));

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Price Differential Over Time
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(tick) => tick.toLocaleDateString()}
            label={{ value: 'Date', position: 'insideBottom', offset: -5, fontSize: '1rem' }}
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
            labelFormatter={(label) => `Date: ${label.toLocaleDateString()}`}
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
        This chart displays the price differential between {data.base_market} and {data.other_market} for {data.commodity} over time. Positive values indicate higher prices in {data.base_market} compared to {data.other_market}, while negative values indicate lower prices.
      </Typography>
    </Paper>
  );
};

PriceDifferentialChart.propTypes = {
  data: PropTypes.shape({
    base_market: PropTypes.string,
    other_market: PropTypes.string,
    commodity: PropTypes.string,
    price_differential: PropTypes.shape({
      dates: PropTypes.arrayOf(PropTypes.string),
      values: PropTypes.arrayOf(PropTypes.number),
    }),
  }),
};

export default PriceDifferentialChart;
