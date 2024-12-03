// src/components/analysis/ecm/IRFChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area
} from 'recharts';
import { useTheme, Typography } from '@mui/material';

const IRFChart = ({ data, confidenceIntervals }) => {
  const theme = useTheme();

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((value, period) => ({
      period: period + 1, // Assuming period starts at 1
      response: value,
      upper: confidenceIntervals?.upper?.[period],
      lower: confidenceIntervals?.lower?.[period]
    }));
  }, [data, confidenceIntervals]);

  if (formattedData.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No IRF data available to display.
      </Typography>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={formattedData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
          label={{ value: 'Periods', position: 'insideBottom', offset: -5 }} 
        />
        <YAxis 
          label={{ value: 'Response', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value) => {
            if (value === null || value === undefined) return ['N/A', 'Response'];
            return [typeof value === 'number' ? value.toFixed(4) : value, 'Response'];
          }}
          labelFormatter={(label) => `Period ${label}`}
        />
        <Legend />
        {confidenceIntervals && (
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill={theme.palette.primary.light}
            fillOpacity={0.1}
          />
        )}
        {confidenceIntervals && (
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill={theme.palette.primary.light}
            fillOpacity={0.1}
          />
        )}
        <Line
          type="monotone"
          dataKey="response"
          stroke={theme.palette.primary.main}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

IRFChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  confidenceIntervals: PropTypes.shape({
    upper: PropTypes.arrayOf(PropTypes.number),
    lower: PropTypes.arrayOf(PropTypes.number)
  })
};

export default React.memo(IRFChart);
