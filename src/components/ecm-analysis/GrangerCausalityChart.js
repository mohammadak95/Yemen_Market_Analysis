// src/components/ecm-analysis/GrangerCausalityChart.js

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const GrangerCausalityChart = ({ grangerData }) => {
  const chartData = Object.entries(grangerData).map(([lag, data]) => ({
    lag: parseInt(lag),
    pValue: data.ssr_ftest_pvalue,
  }));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Granger Causality Test Results
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="lag" label={{ value: 'Lag', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'P-Value', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="pValue" fill="#8884d8" name="P-Value" />
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Note: Lower p-values indicate stronger evidence for Granger causality.
      </Typography>
    </Paper>
  );
};

GrangerCausalityChart.propTypes = {
  grangerData: PropTypes.object.isRequired,
};

export default GrangerCausalityChart;