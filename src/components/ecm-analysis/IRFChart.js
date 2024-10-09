// src/components/ecm-analysis/IRFChart.js

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Typography, Paper, ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import PropTypes from 'prop-types';

const IRFChart = ({ irfData }) => {
  const [selectedVariable, setSelectedVariable] = useState('usdPrice');

  const handleVariableChange = (event, newVariable) => {
    if (newVariable !== null) {
      setSelectedVariable(newVariable);
    }
  };

  // Ensure irfData is an array before mapping
  const chartData = Array.isArray(irfData)
    ? irfData.map((point, index) => ({
        period: index,
        usdPrice: point[0][0],
        conflictIntensity: point[1][0],
      }))
    : [];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Impulse Response Function
      </Typography>
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={selectedVariable}
          exclusive
          onChange={handleVariableChange}
          aria-label="selected variable"
        >
          <ToggleButton value="usdPrice" aria-label="USD Price">
            USD Price
          </ToggleButton>
          <ToggleButton value="conflictIntensity" aria-label="Conflict Intensity">
            Conflict Intensity
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="period" 
              label={{ value: 'Period', position: 'insideBottom', offset: -5 }} 
            />
            <YAxis 
              label={{ value: 'Response', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip 
              formatter={(value) => [value.toFixed(4), selectedVariable === 'usdPrice' ? 'USD Price Response' : 'Conflict Intensity Response']}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={selectedVariable} 
              stroke="#8884d8" 
              name={selectedVariable === 'usdPrice' ? 'USD Price Response' : 'Conflict Intensity Response'} 
              dot={{ r: 3 }} 
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No Impulse Response Function data available.
        </Typography>
      )}
      <Typography variant="body2" sx={{ mt: 2 }}>
        This chart shows how {selectedVariable === 'usdPrice' ? 'USD Price' : 'Conflict Intensity'} responds to a shock over time. 
        A positive value indicates an increase in response to the shock, while a negative value indicates a decrease.
      </Typography>
    </Paper>
  );
};

IRFChart.propTypes = {
  irfData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))).isRequired,
};

export default IRFChart;
