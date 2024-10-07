//src/components/ecm-analysis/IRFChart.js

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={3} sx={{ p: 1 }}>
        <Typography variant="body2">Period: {label}</Typography>
        {payload.map((entry, index) => (
          <Typography key={index} variant="body2" color="textSecondary">
            {`${entry.name}: ${entry.value.toFixed(4)}`}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.number,
  })),
  label: PropTypes.number,
};

const IRFChart = ({ irfData }) => {
  const data = useMemo(() => {
    return irfData.irf.map((point, index) => ({
      period: index,
      response: point[0][1],
    }));
  }, [irfData]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Impulse Response Function
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" label={{ value: 'Period', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'Response', angle: -90, position: 'insideLeft' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="response" stroke="#8884d8" name="Price Response to Conflict" />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

IRFChart.propTypes = {
  irfData: PropTypes.shape({
    irf: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))).isRequired,
  }).isRequired,
};

export default IRFChart;