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
} from 'recharts';

const TimeSeriesChart = ({ timeSeriesData }) => {
  const formatMonth = (tickItem) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <LineChart
      width={800}
      height={400}
      data={timeSeriesData}
      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" tickFormatter={formatMonth} />
      <YAxis />
      <ChartTooltip />
      <Legend />
      <Line type="monotone" dataKey="avgUsdPrice" stroke="#8884d8" name="Average USD Price" />
    </LineChart>
  );
};

TimeSeriesChart.propTypes = {
  timeSeriesData: PropTypes.array.isRequired,
};

export default TimeSeriesChart;