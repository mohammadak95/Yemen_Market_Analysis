// src/components/ecm-analysis/SpatialAutocorrelationChart.js

import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import PropTypes from 'prop-types';

const SpatialAutocorrelationChart = ({ spatialData }) => {
  if (!spatialData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No Spatial Autocorrelation data available for this model.</Typography>
      </Box>
    );
  }

  const data = [
    { metric: "Moran's I", value: spatialData.Moran_I },
    { metric: 'P-Value', value: spatialData.p_value },
  ];

  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(4) : 'N/A');

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Autocorrelation
      </Typography>
      <Typography variant="body2" gutterBottom>
        Moran&apos;s I statistic and its p-value indicating spatial dependencies in residuals.
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid />
          <XAxis dataKey="metric" name="Metric" type="category" />
          <YAxis dataKey="value" name="Value" domain={[-1, 1]} />
          <RechartsTooltip
            formatter={(value) => formatNumber(value)}
            labelFormatter={(label) => `${label}`}
          />
          <Scatter name="Spatial Autocorrelation" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          Moran&apos;s I Interpretation:
          <ul>
            <li>Positive Moran&apos;s I indicates clustering.</li>
            <li>Negative Moran&apos;s I indicates dispersion.</li>
            <li>Values close to 0 indicate randomness.</li>
          </ul>
        </Typography>
      </Box>
    </Paper>
  );
};

SpatialAutocorrelationChart.propTypes = {
  spatialData: PropTypes.shape({
    Moran_I: PropTypes.number,
    p_value: PropTypes.number,
  }),
};

export default SpatialAutocorrelationChart;