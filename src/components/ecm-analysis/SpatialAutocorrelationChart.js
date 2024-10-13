// src/components/ecm-analysis/SpatialAutocorrelationChart.js

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const SpatialAutocorrelationChart = ({ spatialData }) => {
  const chartData = [
    {
      variable: 'USD Price',
      moranI: spatialData.Variable_1.Moran_I,
      pValue: spatialData.Variable_1.Moran_p_value,
      isSignificant: spatialData.Variable_1.Moran_p_value < 0.05,
    },
    {
      variable: 'Conflict Intensity',
      moranI: spatialData.Variable_2.Moran_I,
      pValue: spatialData.Variable_2.Moran_p_value,
      isSignificant: spatialData.Variable_2.Moran_p_value < 0.05,
    },
  ];

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Autocorrelation (Moran&apos;s I)
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="variable" />
          <YAxis
            yAxisId="left"
            label={{ value: "Moran&apos;s I", angle: -90, position: 'insideLeft', fontSize: '1rem' }}
            tickFormatter={(value) => value.toFixed(4)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'P-Value', angle: 90, position: 'insideRight', fontSize: '1rem' }}
            tickFormatter={(value) => value.toFixed(4)}
          />
          <RechartsTooltip
            formatter={(value, name) => [
              name === "Moran&apos;s I" ? value.toFixed(4) : value.toFixed(4),
              name,
            ]}
            labelFormatter={(label) => `Variable: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar
            yAxisId="left"
            dataKey="moranI"
            fill="#8884d8"
            name="Moran&apos;s I"
            isAnimationActive={true}
          />
          <Bar
            yAxisId="right"
            dataKey="pValue"
            fill="#82ca9d"
            name="P-Value"
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="body2" sx={{ mt: 2 }}>
        <strong>Moran&apos;s I Interpretation:</strong>
        <ul>
          <li>
            <strong>Positive Moran&apos;s I:</strong> Indicates spatial clustering of similar values.
          </li>
          <li>
            <strong>Negative Moran&apos;s I:</strong> Indicates dispersion or spatial randomness.
          </li>
          <li>
            <strong>Significance:</strong> P-Values below 0.05 suggest significant spatial autocorrelation.
          </li>
        </ul>
        Significant Moran&apos;s I values imply that residuals are not randomly distributed across space, indicating potential spatial dependencies in the model.
      </Typography>
    </Paper>
  );
};

SpatialAutocorrelationChart.propTypes = {
  spatialData: PropTypes.shape({
    Variable_1: PropTypes.shape({
      Moran_I: PropTypes.number.isRequired,
      Moran_p_value: PropTypes.number.isRequired,
    }).isRequired,
    Variable_2: PropTypes.shape({
      Moran_I: PropTypes.number.isRequired,
      Moran_p_value: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
};

export default SpatialAutocorrelationChart;