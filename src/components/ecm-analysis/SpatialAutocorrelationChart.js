// src/components/ecm-analysis/SpatialAutocorrelationChart.js

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

const SpatialAutocorrelationChart = ({ spatialData }) => {
  const chartData = [
    { variable: 'USD Price', moranI: spatialData.Variable_1.Moran_I, pValue: spatialData.Variable_1.Moran_p_value },
    { variable: 'Conflict Intensity', moranI: spatialData.Variable_2.Moran_I, pValue: spatialData.Variable_2.Moran_p_value },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Autocorrelation (Moran&apos;s I)
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="variable" />
          <YAxis yAxisId="left" label={{ value: "Moran's I", angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'P-Value', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="moranI" fill="#8884d8" name="Moran's I" />
          <Bar yAxisId="right" dataKey="pValue" fill="#82ca9d" name="P-Value" />
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Note: Moran&apos;s I values range from -1 (perfect dispersion) to +1 (perfect correlation). 
        Values near 0 indicate a random spatial pattern.
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