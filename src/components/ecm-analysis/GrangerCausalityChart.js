// src/components/ecm-analysis/GrangerCausalityChart.js

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell, // Added import
} from 'recharts';
import { Typography, Paper, Box } from '@mui/material';
import PropTypes from 'prop-types';

const GrangerCausalityChart = ({ grangerData }) => {
  if (!grangerData || Object.keys(grangerData).length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No Granger causality data available for this model.</Typography>
      </Box>
    );
  }

  // Assuming grangerData has the structure: { variable: { lag: { pvalues... } } }
  // For simplicity, we'll visualize ssr_ftest_pvalue for each lag
  const data = useMemo(() => {
    const variable = Object.keys(grangerData)[0]; // Assuming one independent variable
    const lags = Object.keys(grangerData[variable]).map((lag) => ({
      lag: lag,
      pvalue: grangerData[variable][lag].ssr_ftest_pvalue,
    }));
    return lags;
  }, [grangerData]);

  const significanceThreshold = 0.05;

  const formatPValue = (p) => p.toFixed(4);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Granger Causality Tests
      </Typography>
      <Typography variant="body2" gutterBottom>
        P-values of the SSR F-test for Granger causality across different lags.
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="lag">
            <text
              x="50%"
              y="100%"
              dy={16}
              textAnchor="middle"
              fill="#666"
              fontSize={12}
            >
              Lag
            </text>
          </XAxis>
          <YAxis domain={[0, 1]}>
            <text
              transform="rotate(-90)"
              y={15}
              x={-200}
              dy="-5.1em"
              textAnchor="middle"
              fill="#666"
              fontSize={12}
            >
              P-Value
            </text>
          </YAxis>
          <RechartsTooltip
            formatter={(value) => formatPValue(value)}
            labelFormatter={(label) => `Lag: ${label}`}
          />
          <Bar
            dataKey="pvalue"
            fill="#82ca9d"
            name="SSR F-test P-Value"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.pvalue < significanceThreshold ? '#ff4d4f' : '#82ca9d'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          <Box
            component="span"
            sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: '#ff4d4f', mr: 1 }}
          />
          P-Value &lt; {significanceThreshold} (Significant)
        </Typography>
        <Typography variant="body2">
          <Box
            component="span"
            sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: '#82ca9d', mr: 1 }}
          />
          P-Value ≥ {significanceThreshold} (Not Significant)
        </Typography>
      </Box>
    </Paper>
  );
};

GrangerCausalityChart.propTypes = {
  grangerData: PropTypes.object.isRequired,
};

export default GrangerCausalityChart;