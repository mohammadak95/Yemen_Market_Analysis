// src/components/ecm-analysis/GrangerCausalityChart.js

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Typography, Paper, Box } from '@mui/material';
import PropTypes from 'prop-types';

const GrangerCausalityChart = ({ grangerData }) => {
  if (!grangerData || !grangerData.conflict_intensity) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Granger Causality Test Results</Typography>
        <Typography>No Granger causality data available.</Typography>
      </Paper>
    );
  }

  const chartData = Object.entries(grangerData.conflict_intensity).map(([lag, data]) => ({
    lag: parseInt(lag),
    pValue: data.ssr_ftest_pvalue,
    significant: data.ssr_ftest_pvalue < 0.05,
  }));

  const interpretGrangerCausality = () => {
    const significantLags = chartData.filter(d => d.significant).map(d => d.lag);
    
    if (significantLags.length === 0) {
      return "There is no evidence of Granger causality at any lag. This suggests that past values of conflict intensity do not help predict future commodity prices.";
    } else {
      return `Granger causality is significant at lag${significantLags.length > 1 ? 's' : ''} ${significantLags.join(', ')}. This indicates that past values of conflict intensity may help predict future commodity prices at these time horizons.`;
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Granger Causality Test Results
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="lag" label={{ value: 'Lag', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'P-Value', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value) => value.toFixed(4)}
            labelFormatter={(label) => `Lag: ${label}`}
          />
          <Bar dataKey="pValue" fill="#8884d8">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.significant ? '#ff4d4f' : '#8884d8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Interpretation:</strong> {interpretGrangerCausality()}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Note: Bars in red indicate statistically significant Granger causality (p-value &lt; 0.05).
        </Typography>
      </Box>
    </Paper>
  );
};

GrangerCausalityChart.propTypes = {
  grangerData: PropTypes.shape({
    conflict_intensity: PropTypes.objectOf(
      PropTypes.shape({
        ssr_ftest_pvalue: PropTypes.number.isRequired,
      })
    ),
  }),
};

export default GrangerCausalityChart;