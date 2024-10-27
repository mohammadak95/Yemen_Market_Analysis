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
import { Typography, Paper, Box } from '@mui/material';
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

  const interpretMoransI = (variable, moranI, pValue) => {
    const significance = pValue < 0.05 ? 'significant' : 'not significant';
    const pattern = moranI > 0 ? 'clustering' : 'dispersion';
    return `${variable}: Moran's I is ${moranI.toFixed(4)} (p-value: ${pValue.toFixed(4)}), which is statistically ${significance}. This suggests ${pattern} of similar values across space.`;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Autocorrelation (Moran&apos;s I)
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="variable" />
          <YAxis yAxisId="left" label={{ value: "Moran's I", angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'P-Value', angle: 90, position: 'insideRight' }} />
          <RechartsTooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="moranI" fill="#8884d8" name="Moran's I" />
          <Bar yAxisId="right" dataKey="pValue" fill="#82ca9d" name="P-Value" />
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" paragraph>
          <strong>Interpretation:</strong>
        </Typography>
        {chartData.map((data) => (
          <Typography key={data.variable} variant="body2" paragraph>
            {interpretMoransI(data.variable, data.moranI, data.pValue)}
          </Typography>
        ))}
        <Typography variant="body2">
          Significant Moran&apos;s I values imply that residuals are not randomly distributed across space, indicating potential spatial dependencies in the model.
        </Typography>
      </Box>
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