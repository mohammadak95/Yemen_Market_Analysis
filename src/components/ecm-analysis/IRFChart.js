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
  ReferenceLine,
} from 'recharts';
import { Typography, Paper, ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import PropTypes from 'prop-types';
import { formatNumber } from '../../utils/formatNumber';

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
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Impulse Response Function
        </Typography>
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
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              label={{ value: 'Period', position: 'insideBottom', offset: -5, fontSize: '1rem' }}
            />
            <YAxis
              label={{ value: 'Response', angle: -90, position: 'insideLeft', fontSize: '1rem' }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip
              formatter={(value, name) => [formatNumber(value), name === 'usdPrice' ? 'USD Price Response' : 'Conflict Intensity Response']}
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
              isAnimationActive={true}
            />
            <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
          No Impulse Response Function data available.
        </Typography>
      )}
      <Typography variant="body2" sx={{ mt: 2, fontSize: '1rem' }}>
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
