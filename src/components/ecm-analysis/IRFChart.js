// src/components/ecm-analysis/IRFChart.js

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Typography, Paper, ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import PropTypes from 'prop-types';

const IRFChart = ({ irfData }) => {
  const [selectedVariable, setSelectedVariable] = useState('usd_price');

  const handleVariableChange = (event, newVariable) => {
    if (newVariable !== null) {
      setSelectedVariable(newVariable);
    }
  };

  // Transform irfData into chartData
  const chartData = irfData.map((point, index) => ({
    period: index,
    usd_price: point[0][0],
    conflict_intensity: point[1][0],
  }));

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Impulse Response Function (IRF)
        </Typography>
        <ToggleButtonGroup
          value={selectedVariable}
          exclusive
          onChange={handleVariableChange}
          aria-label="selected variable"
        >
          <ToggleButton value="usd_price" aria-label="USD Price">
            USD Price
          </ToggleButton>
          <ToggleButton value="conflict_intensity" aria-label="Conflict Intensity">
            Conflict Intensity
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              label={{ value: 'Period', position: 'insideBottom', offset: -5, fontSize: '1rem' }}
            />
            <YAxis
              label={{ value: 'Response', angle: -90, position: 'insideLeft', fontSize: '1rem' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <RechartsTooltip
              formatter={(value, name) => [
                value.toFixed(4),
                name === 'usd_price' ? 'USD Price Response' : 'Conflict Intensity Response',
              ]}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={selectedVariable}
              stroke="#8884d8"
              name={selectedVariable === 'usd_price' ? 'USD Price Response' : 'Conflict Intensity Response'}
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
      <Typography variant="body2" sx={{ mt: 2 }}>
        This chart shows how {selectedVariable === 'usd_price' ? 'USD Price' : 'Conflict Intensity'} responds to a shock over time. A positive value indicates an increase in response to the shock, while a negative value indicates a decrease.
      </Typography>
    </Paper>
  );
};

IRFChart.propTypes = {
  irfData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))).isRequired,
};

export default IRFChart;