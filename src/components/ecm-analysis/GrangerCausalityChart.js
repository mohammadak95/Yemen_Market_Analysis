// src/components/ecm-analysis/GrangerCausalityChart.js

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const GrangerCausalityChart = ({ grangerData }) => {
  // Prepare the chart data
  const chartData = [];

  // Iterate over each variable in grangerData
  for (const [dependentVar, lagsData] of Object.entries(grangerData)) {
    for (const [lag, testResult] of Object.entries(lagsData)) {
      chartData.push({
        variable: dependentVar,
        lag: parseInt(lag),
        pValue: testResult.ssr_ftest_pvalue,
        significant: testResult.ssr_ftest_pvalue < 0.05,
      });
    }
  }

  // Sort the data by variable and lag
  chartData.sort((a, b) => {
    if (a.variable === b.variable) {
      return a.lag - b.lag;
    }
    return a.variable.localeCompare(b.variable);
  });

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Granger Causality Test Results
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="lag"
            label={{ value: 'Lag', position: 'insideBottom', offset: -5, fontSize: '1rem' }}
          />
          <YAxis
            domain={[0, 1]}
            label={{ value: 'P-Value', angle: -90, position: 'insideLeft', fontSize: '1rem' }}
            tickFormatter={(value) => value.toFixed(2)}
          />
          <RechartsTooltip
            formatter={(value, name) => [
              value.toFixed(4),
              name === 'pValue' ? 'P-Value' : name,
            ]}
            labelFormatter={(label) => `Lag: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="pValue" name="P-Value">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.significant ? '#ff4d4f' : '#82ca9d'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="body2" sx={{ mt: 2 }}>
        * Bars highlighted in red indicate significant Granger causality at the 5% significance level.
        Significant results suggest that past values of the influencing factors can predict future values of the dependent variable.
      </Typography>
    </Paper>
  );
};

GrangerCausalityChart.propTypes = {
  grangerData: PropTypes.object.isRequired,
};

export default GrangerCausalityChart;