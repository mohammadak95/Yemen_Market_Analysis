// src/components/analysis/spatial-analysis/TimeSeriesChart.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const TimeSeriesChart = ({ timeSeriesData }) => {
  const formatMonth = (tickItem) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={timeSeriesData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={formatMonth} />
        <YAxis />
        <ChartTooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="usdprice"
          stroke="#8884d8"
          name="Average USD Price"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

TimeSeriesChart.propTypes = {
  timeSeriesData: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      usdprice: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default TimeSeriesChart;