//src/components/ecm-analysis/ResidualsChart.js

import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const ResidualsChart = ({ residuals, fittedValues }) => {
  const data = residuals.map((residual, index) => ({
    fitted: fittedValues[index],
    residual,
  }));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Residuals vs Fitted Values
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid />
          <XAxis dataKey="fitted" name="Fitted Values" />
          <YAxis dataKey="residual" name="Residuals" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Residuals" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </Paper>
  );
};

ResidualsChart.propTypes = {
  residuals: PropTypes.arrayOf(PropTypes.number).isRequired,
  fittedValues: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default ResidualsChart;